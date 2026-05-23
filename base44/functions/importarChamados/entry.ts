import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const chamados = body.chamados;

    if (!Array.isArray(chamados) || chamados.length === 0) {
      return Response.json({ error: 'No chamados provided' }, { status: 400 });
    }

    // Processar e preparar dados
    const chamadosProcessados = chamados.map(c => ({
      empresa_id: c.empresa_id,
      cliente_id: c.cliente_id,
      tecnico_id: c.tecnico_id,
      equipamento_id: c.equipamento_id || undefined,
      equipamentos_ids: typeof c.equipamentos_ids === 'string' ? JSON.parse(c.equipamentos_ids) : c.equipamentos_ids || [],
      numero_chamado: c.numero_chamado,
      titulo: c.titulo || '',
      descricao: c.descricao || '',
      local: c.local || '',
      tipo_problema: c.tipo_problema || 'outro',
      prioridade: c.prioridade || 'media',
      status: c.status || 'pendente',
      data_abertura: typeof c.data_abertura === 'object' ? new Date(c.data_abertura).toISOString() : c.data_abertura,
      data_agendamento: typeof c.data_agendamento === 'object' ? new Date(c.data_agendamento).toISOString() : c.data_agendamento,
      data_finalizacao: c.data_finalizacao ? (typeof c.data_finalizacao === 'object' ? new Date(c.data_finalizacao).toISOString() : c.data_finalizacao) : undefined,
      fotos_anexos: typeof c.fotos_anexos === 'string' ? JSON.parse(c.fotos_anexos) : c.fotos_anexos || [],
      fotos_finalizacao: typeof c.fotos_finalizacao === 'string' ? JSON.parse(c.fotos_finalizacao) : c.fotos_finalizacao || [],
      videos_finalizacao: typeof c.videos_finalizacao === 'string' ? JSON.parse(c.videos_finalizacao) : c.videos_finalizacao || [],
      observacoes_tecnico: c.observacoes_tecnico || '',
      observacoes_empresa: c.observacoes_empresa || '',
      nome_cliente_confirmacao: c.nome_cliente_confirmacao || '',
      assinatura_cliente: c.assinatura_cliente || '',
      motivo_reabertura: c.motivo_reabertura || '',
      valor_servico: c.valor_servico ? parseFloat(c.valor_servico) : undefined
    }));

    // Bulk create
    const resultado = await base44.asServiceRole.entities.Chamado.bulkCreate(chamadosProcessados);

    return Response.json({
      success: true,
      imported: resultado.length,
      message: `${resultado.length} chamados importados com sucesso`
    });
  } catch (error) {
    console.error('Erro ao importar chamados:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});