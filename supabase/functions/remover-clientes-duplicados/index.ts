// Porta de base44/functions/removerClientesDuplicados, escopada à empresa do admin chamador.
// Diferença importante em relação ao original: aqui as tabelas filhas (chamado, equipamento,
// pmoc, agenda_evento, nota_fiscal, manutencao_pmoc) têm FK "on delete restrict" para cliente,
// então excluir um cliente com registros vinculados falha em vez de deixar órfãos — o erro
// aparece por item em `erros`. Rode unificar-clientes antes se quiser migrar os vínculos.
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

    let clienteQuery = supabaseAdmin.from('cliente').select('id, empresa_id, nome, created_at');
    let chamadoQuery = supabaseAdmin.from('chamado').select('cliente_id');
    if (profile.tipo_usuario !== 'admin_global') {
      clienteQuery = clienteQuery.eq('empresa_id', profile.empresa_id);
      chamadoQuery = chamadoQuery.eq('empresa_id', profile.empresa_id);
    }

    const [{ data: allClientes, error: clientesError }, { data: allChamados, error: chamadosError }] = await Promise.all([
      clienteQuery,
      chamadoQuery,
    ]);
    if (clientesError) throw clientesError;
    if (chamadosError) throw chamadosError;

    const chamadosPorCliente = new Map();
    for (const c of allChamados) {
      if (!c.cliente_id) continue;
      chamadosPorCliente.set(c.cliente_id, (chamadosPorCliente.get(c.cliente_id) || 0) + 1);
    }

    const grupos = new Map();
    for (const cliente of allClientes) {
      const key = `${cliente.empresa_id}||${(cliente.nome || '').trim().toLowerCase()}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(cliente);
    }

    const idsParaDeletar = [];
    const relatorio = [];

    for (const clientes of grupos.values()) {
      if (clientes.length < 2) continue;
      clientes.sort((a, b) => {
        const chamadosA = chamadosPorCliente.get(a.id) || 0;
        const chamadosB = chamadosPorCliente.get(b.id) || 0;
        if (chamadosB !== chamadosA) return chamadosB - chamadosA;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const [manter, ...deletar] = clientes;
      for (const c of deletar) {
        idsParaDeletar.push(c.id);
        relatorio.push({
          nome: c.nome,
          id_deletado: c.id,
          chamados_deletado: chamadosPorCliente.get(c.id) || 0,
          id_mantido: manter.id,
          chamados_mantido: chamadosPorCliente.get(manter.id) || 0,
        });
      }
    }

    let deletados = 0;
    const erros = [];
    for (const id of idsParaDeletar) {
      const { error: delError } = await supabaseAdmin.from('cliente').delete().eq('id', id);
      if (delError) erros.push({ id, erro: delError.message });
      else deletados++;
    }

    return new Response(
      JSON.stringify({
        total_clientes: allClientes.length,
        duplicatas_encontradas: idsParaDeletar.length,
        deletados,
        relatorio,
        erros,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro em remover-clientes-duplicados:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
