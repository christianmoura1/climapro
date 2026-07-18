// Porta de base44/functions/unificarClientes. Correção em relação ao original: também
// reatribui manutencao_pmoc e agenda_evento (o Base44 só migrava chamado/equipamento/pmoc,
// deixando esses dois órfãos apontando pro cliente_id antigo).
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getRequestingProfile } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, profile } = await getRequestingProfile(req);
    if (!user || !['admin_global', 'admin_empresa'].includes(profile?.tipo_usuario)) {
      return new Response(JSON.stringify({ error: 'Apenas admin pode executar esta operação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { cliente_principal_id, ids_para_unificar, nome_unificado } = await req.json();
    if (!cliente_principal_id || !ids_para_unificar?.length) {
      return new Response(JSON.stringify({ error: 'cliente_principal_id e ids_para_unificar são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: principal, error: principalError } = await supabaseAdmin
      .from('cliente')
      .select('*')
      .eq('id', cliente_principal_id)
      .maybeSingle();
    if (principalError) throw principalError;
    if (!principal) {
      return new Response(JSON.stringify({ error: 'Cliente principal não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (profile.tipo_usuario !== 'admin_global' && principal.empresa_id !== profile.empresa_id) {
      return new Response(JSON.stringify({ error: 'Cliente principal não pertence à sua empresa' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contadores = { chamado: 0, equipamento: 0, pmoc: 0, manutencao_pmoc: 0, agenda_evento: 0 };
    const erros = [];
    const unificados = [];
    const novosEstabelecimentos = [];

    for (const id of ids_para_unificar) {
      if (id === cliente_principal_id) continue;
      try {
        const { data: cliente, error: clienteError } = await supabaseAdmin
          .from('cliente')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (clienteError) throw clienteError;
        if (!cliente) continue;

        novosEstabelecimentos.push({
          cliente_id: cliente_principal_id,
          nome: cliente.nome || 'Estabelecimento',
          endereco: cliente.endereco || '',
          tipo: cliente.tipo_estabelecimento || 'comercial',
          latitude: cliente.latitude,
          longitude: cliente.longitude,
          observacoes: cliente.observacoes || '',
        });

        const { data: estabelecimentosExistentes } = await supabaseAdmin
          .from('cliente_estabelecimento')
          .select('*')
          .eq('cliente_id', id);
        for (const est of estabelecimentosExistentes ?? []) {
          novosEstabelecimentos.push({
            cliente_id: cliente_principal_id,
            nome: est.nome,
            endereco: est.endereco,
            latitude: est.latitude,
            longitude: est.longitude,
            tipo: est.tipo,
            observacoes: est.observacoes,
          });
        }

        for (const [tabela, chave] of [
          ['chamado', 'chamado'],
          ['equipamento', 'equipamento'],
          ['pmoc', 'pmoc'],
          ['manutencao_pmoc', 'manutencao_pmoc'],
          ['agenda_evento', 'agenda_evento'],
        ] as const) {
          const { data: registros, error: selError } = await supabaseAdmin.from(tabela).select('id').eq('cliente_id', id);
          if (selError) throw selError;
          for (const registro of registros ?? []) {
            const { error: updError } = await supabaseAdmin
              .from(tabela)
              .update({ cliente_id: cliente_principal_id })
              .eq('id', registro.id);
            if (updError) throw updError;
            contadores[chave]++;
          }
        }

        await supabaseAdmin.from('cliente').delete().eq('id', id);
        unificados.push({ id, nome: cliente.nome });
      } catch (err) {
        erros.push({ id, erro: err.message });
      }
    }

    if (novosEstabelecimentos.length > 0) {
      const { error: insertEstError } = await supabaseAdmin.from('cliente_estabelecimento').insert(novosEstabelecimentos);
      if (insertEstError) throw insertEstError;
    }

    const { error: updatePrincipalError } = await supabaseAdmin
      .from('cliente')
      .update({
        nome: nome_unificado || principal.nome,
        endereco: novosEstabelecimentos[0]?.endereco || principal.endereco,
      })
      .eq('id', cliente_principal_id);
    if (updatePrincipalError) throw updatePrincipalError;

    return new Response(
      JSON.stringify({
        sucesso: true,
        nome_final: nome_unificado || principal.nome,
        total_estabelecimentos_migrados: novosEstabelecimentos.length,
        total_chamados_migrados: contadores.chamado,
        total_equipamentos_migrados: contadores.equipamento,
        total_pmocs_migrados: contadores.pmoc,
        total_manutencoes_pmoc_migradas: contadores.manutencao_pmoc,
        total_agenda_eventos_migrados: contadores.agenda_evento,
        unificados,
        erros,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro em unificar-clientes:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
