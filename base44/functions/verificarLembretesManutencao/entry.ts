import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Buscar chamados finalizados com lembrete para hoje e ainda não enviados
        const chamados = await base44.asServiceRole.entities.Chamado.filter({
            status: 'finalizado',
            data_lembrete_proxima_manutencao: today,
            lembrete_manutencao_enviado: false
        });

        const resultados = [];

        for (const chamado of chamados) {
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

                // Enviar email para o cliente
                if (clienteEmail) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: clienteEmail,
                        subject: `🔧 Lembrete de Manutenção - ${chamado.titulo} - ClimaPro`,
                        body: `Olá ${clienteNome},

Este é um lembrete automático do ClimaPro! 🗓️

Seu último serviço de refrigeração foi concluído e está na hora de agendar a próxima manutenção preventiva.

📋 Último chamado: ${chamado.titulo}
📅 Data do último serviço: ${chamado.data_finalizacao ? new Date(chamado.data_finalizacao).toLocaleDateString('pt-BR') : 'N/A'}
📍 Local: ${chamado.local || 'Não especificado'}

Entre em contato conosco para agendar sua próxima manutenção e garantir o bom funcionamento dos seus equipamentos!

📞 Telefone/WhatsApp: (solicite ao seu técnico)

Atenciosamente,
Equipe ClimaPro ❄️`
                    });
                }

                // Marcar como enviado
                await base44.asServiceRole.entities.Chamado.update(chamado.id, {
                    lembrete_manutencao_enviado: true
                });

                resultados.push({
                    chamado_id: chamado.id,
                    cliente: clienteNome,
                    email_enviado: !!clienteEmail,
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
            total_lembretes: chamados.length,
            resultados
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});