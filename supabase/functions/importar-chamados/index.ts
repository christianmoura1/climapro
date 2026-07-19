// Porta de base44/functions/importarChamados. Diferença deliberada em relação ao original:
// o Base44 só exigia "usuário autenticado" (sem checar a empresa do payload) — aqui exigimos
// que cada chamado pertença à empresa do usuário chamador, a menos que seja admin_global.
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getRequestingProfile } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, profile } = await getRequestingProfile(req);
    if (!user || !profile) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { chamados } = await req.json();
    if (!Array.isArray(chamados) || chamados.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum chamado informado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdminGlobal = profile.tipo_usuario === 'admin_global';
    const chamadosInvalidos = chamados.some((c) => !isAdminGlobal && c.empresa_id !== profile.empresa_id);
    if (chamadosInvalidos) {
      return new Response(JSON.stringify({ error: 'Todos os chamados devem pertencer à sua empresa' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parseArray = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v ?? []);

    const chamadosProcessados = chamados.map((c) => ({
      empresa_id: c.empresa_id,
      cliente_id: c.cliente_id,
      tecnico_id: c.tecnico_id || null,
      equipamento_id: c.equipamento_id || null,
      equipamentos_ids: parseArray(c.equipamentos_ids),
      numero_chamado: c.numero_chamado,
      titulo: c.titulo || '',
      descricao: c.descricao || '',
      local: c.local || '',
      tipo_problema: c.tipo_problema || 'outro',
      prioridade: c.prioridade || 'media',
      status: c.status || 'pendente',
      data_abertura: c.data_abertura ? new Date(c.data_abertura).toISOString() : new Date().toISOString(),
      data_agendamento: c.data_agendamento ? new Date(c.data_agendamento).toISOString() : null,
      data_finalizacao: c.data_finalizacao ? new Date(c.data_finalizacao).toISOString() : null,
      fotos_anexos: parseArray(c.fotos_anexos),
      fotos_finalizacao: parseArray(c.fotos_finalizacao),
      videos_finalizacao: parseArray(c.videos_finalizacao),
      observacoes_tecnico: c.observacoes_tecnico || '',
      observacoes_empresa: c.observacoes_empresa || '',
      nome_cliente_confirmacao: c.nome_cliente_confirmacao || '',
      assinatura_cliente: c.assinatura_cliente || '',
      motivo_reabertura: c.motivo_reabertura || '',
      valor_servico: c.valor_servico ? parseFloat(c.valor_servico) : null,
    }));

    const { data, error } = await supabaseAdmin.from('chamado').insert(chamadosProcessados).select('id');
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, imported: data.length, message: `${data.length} chamados importados com sucesso` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao importar chamados:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
