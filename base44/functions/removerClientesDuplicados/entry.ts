import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar todos os clientes e chamados
    let allClientes = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Cliente.list('-created_date', 200, skip);
      if (!batch || batch.length === 0) break;
      allClientes = allClientes.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    let allChamados = [];
    skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Chamado.list('-created_date', 200, skip);
      if (!batch || batch.length === 0) break;
      allChamados = allChamados.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    // Contar chamados por cliente_id
    const chamadosPorCliente = {};
    for (const chamado of allChamados) {
      const cid = chamado.cliente_id;
      if (cid) {
        chamadosPorCliente[cid] = (chamadosPorCliente[cid] || 0) + 1;
      }
    }

    // Agrupar clientes por empresa_id + nome (chave de duplicata)
    const grupos = {};
    for (const cliente of allClientes) {
      const key = `${cliente.empresa_id}||${(cliente.nome || '').trim().toLowerCase()}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(cliente);
    }

    // Para cada grupo com duplicatas, decidir qual deletar
    const idsParaDeletar = [];
    const relatorio = [];

    for (const [key, clientes] of Object.entries(grupos)) {
      if (clientes.length < 2) continue;

      // Ordenar por número de chamados (desc), depois por data de criação (asc = mais antigo primeiro)
      clientes.sort((a, b) => {
        const chamadosA = chamadosPorCliente[a.id] || 0;
        const chamadosB = chamadosPorCliente[b.id] || 0;
        if (chamadosB !== chamadosA) return chamadosB - chamadosA; // mais chamados primeiro
        return new Date(a.created_date) - new Date(b.created_date); // mais antigo primeiro
      });

      // Manter o primeiro (mais chamados / mais antigo), deletar o resto
      const manter = clientes[0];
      const deletar = clientes.slice(1);

      for (const c of deletar) {
        idsParaDeletar.push(c.id);
        relatorio.push({
          nome: c.nome,
          id_deletado: c.id,
          chamados_deletado: chamadosPorCliente[c.id] || 0,
          id_mantido: manter.id,
          chamados_mantido: chamadosPorCliente[manter.id] || 0,
        });
      }
    }

    // Deletar os duplicados um a um
    let deletados = 0;
    const erros = [];
    for (const id of idsParaDeletar) {
      try {
        await base44.asServiceRole.entities.Cliente.delete(id);
        deletados++;
      } catch (e) {
        erros.push({ id, erro: e.message });
      }
    }

    return Response.json({
      total_clientes: allClientes.length,
      duplicatas_encontradas: idsParaDeletar.length,
      deletados,
      relatorio,
      erros
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});