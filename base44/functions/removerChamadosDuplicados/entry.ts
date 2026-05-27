import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Buscar todos os chamados
  let allChamados = [];
  let skip = 0;
  const limit = 200;

  while (true) {
    const batch = await base44.asServiceRole.entities.Chamado.list('-created_date', limit, skip);
    if (!batch || batch.length === 0) break;
    allChamados = allChamados.concat(batch);
    if (batch.length < limit) break;
    skip += limit;
  }

  // Agrupar por numero_chamado + cliente_id
  const groups = {};
  for (const chamado of allChamados) {
    const key = `${chamado.numero_chamado}__${chamado.cliente_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(chamado);
  }

  // Identificar duplicatas: manter o mais antigo (menor created_date), deletar o resto
  const toDelete = [];
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.length <= 1) continue;

    // Ordenar por created_date ascendente — manter o primeiro
    group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const [keep, ...duplicates] = group;
    for (const dup of duplicates) {
      toDelete.push(dup.id);
    }
  }

  // Deletar duplicatas
  let deleted = 0;
  const errors = [];
  for (const id of toDelete) {
    try {
      await base44.asServiceRole.entities.Chamado.delete(id);
      deleted++;
    } catch (e) {
      errors.push({ id, error: e.message });
    }
  }

  return Response.json({
    total_chamados: allChamados.length,
    grupos_unicos: Object.keys(groups).length,
    duplicatas_encontradas: toDelete.length,
    deletados: deleted,
    erros: errors
  });
});