// Helpers do Stripe via REST puro (sem SDK — leve e suficiente para Deno).
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

// Preços (IDs price_...) configurados nos secrets — um por plano pago.
export const PRECOS_POR_PLANO: Record<string, string | undefined> = {
  essencial: Deno.env.get('STRIPE_PRICE_ESSENCIAL'),
  profissional: Deno.env.get('STRIPE_PRICE_PROFISSIONAL'),
  corporativo: Deno.env.get('STRIPE_PRICE_CORPORATIVO'),
};

export function planoDoPrice(priceId: string): string | null {
  for (const [plano, id] of Object.entries(PRECOS_POR_PLANO)) {
    if (id && id === priceId) return plano;
  }
  return null;
}

// Limites aplicados na empresa quando o plano muda (mesmos números da
// página de Planos; 999999 = ilimitado na prática).
export const LIMITES_POR_PLANO: Record<string, Record<string, number>> = {
  free: { limite_tecnicos: 1, limite_clientes: 1, limite_empresas: 1, limite_chamados_mes: 5 },
  essencial: { limite_tecnicos: 2, limite_clientes: 3, limite_empresas: 1, limite_chamados_mes: 999999 },
  profissional: { limite_tecnicos: 5, limite_clientes: 10, limite_empresas: 1, limite_chamados_mes: 999999 },
  corporativo: { limite_tecnicos: 15, limite_clientes: 30, limite_empresas: 3, limite_chamados_mes: 999999 },
};

// POST x-www-form-urlencoded na API do Stripe (formato que a API espera).
export async function stripePost(path: string, params: Record<string, string>) {
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

export async function stripeGet(path: string) {
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
export async function verificarAssinaturaWebhook(payload: string, sigHeader: string | null, secret: string): Promise<boolean> {
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
