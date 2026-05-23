import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Usar service role para buscar TODOS os chamados
    const todosChamados = await base44.asServiceRole.entities.Chamado.list('-created_date', 100);

    // Admin global vê tudo
    if (user.email === "christianmoura2014@gmail.com") {
      return Response.json({ chamados: todosChamados });
    }

    // Usuários normais: filtrar por empresa_id
    const chamadosFiltrados = todosChamados.filter(c => c.empresa_id === user.empresa_id);

    return Response.json({ chamados: chamadosFiltrados });
  } catch (error) {
    console.error("[getChamados] Erro:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});