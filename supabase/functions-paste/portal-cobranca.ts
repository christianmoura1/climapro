// Abre o Portal de Cobrança do Stripe para o assinante gerenciar a própria
// assinatura (trocar cartão, ver faturas, cancelar). Devolve a URL do portal.

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, profile } = await getRequestingProfile(req);
    if (!user || !profile?.empresa_id) {
      return new Response(JSON.stringify({ error: 'Não autenticado ou sem empresa vinculada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['admin_empresa', 'admin_global'].includes(profile.tipo_usuario)) {
      return new Response(JSON.stringify({ error: 'Apenas o administrador da empresa pode gerenciar a assinatura.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: empresa, error } = await supabaseAdmin
      .from('empresa')
      .select('stripe_customer_id')
      .eq('id', profile.empresa_id)
      .single();
    if (error) throw error;
    if (!empresa.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Esta empresa ainda não tem assinatura.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://climapro-rho.vercel.app';
    const session = await stripePost('billing_portal/sessions', {
      customer: empresa.stripe_customer_id,
      return_url: `${siteUrl}/Planos`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao abrir portal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
