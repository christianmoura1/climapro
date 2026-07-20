// Webhook do Stripe: mantém o plano da empresa sincronizado com a assinatura.
// IMPORTANTE: no dashboard do Supabase, desative "Enforce JWT" para esta
// function — o Stripe chama sem token; a segurança vem da assinatura HMAC.

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

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

function supabaseForRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getRequestingProfile(req: Request) {
  const client = supabaseForRequest(req);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { user, profile };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helpers do Stripe via REST puro (sem SDK — leve e suficiente para Deno).

function limparSecret(valor: string | undefined): string {
  return (valor ?? '').replace(/[^\x20-\x7e]/g, '').trim();
}

const STRIPE_SECRET_KEY = limparSecret(Deno.env.get('STRIPE_SECRET_KEY'));

// Preços (IDs price_...) configurados nos secrets — um por plano pago.
const PRECOS_POR_PLANO: Record<string, string | undefined> = {
  essencial: limparSecret(Deno.env.get('STRIPE_PRICE_ESSENCIAL')),
  profissional: limparSecret(Deno.env.get('STRIPE_PRICE_PROFISSIONAL')),
  corporativo: limparSecret(Deno.env.get('STRIPE_PRICE_CORPORATIVO')),
};

function planoDoPrice(priceId: string): string | null {
  for (const [plano, id] of Object.entries(PRECOS_POR_PLANO)) {
    if (id && id === priceId) return plano;
  }
  return null;
}

// Limites aplicados na empresa quando o plano muda (mesmos números da
// página de Planos; 999999 = ilimitado na prática).
const LIMITES_POR_PLANO: Record<string, Record<string, number>> = {
  free: { limite_tecnicos: 1, limite_clientes: 1, limite_empresas: 1, limite_chamados_mes: 5 },
  essencial: { limite_tecnicos: 2, limite_clientes: 3, limite_empresas: 1, limite_chamados_mes: 999999 },
  profissional: { limite_tecnicos: 5, limite_clientes: 10, limite_empresas: 1, limite_chamados_mes: 999999 },
  corporativo: { limite_tecnicos: 15, limite_clientes: 30, limite_empresas: 3, limite_chamados_mes: 999999 },
};

// POST x-www-form-urlencoded na API do Stripe (formato que a API espera).
async function stripePost(path: string, params: Record<string, string>) {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY não configurada nos secrets.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe ${path} respondeu ${response.status}: ${json?.error?.message || JSON.stringify(json)}`);
  }
  return json;
}

async function stripeGet(path: string) {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY não configurada nos secrets.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Stripe ${path} respondeu ${response.status}: ${json?.error?.message || JSON.stringify(json)}`);
  }
  return json;
}

// Verifica a assinatura do webhook (header Stripe-Signature: t=...,v1=...)
// usando HMAC-SHA256 com o signing secret — garante que o evento veio do Stripe.
async function verificarAssinaturaWebhook(payload: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, ...v] = kv.split('=');
      return [k.trim(), v.join('=')];
    })
  );
  const timestamp = parts['t'];
  const expected = parts['v1'];
  if (!timestamp || !expected) return false;

  // Tolerância de 5 minutos contra replay
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Comparação em tempo constante
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
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
