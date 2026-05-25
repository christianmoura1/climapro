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

    // Buscar todos os chamados com paginação para superar o limite de 100
    let chamados = [];
    let skip = 0;
    const pageSize = 100;

    while (true) {
      let page = [];
      try {
        page = await base44.asServiceRole.entities.Chamado.filter(
          { empresa_id: empresaId },
          '-created_date',
          pageSize,
          skip
        );
      } catch {
        // Fallback sem paginação
        page = await base44.entities.Chamado.filter(
          { empresa_id: empresaId },
          '-created_date',
          pageSize,
          skip
        );
      }

      if (!page || page.length === 0) break;
      chamados = chamados.concat(page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    return Response.json({ chamados });
  } catch (error) {
    return Response.json({ error: error.message, chamados: [] }, { status: 500 });
  }
});