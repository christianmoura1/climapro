import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin pode executar esta operação' }, { status: 403 });
    }

    const body = await req.json();
    const { cliente_principal_id, ids_para_unificar, nome_unificado } = body;

    if (!cliente_principal_id || !ids_para_unificar || !ids_para_unificar.length) {
      return Response.json({ error: 'cliente_principal_id e ids_para_unificar são obrigatórios' }, { status: 400 });
    }

    // Buscar cliente principal
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    const principal = clientes.find(c => c.id === cliente_principal_id);
    
    if (!principal) {
      return Response.json({ error: 'Cliente principal não encontrado' }, { status: 404 });
    }

    const empresaId = principal.empresa_id;
    let estabelecimentos = principal.estabelecimentos || [];
    let totalChamados = 0;
    let totalEquipamentos = 0;
    let totalPMOCs = 0;
    const erros = [];
    const unificados = [];

    for (const id of ids_para_unificar) {
      try {
        const cliente = clientes.find(c => c.id === id);
        if (!cliente || id === cliente_principal_id) continue;

        const nomeEst = cliente.nome || 'Estabelecimento';
        const enderecoBase = cliente.endereco || '';

        // Adicionar como estabelecimento
        estabelecimentos.push({
          nome: nomeEst,
          endereco: enderecoBase,
          tipo: cliente.tipo_estabelecimento || 'comercial',
          latitude: cliente.latitude || null,
          longitude: cliente.longitude || null,
          observacoes: cliente.observacoes || ''
        });

        // Migrar estabelecimentos existentes do cliente secundário
        if (cliente.estabelecimentos && cliente.estabelecimentos.length > 0) {
          for (const est of cliente.estabelecimentos) {
            estabelecimentos.push(est);
          }
        }

        // Migrar chamados
        const chamados = await base44.asServiceRole.entities.Chamado.filter({ cliente_id: id });
        for (const chamado of chamados) {
          await base44.asServiceRole.entities.Chamado.update(chamado.id, {
            cliente_id: cliente_principal_id
          });
          totalChamados++;
        }

        // Migrar equipamentos
        const equipamentos = await base44.asServiceRole.entities.Equipamento.filter({ cliente_id: id });
        for (const equip of equipamentos) {
          await base44.asServiceRole.entities.Equipamento.update(equip.id, {
            cliente_id: cliente_principal_id
          });
          totalEquipamentos++;
        }

        // Migrar PMOCs
        const pmocs = await base44.asServiceRole.entities.PMOC.filter({ cliente_id: id });
        for (const pmoc of pmocs) {
          await base44.asServiceRole.entities.PMOC.update(pmoc.id, {
            cliente_id: cliente_principal_id
          });
          totalPMOCs++;
        }

        // Deletar cliente antigo
        await base44.asServiceRole.entities.Cliente.delete(id);

        unificados.push({ id, nome: nomeEst });
      } catch (err) {
        erros.push({ id, erro: err.message });
      }
    }

    // Atualizar cliente principal com os estabelecimentos e novo nome
    await base44.asServiceRole.entities.Cliente.update(cliente_principal_id, {
      nome: nome_unificado || principal.nome,
      estabelecimentos,
      endereco: estabelecimentos.length > 0 ? estabelecimentos[0].endereco : principal.endereco
    });

    return Response.json({
      sucesso: true,
      nome_final: nome_unificado || principal.nome,
      total_estabelecimentos: estabelecimentos.length,
      total_chamados_migrados: totalChamados,
      total_equipamentos_migrados: totalEquipamentos,
      total_pmocs_migrados: totalPMOCs,
      unificados,
      erros
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});