import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Buscar todos os chamados finalizados com lembrete pendente
        // O filtro do SDK faz match exato, então buscamos por lembrete_manutencao_enviado=false
        // e filtramos por data <= hoje no código
        const chamados = await base44.asServiceRole.entities.Chamado.filter({
            lembrete_manutencao_enviado: false
        });

        // Filtrar em código: data_lembrete_proxima_manutencao <= hoje e deve ter data definida
        const chamadosPendentes = chamados.filter(c =>
            c.data_lembrete_proxima_manutencao &&
            c.data_lembrete_proxima_manutencao <= today
        );

        // Buscar todas as empresas de uma vez (para pegar usuario_principal_email)
        const empresas = await base44.asServiceRole.entities.Empresa.list();
        const empresasMap = new Map();
        for (const emp of empresas) {
            empresasMap.set(emp.id, emp);
        }

        const resultados = [];

        for (const chamado of chamadosPendentes) {
            try {
                // Buscar dados do cliente
                let clienteNome = 'Cliente';
                let clienteEmail = null;
                if (chamado.cliente_id) {
                    const clientes = await base44.asServiceRole.entities.Cliente.filter({ id: chamado.cliente_id });
                    if (clientes.length > 0) {
                        clienteNome = clientes[0].nome || 'Cliente';
                        clienteEmail = clientes[0].email;
                    }
                }

                // Buscar email da empresa (usuario_principal_email)
                const empresa = empresasMap.get(chamado.empresa_id);
                const empresaEmail = empresa?.usuario_principal_email || null;
                const empresaNome = empresa?.nome || 'ClimaPro';

                const dataLembrete = chamado.data_lembrete_proxima_manutencao;
                const dataFormatada = new Date(dataLembrete + 'T00:00:00').toLocaleDateString('pt-BR');
                const horaLembrete = chamado.hora_lembrete_proxima_manutencao || null;
                const dataHoraTexto = horaLembrete ? `${dataFormatada} às ${horaLembrete}` : dataFormatada;
                const numeroChamado = chamado.numero_chamado || chamado.id.slice(-6).toUpperCase();

                const assunto = `🔔 Lembrete de Manutenção Preventiva - Chamado #${numeroChamado} - ClimaPro`;
                const corpoEmail = `Olá${clienteNome !== 'Cliente' ? ' ' + clienteNome : ''},

Este é um lembrete automático do ${empresaNome} via ClimaPro! 🗓️

A manutenção preventiva do serviço abaixo está vencendo:

📋 Chamado: ${chamado.titulo}
🔢 Número: #${numeroChamado}
📅 Data programada para a manutenção: ${dataHoraTexto}
📍 Local: ${chamado.local || 'Não especificado'}

Entre em contato para agendar a manutenção e garantir o bom funcionamento dos seus equipamentos!

Atenciosamente,
${empresaNome} ❄️`;

                // 1. Enviar email para o cliente
                if (clienteEmail) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: clienteEmail,
                        subject: assunto,
                        body: corpoEmail
                    });
                }

                // 2. Enviar email para a empresa (usuario_principal_email)
                if (empresaEmail) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: empresaEmail,
                        subject: `🔔 [INTERNO] Lembrete de Manutenção - Cliente: ${clienteNome} - Chamado #${numeroChamado}`,
                        body: `Olá,

Este é um lembrete interno do ClimaPro! 🗓️

A manutenção preventiva do serviço abaixo está vencendo e o cliente já foi notificado${clienteEmail ? '' : ' (cliente não possui email cadastrado)'}:

📋 Chamado: ${chamado.titulo}
🔢 Número: #${numeroChamado}
👤 Cliente: ${clienteNome}
📅 Data programada: ${dataHoraTexto}
📍 Local: ${chamado.local || 'Não especificado'}

Entre em contato com o cliente para agendar a manutenção!

Atenciosamente,
ClimaPro ❄️`
                    });
                }

                // Marcar como enviado
                await base44.asServiceRole.entities.Chamado.update(chamado.id, {
                    lembrete_manutencao_enviado: true
                });

                resultados.push({
                    chamado_id: chamado.id,
                    numero_chamado: numeroChamado,
                    cliente: clienteNome,
                    email_cliente: clienteEmail || null,
                    email_empresa: empresaEmail || null,
                    status: 'sucesso'
                });
            } catch (err) {
                resultados.push({
                    chamado_id: chamado.id,
                    erro: err.message,
                    status: 'erro'
                });
            }
        }

        return Response.json({
            data_referencia: today,
            total_chamados_pendentes: chamadosPendentes.length,
            resultados
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});