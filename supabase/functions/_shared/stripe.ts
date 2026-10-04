// Helpers do Stripe via REST puro (sem SDK — leve e suficiente para Deno).
import { supabaseAdmin } from './clients.ts';

// Secrets colados no dashboard podem vir com caracteres invisíveis (NBSP,
// zero-width) que tornam o header Authorization inválido — o fetch do Deno
// estoura com "is not a valid ByteString". Chaves reais são ASCII puro,
// então limpar é sempre seguro.
export function limparSecret(valor: string | undefined): string {
  return (valor ?? '').replace(/[^\x20-\x7e]/g, '').trim();
}

const STRIPE_SECRET_KEY = limparSecret(Deno.env.get('STRIPE_SECRET_KEY'));

// Preços (IDs price_...) configurados nos secrets — um por plano pago e
// ciclo. O anual é um price separado no Stripe, com intervalo de 12 meses;
// o secret correspondente termina em _ANUAL.
//
// Secret de anual que ainda não existe fica vazio: o checkout recusa o ciclo
// e a pessoa vê um erro claro, em vez de ser cobrada no valor errado.
export const PRECOS_POR_PLANO: Record<string, { mensal?: string; anual?: string }> = {
  basic: {
    mensal: limparSecret(Deno.env.get('STRIPE_PRICE_BASIC')),
    anual: limparSecret(Deno.env.get('STRIPE_PRICE_BASIC_ANUAL')),
  },
  profissional: {
    mensal: limparSecret(Deno.env.get('STRIPE_PRICE_PROFISSIONAL')),
    anual: limparSecret(Deno.env.get('STRIPE_PRICE_PROFISSIONAL_ANUAL')),
  },
  empresa: {
    mensal: limparSecret(Deno.env.get('STRIPE_PRICE_EMPRESA')),
    anual: limparSecret(Deno.env.get('STRIPE_PRICE_EMPRESA_ANUAL')),
  },
  // Planos antigos: mantidos para o webhook reconhecer assinaturas que já
  // existem. Não aparecem mais na página de Planos.
  essencial: { mensal: limparSecret(Deno.env.get('STRIPE_PRICE_ESSENCIAL')) },
  corporativo: { mensal: limparSecret(Deno.env.get('STRIPE_PRICE_CORPORATIVO')) },
};

// Valor que cada price DEVE ter, em centavos, espelhando src/lib/planos.js.
// Serve de conferência: o price vive no Stripe e o preço de tabela vive aqui,
// e já aconteceu de os dois saírem de sincronia numa troca de preço. Com esta
// tabela o checkout recusa em vez de cobrar o valor errado em silêncio.
export const VALORES_POR_PLANO: Record<string, { mensal?: number; anual?: number }> = {
  basic: { mensal: 4790, anual: 47880 },
  profissional: { mensal: 9590, anual: 95880 },
  empresa: { mensal: 23690, anual: 236400 },
};

// Mapa de prices. A fonte preferida é a tabela `configuracao_integracao`, nas
// chaves stripe_price_<plano>_<ciclo>; os secrets ficam como reserva para os
// planos antigos, que ainda têm assinatura viva.
//
// Está no banco, e não em secret, porque trocar preço era editar seis secrets
// no painel e republicar duas functions. Agora é um update e pronto.
export async function carregarPrecos(): Promise<Record<string, { mensal?: string; anual?: string }>> {
  const mapa: Record<string, { mensal?: string; anual?: string }> = {};
  for (const [plano, precos] of Object.entries(PRECOS_POR_PLANO)) {
    mapa[plano] = { ...precos };
  }

  const { data, error } = await supabaseAdmin
    .from('configuracao_integracao')
    .select('chave, valor')
    .like('chave', 'stripe_price_%');
  if (error) {
    // Banco fora não pode derrubar o checkout: cai para os secrets.
    console.error('Não consegui ler os prices do banco, usando os secrets:', error.message);
    return mapa;
  }

  for (const linha of data ?? []) {
    const casou = /^stripe_price_(.+)_(mensal|anual)$/.exec(linha.chave);
    if (!casou) continue;
    const [, plano, ciclo] = casou;
    const id = limparSecret(linha.valor);
    if (!id) continue;
    mapa[plano] = { ...(mapa[plano] ?? {}), [ciclo]: id };
  }
  return mapa;
}

// Price do plano no ciclo pedido. Ciclo desconhecido cai no mensal.
export async function priceDoPlano(plano: string, ciclo?: string): Promise<string | undefined> {
  const precos = (await carregarPrecos())[plano];
  if (!precos) return undefined;
  return (ciclo === 'anual' ? precos.anual : precos.mensal) || undefined;
}

