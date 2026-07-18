// Job agendado (Supabase Cron) — porta fiel de base44/functions/verificarLembretesManutencao.
// Não expõe auth.me(): é chamada pelo scheduler com a service role, não por usuários finais.
// Não deixe essa function pública sem o secret do cron — configure "Verify JWT" ou um cabeçalho
// próprio no agendamento (ver supabase/functions/verificar-lembretes-manutencao/README no deploy).
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/clients.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: chamadosPendentes, error: chamadosError } = await supabaseAdmin
      .from('chamado')
      .select('*')
      .eq('lembrete_manutencao_enviado', false)
      .not('data_lembrete_proxima_manutencao', 'is', null)
      .lte('data_lembrete_proxima_manutencao', today);
    if (chamadosError) throw chamadosError;

    const { data: empresas, error: empresasError } = await supabaseAdmin.from('empresa').select('*');
    if (empresasError) throw empresasError;
    const empresasMap = new Map(empresas.map((e) => [e.id, e]));

    const resultados = [];

    for (const chamado of chamadosPendentes ?? []) {
      try {
        let clienteNome = 'Cliente';
        let clienteEmail = null;
        if (chamado.cliente_id) {
          const { data: cliente } = await supabaseAdmin
            .from('cliente')
            .select('nome, email')
            .eq('id', chamado.cliente_id)
            .maybeSingle();
          if (cliente) {
            clienteNome = cliente.nome || 'Cliente';
            clienteEmail = cliente.email;
          }
        }

        const empresa = empresasMap.get(chamado.empresa_id);
        const empresaEmail = empresa?.usuario_principal_email || null;
        const empresaNome = empresa?.nome || 'ClimaPro';

        const dataLembrete = chamado.data_lembrete_proxima_manutencao;
        const dataFormatada = new Date(`${dataLembrete}T00:00:00`).toLocaleDateString('pt-BR');
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

        if (clienteEmail) {
          await sendEmailViaResend({ to: clienteEmail, subject: assunto, body: corpoEmail });
        }

        if (empresaEmail) {
          await sendEmailViaResend({
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
ClimaPro ❄️`,
          });
        }

        await supabaseAdmin.from('chamado').update({ lembrete_manutencao_enviado: true }).eq('id', chamado.id);

        resultados.push({
          chamado_id: chamado.id,
          numero_chamado: numeroChamado,
          cliente: clienteNome,
          email_cliente: clienteEmail || null,
          email_empresa: empresaEmail || null,
          status: 'sucesso',
        });
      } catch (err) {
        resultados.push({ chamado_id: chamado.id, erro: err.message, status: 'erro' });
      }
    }

    return new Response(
      JSON.stringify({
        data_referencia: today,
        total_chamados_pendentes: (chamadosPendentes ?? []).length,
        resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro em verificar-lembretes-manutencao:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
