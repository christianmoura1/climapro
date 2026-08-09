// Helpers do Stripe via REST puro (sem SDK — leve e suficiente para Deno).

// Secrets colados no dashboard podem vir com caracteres invisíveis (NBSP,
// zero-width) que tornam o header Authorization inválido — o fetch do Deno
// estoura com "is not a valid ByteString". Chaves reais são ASCII puro,
// então limpar é sempre seguro.
export function limparSecret(valor: string | undefined): string {
  return (valor ?? '').replace(/[^\x20-\x7e]/g, '').trim();
}

const STRIPE_SECRET_KEY = limparSecret(Deno.env.get('STRIPE_SECRET_KEY'));

// Preços (IDs price_...) configurados nos secrets — um por plano pago.
export const PRECOS_POR_PLANO: Record<string, string | undefined> = {
  profissional: limparSecret(Deno.env.get('STRIPE_PRICE_PROFISSIONAL')),
  empresa: limparSecret(Deno.env.get('STRIPE_PRICE_EMPRESA')),
  // Planos antigos: mantidos para o webhook reconhecer assinaturas que já
  // existem. Não aparecem mais na página de Planos.
  essencial: limparSecret(Deno.env.get('STRIPE_PRICE_ESSENCIAL')),
  corporativo: limparSecret(Deno.env.get('STRIPE_PRICE_CORPORATIVO')),
};

// Preço do técnico avulso, cobrado por quantidade acima do que o plano inclui.
export const PRECO_TECNICO_ADICIONAL = limparSecret(Deno.env.get('STRIPE_PRICE_TECNICO_ADICIONAL'));

export function planoDoPrice(priceId: string): string | null {
  for (const [plano, id] of Object.entries(PRECOS_POR_PLANO)) {
    if (id && id === priceId) return plano;
  }
  return null;
}

// Limites e módulos gravados na empresa quando o plano muda. Este arquivo é a
// autoridade sobre o que o cliente RECEBE; src/lib/planos.js descreve o que a
// página de Planos MOSTRA. Rodam em runtimes diferentes (Deno e navegador) e
// não dá para importar um do outro, então mexeu aqui, confira lá.
// 999999 = ilimitado na prática.
export const LIMITES_POR_PLANO: Record<string, Record<string, number>> = {
  free: { limite_tecnicos: 1, limite_clientes: 999999, limite_empresas: 1, limite_chamados_mes: 999999, limite_clientes_pmoc: 1 },
  profissional: { limite_tecnicos: 3, limite_clientes: 999999, limite_empresas: 1, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  empresa: { limite_tecnicos: 10, limite_clientes: 999999, limite_empresas: 3, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  enterprise: { limite_tecnicos: 999999, limite_clientes: 999999, limite_empresas: 999999, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  // Planos descontinuados, mapeados no equivalente atual.
  essencial: { limite_tecnicos: 3, limite_clientes: 999999, limite_empresas: 1, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  corporativo: { limite_tecnicos: 10, limite_clientes: 999999, limite_empresas: 3, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
};

const MODULOS_FREE = {
  chamados: true, clientes: true, equipamentos: true, tecnicos: true,
  pmoc: true, agenda: false, ponto_eletronico: false,
  orcamentos: false, estoque: false,
  financeiro: false, notas_fiscais: false, multiempresa: false,
  api: false, white_label: false,
};

const MODULOS_PROFISSIONAL = {
  ...MODULOS_FREE,
  agenda: true, orcamentos: true,
};

const MODULOS_EMPRESA = {
  ...MODULOS_PROFISSIONAL,
  ponto_eletronico: true, estoque: true,
  financeiro: true, notas_fiscais: true, multiempresa: true,
};

// 'qr_equipamento' é flag própria porque o botão de QR code mora dentro de
// Equipamentos, que todo plano tem — sem uma chave separada não haveria como
// fechar só a etiqueta no Free.
export const MODULOS_POR_PLANO: Record<string, Record<string, boolean>> = {
  free: { ...MODULOS_FREE, qr_equipamento: false },
  profissional: { ...MODULOS_PROFISSIONAL, qr_equipamento: true },
  empresa: { ...MODULOS_EMPRESA, qr_equipamento: true },
  enterprise: { ...MODULOS_EMPRESA, qr_equipamento: true, api: true, white_label: true },
  essencial: { ...MODULOS_PROFISSIONAL, qr_equipamento: true },
  corporativo: { ...MODULOS_EMPRESA, qr_equipamento: true },
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
