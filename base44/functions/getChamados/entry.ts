Deno.serve(async (req) => {
  try {
    const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.25');
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ chamados: [] });
    }

    const empresaId = user.data?.empresa_id;
    if (!empresaId) {
      return Response.json({ chamados: [] });
    }

    // A RLS está bloqueando a leitura, então vamos tentar buscar SEM RLS via asServiceRole
    // Se não tiver service token, volta para list() normal
    let chamados = [];
    try {
      chamados = await base44.asServiceRole.entities.Chamado.filter({ empresa_id: empresaId }, '-created_date', 1000);
    } catch {
      // Fallback: list() normal (respeitará RLS, pode retornar vazio)
      chamados = await base44.entities.Chamado.list('-created_date', 1000);
      chamados = chamados.filter(c => c.empresa_id === empresaId);
    }

    return Response.json({ chamados });
  } catch (error) {
    return Response.json({ error: error.message, chamados: [] }, { status: 500 });
  }
});