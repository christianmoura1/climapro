// Job agendado (Supabase Cron) — lembretes automáticos do PMOC por equipamento.
// Varre os equipamentos ativos no PMOC cuja proxima_manutencao vence nos
// próximos 7 dias (ou já venceu) e envia UM resumo por empresa para o e-mail
// principal dela: quais clientes têm visita chegando e quais estão atrasados.
// Fecha o ciclo de automação: ninguém precisa abrir o painel para saber que
// uma rodada mensal está vencendo.
//
// Agendar no Supabase (Dashboard → Integrations → Cron, ou SQL):
//   select cron.schedule('lembretes-pmoc-diario', '0 9 * * *', $$
//     select net.http_post(
//       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/lembretes-pmoc',
//       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//     ) $$);
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/clients.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';

const DIAS_ANTECEDENCIA = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const hoje = new Date().toISOString().split('T')[0];
    const limite = new Date(Date.now() + DIAS_ANTECEDENCIA * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: equipamentos, error: equipamentosError } = await supabaseAdmin
      .from('equipamento')
      .select('id, empresa_id, cliente_id, numero_equipamento, marca, modelo, proxima_manutencao, ultima_manutencao')
      .eq('pmoc_ativo', true)
      .not('proxima_manutencao', 'is', null)
      .lte('proxima_manutencao', limite);
    if (equipamentosError) throw equipamentosError;

    if (!equipamentos || equipamentos.length === 0) {
      return new Response(JSON.stringify({ enviados: 0, motivo: 'nenhum equipamento vencendo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: empresas, error: empresasError }, { data: clientes, error: clientesError }] = await Promise.all([
      supabaseAdmin.from('empresa').select('id, nome, email_contato, usuario_principal_email'),
      supabaseAdmin.from('cliente').select('id, nome'),
    ]);
    if (empresasError) throw empresasError;
    if (clientesError) throw clientesError;

    const empresaPorId = new Map((empresas ?? []).map((e) => [e.id, e]));
    const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));

    // Agrupa por empresa: um e-mail por empresa, com atrasados e próximos.
    const porEmpresa = new Map<string, typeof equipamentos>();
    for (const eq of equipamentos) {
      const lista = porEmpresa.get(eq.empresa_id) ?? [];
      lista.push(eq);
      porEmpresa.set(eq.empresa_id, lista);
    }

    const formatar = (data: string) => new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
    const resultados = [];

    for (const [empresaId, lista] of porEmpresa) {
      const empresa = empresaPorId.get(empresaId);
      const destino = empresa?.email_contato || empresa?.usuario_principal_email;
      if (!destino) {
        resultados.push({ empresa: empresaId, enviado: false, motivo: 'empresa sem e-mail' });
        continue;
      }

      const atrasados = lista.filter((eq) => eq.proxima_manutencao < hoje);
      const proximos = lista.filter((eq) => eq.proxima_manutencao >= hoje);

      const linha = (eq: (typeof lista)[number]) => {
        const cliente = clientePorId.get(eq.cliente_id);
        return `• ${eq.numero_equipamento || eq.modelo} (${eq.marca} ${eq.modelo}) — ${cliente?.nome || 'Cliente'} — vence em ${formatar(eq.proxima_manutencao)}`;
      };

      const corpo = `Olá, ${empresa?.nome || ''}!

Resumo automático do PMOC — manutenções que precisam de atenção:
${atrasados.length > 0 ? `
🔴 ATRASADAS (${atrasados.length}):
${atrasados.map(linha).join('\n')}
` : ''}${proximos.length > 0 ? `
🟡 Vencem nos próximos ${DIAS_ANTECEDENCIA} dias (${proximos.length}):
${proximos.map(linha).join('\n')}
` : ''}
Acesse o painel para executar as rodadas e manter o Caderno de Manutenção em dia:
👉 https://geradordepmoc.com.br/PMOC

Atenciosamente,
ClimaPro — lembrete automático`;

      try {
        await sendEmailViaResend({
          to: destino,
          subject: `🔔 PMOC: ${atrasados.length} atrasada(s), ${proximos.length} vencendo — ClimaPro`,
          body: corpo,
        });
        resultados.push({ empresa: empresa?.nome, enviado: true, atrasados: atrasados.length, proximos: proximos.length });
      } catch (emailError) {
        resultados.push({ empresa: empresa?.nome, enviado: false, motivo: String(emailError) });
      }
    }

    return new Response(JSON.stringify({ enviados: resultados.filter((r) => r.enviado).length, resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[lembretes-pmoc] erro:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
