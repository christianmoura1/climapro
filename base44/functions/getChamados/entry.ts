import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let user = null;
    try {
      user = await base44.auth.me();
      console.log("[getChamados] User autenticado:", user?.email, "| empresa_id:", user?.empresa_id);
    } catch (e) {
      console.log("[getChamados] Erro ao obter user:", e.message);
      return Response.json({ chamados: [] });
    }

    if (!user) {
      console.log("[getChamados] Usuário não autenticado");
      return Response.json({ chamados: [] });
    }

    // Tentar com asServiceRole primeiro
    console.log("[getChamados] Tentando listar com asServiceRole...");
    let todosChamados = [];
    try {
      todosChamados = await base44.asServiceRole.entities.Chamado.list('-created_date', 500);
      console.log("[getChamados] asServiceRole retornou:", todosChamados.length, "chamados");
    } catch (e1) {
      console.log("[getChamados] asServiceRole falhou:", e1.message, "- tentando com user...");
      // Fallback: tentar com user normal
      try {
        todosChamados = await base44.entities.Chamado.list('-created_date', 500);
        console.log("[getChamados] User list retornou:", todosChamados.length, "chamados");
      } catch (e2) {
        console.log("[getChamados] User list também falhou:", e2.message);
        return Response.json({ chamados: [] });
      }
    }

    if (todosChamados.length === 0) {
      console.log("[getChamados] Nenhum chamado encontrado");
      return Response.json({ chamados: [] });
    }

    console.log("[getChamados] Total encontrado:", todosChamados.length);

    // Admin global vê tudo
    if (user.email === "christianmoura2014@gmail.com") {
      console.log("[getChamados] Admin global - retornando todos");
      return Response.json({ chamados: todosChamados });
    }

    // Filtrar por empresa_id
    const chamadosFiltrados = todosChamados.filter(c => c.empresa_id === user.empresa_id);
    console.log("[getChamados] Após filtro empresa:", chamadosFiltrados.length);

    return Response.json({ chamados: chamadosFiltrados });
  } catch (error) {
    console.error("[getChamados] ERRO:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});