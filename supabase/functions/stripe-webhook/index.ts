// Webhook do Stripe: mantém o plano da empresa sincronizado com a assinatura.
// IMPORTANTE: no dashboard do Supabase, desative "Enforce JWT" para esta
// function — o Stripe chama sem token; a segurança vem da assinatura HMAC.
import { supabaseAdmin } from '../_shared/clients.ts';
import { stripeGet, planoDoPrice, LIMITES_POR_PLANO, verificarAssinaturaWebhook, limparSecret } from '../_shared/stripe.ts';

const WEBHOOK_SECRET = limparSecret(Deno.env.get('STRIPE_WEBHOOK_SECRET'));

async function empresaPorSubscription(subscriptionId: string, customerId?: string) {
  let { data } = await supabaseAdmin.from('empresa').select('*').eq('stripe_subscription_id', subscriptionId).maybeSingle();
  if (!data && customerId) {
    ({ data } = await supabaseAdmin.from('empresa').select('*').eq('stripe_customer_id', customerId).maybeSingle());
  }
  return data;
}

function dataVencimento(periodEndUnix: number | null | undefined): string | null {
  if (!periodEndUnix) return null;
  return new Date(periodEndUnix * 1000).toISOString().slice(0, 10);
}

async function aplicarPlano(empresaId: string, plano: string, extra: Record<string, unknown> = {}) {
  const limites = LIMITES_POR_PLANO[plano] ?? {};
  const { error } = await supabaseAdmin
    .from('empresa')
    .update({ plano, ...limites, ...extra })
    .eq('id', empresaId);
  if (error) throw error;
}

Deno.serve(async (req) => {
  const payload = await req.text();

  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado.');
    return new Response('config error', { status: 500 });
  }
  const assinaturaOk = await verificarAssinaturaWebhook(payload, req.headers.get('Stripe-Signature'), WEBHOOK_SECRET);
  if (!assinaturaOk) {
    return new Response('assinatura inválida', { status: 400 });
  }

  const event = JSON.parse(payload);

  // Idempotência: se já processamos este evento, responde 200 e sai.
  const { error: dupError } = await supabaseAdmin.from('pagamento_evento').insert({
    stripe_event_id: event.id,
    tipo: event.type,
    payload: { resumo: event.data?.object?.id ?? null },
  });
  if (dupError) {
    if (dupError.code === '23505') return new Response('duplicado, ok', { status: 200 });
    console.error('Erro ao registrar evento:', dupError);
  }

  try {
    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const empresaId = obj.metadata?.empresa_id;
        if (!empresaId || !obj.subscription) break;

        const sub = await stripeGet(`subscriptions/${obj.subscription}`);
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plano = planoDoPrice(priceId) ?? obj.metadata?.plano;
        if (!plano) break;

        await aplicarPlano(empresaId, plano, {
          status_pagamento: 'ativo',
          stripe_subscription_id: sub.id,
          stripe_customer_id: obj.customer,
          data_vencimento_plano: dataVencimento(sub.current_period_end),
        });
        await supabaseAdmin.from('pagamento_evento').update({ empresa_id: empresaId }).eq('stripe_event_id', event.id);
        break;
      }

      case 'invoice.paid': {
        const subId = obj.subscription;
        if (!subId) break;
        const empresa = await empresaPorSubscription(subId, obj.customer);
        if (!empresa) break;
        await supabaseAdmin
          .from('empresa')
          .update({
            status_pagamento: 'ativo',
            data_vencimento_plano: dataVencimento(obj.lines?.data?.[0]?.period?.end),
          })
          .eq('id', empresa.id);
        break;
      }

      case 'invoice.payment_failed': {
        const subId = obj.subscription;
        if (!subId) break;
        const empresa = await empresaPorSubscription(subId, obj.customer);
        if (!empresa) break;
        await supabaseAdmin.from('empresa').update({ status_pagamento: 'pendente' }).eq('id', empresa.id);
        break;
      }

      case 'customer.subscription.updated': {
        const empresa = await empresaPorSubscription(obj.id, obj.customer);
        if (!empresa) break;
        const priceId = obj.items?.data?.[0]?.price?.id;
        const plano = planoDoPrice(priceId);
        if (plano && plano !== empresa.plano) {
          await aplicarPlano(empresa.id, plano, {
            data_vencimento_plano: dataVencimento(obj.current_period_end),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const empresa = await empresaPorSubscription(obj.id, obj.customer);
        if (!empresa) break;
        // Assinatura encerrada → volta ao plano free (que não exige pagamento)
        await aplicarPlano(empresa.id, 'free', {
          status_pagamento: 'ativo',
          stripe_subscription_id: null,
          data_vencimento_plano: null,
        });
        break;
      }

      default:
        // Evento não tratado — ok, respondemos 200 para o Stripe não reenviar.
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error(`Erro ao processar ${event.type}:`, error);
    return new Response('erro interno', { status: 500 });
  }
});
