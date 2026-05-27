import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar que é um cliente
    if (user.tipo_usuario !== 'cliente' && user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { titulo, descricao, local, equipamento_id, tipo_problema, prioridade, fotos_anexos, empresa_id, cliente_id } = body;

    if (!titulo || !descricao || !cliente_id || !empresa_id) {
      return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    // Criar chamado usando service role para contornar RLS
    const chamado = await base44.asServiceRole.entities.Chamado.create({
      titulo,
      descricao,
      local: local || '',
      equipamento_id: equipamento_id || null,
      tipo_problema: tipo_problema || 'manutencao_corretiva',
      prioridade: prioridade || 'media',
      fotos_anexos: fotos_anexos || [],
      empresa_id,
      cliente_id,
      numero_chamado: `CH${Date.now()}`,
      data_abertura: new Date().toISOString(),
      status: 'pendente'
    });

    return Response.json({ chamado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});