// Confere no Stripe que o price cobra o valor e a frequência que a página de
// Planos anunciou. Devolve null quando está tudo certo, ou o motivo.
export async function conferirPrice(priceId: string, plano: string, ciclo: string): Promise<string | null> {
  const esperado = VALORES_POR_PLANO[plano]?.[ciclo === 'anual' ? 'anual' : 'mensal'];
  // Plano sem valor de referência (os descontinuados) passa sem conferência.
  if (!esperado) return null;

  const price = await stripeGet(`prices/${priceId}`);
  const intervaloEsperado = ciclo === 'anual' ? 'year' : 'month';

  if (price.unit_amount !== esperado) {
    return `o price ${priceId} cobra ${price.unit_amount} centavos e o plano ${plano} ${ciclo} anuncia ${esperado}`;
  }
  if (price.recurring?.interval !== intervaloEsperado) {
    return `o price ${priceId} é cobrado por ${price.recurring?.interval} e o ciclo ${ciclo} precisa de ${intervaloEsperado}`;
  }
  if (price.recurring?.interval_count && price.recurring.interval_count !== 1) {
    return `o price ${priceId} cobra a cada ${price.recurring.interval_count} ${price.recurring.interval}`;
  }
  if (price.active === false) {
    return `o price ${priceId} está arquivado no Stripe`;
  }
  return null;
}

// Preço do técnico avulso, cobrado por quantidade acima do que o plano inclui.
export const PRECO_TECNICO_ADICIONAL = limparSecret(Deno.env.get('STRIPE_PRICE_TECNICO_ADICIONAL'));

// O webhook recebe só o price da assinatura, então mensal e anual do mesmo
// plano precisam cair no mesmo nome: o que a pessoa recebe é igual nos dois,
// o que muda é a frequência da cobrança.
export async function planoDoPrice(priceId: string): Promise<string | null> {
  for (const [plano, precos] of Object.entries(await carregarPrecos())) {
    if (precos.mensal && precos.mensal === priceId) return plano;
    if (precos.anual && precos.anual === priceId) return plano;
  }
  return null;
}

// Limites e módulos gravados na empresa quando o plano muda. Este arquivo é a
// autoridade sobre o que o cliente RECEBE; src/lib/planos.js descreve o que a
// página de Planos MOSTRA. Rodam em runtimes diferentes (Deno e navegador) e
// não dá para importar um do outro, então mexeu aqui, confira lá.
// 999999 = ilimitado na prática.
export const LIMITES_POR_PLANO: Record<string, Record<string, number>> = {
  // Teto do Free: serve para ver o fluxo rodando, não para tocar a empresa de
  // graça. PMOC fica zerado — é o que o Basic entrega além do volume.
  // Mexeu aqui, confira src/lib/planos.js.
  free: { limite_tecnicos: 1, limite_clientes: 10, limite_empresas: 1, limite_chamados_mes: 10, limite_clientes_pmoc: 0 },
  basic: { limite_tecnicos: 1, limite_clientes: 999999, limite_empresas: 1, limite_chamados_mes: 999999, limite_clientes_pmoc: 2 },
  profissional: { limite_tecnicos: 3, limite_clientes: 999999, limite_empresas: 1, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  empresa: { limite_tecnicos: 10, limite_clientes: 999999, limite_empresas: 3, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  enterprise: { limite_tecnicos: 999999, limite_clientes: 999999, limite_empresas: 999999, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  // Planos descontinuados, mapeados no equivalente atual.
  essencial: { limite_tecnicos: 3, limite_clientes: 999999, limite_empresas: 1, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
  corporativo: { limite_tecnicos: 10, limite_clientes: 999999, limite_empresas: 3, limite_chamados_mes: 999999, limite_clientes_pmoc: 999999 },
};

const MODULOS_FREE = {
  chamados: true, clientes: true, equipamentos: true, tecnicos: true,
  pmoc: false, agenda: false, ponto_eletronico: false,
  orcamentos: false, estoque: false,
  financeiro: false, notas_fiscais: false, multiempresa: false,
  api: false, white_label: false,
};

// PMOC é o que o Basic entrega além do volume ilimitado.
const MODULOS_BASIC = { ...MODULOS_FREE, pmoc: true };

const MODULOS_PROFISSIONAL = {
  ...MODULOS_BASIC,
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
  // Basic é o Free sem teto de volume, mais o PMOC de um cliente.
  basic: { ...MODULOS_BASIC, qr_equipamento: false },
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
