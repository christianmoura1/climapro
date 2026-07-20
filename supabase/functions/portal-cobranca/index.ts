// Abre o Portal de Cobrança do Stripe para o assinante gerenciar a própria
// assinatura (trocar cartão, ver faturas, cancelar). Devolve a URL do portal.
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getRequestingProfile } from '../_shared/clients.ts';
import { stripePost } from '../_shared/stripe.ts';

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
