import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GELAX_EMPRESA_ID = '68f795f1fd5140cbca465aae';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let allClientes = [];
    let skip = 0;
    const limit = 100;

    while (true) {
        const batch = await base44.asServiceRole.entities.Cliente.list(null, limit, skip);
        if (!batch || batch.length === 0) break;
        allClientes = allClientes.concat(batch);
        if (batch.length < limit) break;
        skip += limit;
    }

    const toDelete = allClientes.filter(c => c.empresa_id !== GELAX_EMPRESA_ID);
    
    let deletedCount = 0;
    const errors = [];

    for (const cliente of toDelete) {
        try {
            await base44.asServiceRole.entities.Cliente.delete(cliente.id);
            deletedCount++;
        } catch (e) {
            errors.push({ id: cliente.id, nome: cliente.nome, error: e.message });
        }
    }

    return Response.json({
        total_encontrados: allClientes.length,
        total_gelax: allClientes.length - toDelete.length,
        total_deletados: deletedCount,
        erros: errors
    });
});