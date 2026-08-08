// Resposta do cliente ao orçamento (aprovar ou recusar) pelo link público.
// Sem login. Só aceita orçamento em status 'enviado' e dentro da validade, e
// só responde uma vez — depois disso o registro fica travado.
//
// Dependências inline pelo mesmo motivo de orcamento-publico.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'ClimaPro <onboarding@resend.dev>';

async function enviarEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurada.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, acao, nome_aprovador, assinatura_cliente, motivo_recusa } = await req.json();

    if (!token || !acao) return json({ error: 'token e acao são obrigatórios' }, 400);
    if (acao !== 'aprovar' && acao !== 'recusar') return json({ error: 'acao inválida' }, 400);
    if (!nome_aprovador?.trim()) return json({ error: 'Informe seu nome' }, 400);
    if (acao === 'aprovar' && !assinatura_cliente) return json({ error: 'Assinatura é obrigatória para aprovar' }, 400);

    const { data: orcamento, error } = await supabaseAdmin
      .from('orcamento')
      .select('id, empresa_id, cliente_id, numero_orcamento, titulo, valor_total, status, validade_ate')
      .eq('token_publico', token)
      .maybeSingle();
    if (error) throw error;
    if (!orcamento) return json({ error: 'Orçamento não encontrado' }, 404);

    if (orcamento.status !== 'enviado') {
      return json({ error: 'Este orçamento já foi respondido ou não está aberto para resposta.' }, 409);
    }

    const hoje = new Date().toISOString().split('T')[0];
    if (orcamento.validade_ate && orcamento.validade_ate < hoje) {
      await supabaseAdmin.from('orcamento').update({ status: 'expirado' }).eq('id', orcamento.id);
      return json({ error: 'Este orçamento venceu. Peça um novo à empresa.' }, 409);
    }

    const novoStatus = acao === 'aprovar' ? 'aprovado' : 'recusado';
    const { error: updateError } = await supabaseAdmin
      .from('orcamento')
      .update({
        status: novoStatus,
        data_resposta: new Date().toISOString(),
        nome_aprovador: nome_aprovador.trim(),
        assinatura_cliente: acao === 'aprovar' ? assinatura_cliente : null,
        motivo_recusa: acao === 'recusar' ? (motivo_recusa?.trim() || null) : null,
      })
      .eq('id', orcamento.id)
      // Corrida: se outra aba respondeu primeiro, o status já mudou e este
      // update não pega nenhuma linha.
      .eq('status', 'enviado');
    if (updateError) throw updateError;

    const { data: empresa } = await supabaseAdmin
      .from('empresa')
      .select('nome, email_contato, usuario_principal_email')
      .eq('id', orcamento.empresa_id)
      .maybeSingle();
    const destino = empresa?.email_contato || empresa?.usuario_principal_email;

    if (destino) {
      const valor = Number(orcamento.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      try {
        await enviarEmail(
          destino,
          `${acao === 'aprovar' ? '✅ Orçamento aprovado' : '❌ Orçamento recusado'} — ${orcamento.numero_orcamento}`,
          `Olá, ${empresa?.nome || ''}!<br><br>
O orçamento <strong>${orcamento.numero_orcamento} — ${orcamento.titulo}</strong> (${valor})
foi <strong>${acao === 'aprovar' ? 'APROVADO' : 'RECUSADO'}</strong> pelo cliente.<br><br>
Respondido por: ${nome_aprovador.trim()}<br>
${acao === 'recusar' && motivo_recusa ? `Motivo: ${motivo_recusa}<br>` : ''}
<br>
Abra o painel para dar sequência:<br>
👉 https://geradordepmoc.com.br/Orcamentos<br><br>
Atenciosamente,<br>ClimaPro`
        );
      } catch (emailError) {
        console.error('[orcamento-responder] falha ao enviar e-mail:', emailError);
      }
    }

    return json({ status: novoStatus });
  } catch (error) {
    console.error('[orcamento-responder] erro:', error);
    return json({ error: String(error) }, 500);
  }
});
