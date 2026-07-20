// Cria uma sessão de Checkout do Stripe (assinatura mensal) para o plano
// escolhido e devolve a URL de pagamento. Chamada pelo front-end (Planos.jsx).
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getRequestingProfile } from '../_shared/clients.ts';
import { stripePost, PRECOS_POR_PLANO } from '../_shared/stripe.ts';

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
      return new Response(JSON.stringify({ error: 'Apenas o administrador da empresa pode assinar um plano.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plano } = await req.json();
    const priceId = PRECOS_POR_PLANO[plano];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Plano inválido ou sem preço configurado: ${plano}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresa')
      .select('*')
      .eq('id', profile.empresa_id)
      .single();
    if (empresaError) throw empresaError;

    // Reusa o customer do Stripe se a empresa já tem um
    let customerId = empresa.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripePost('customers', {
        email: user.email ?? '',
        name: empresa.nome,
        'metadata[empresa_id]': empresa.id,
      });
      customerId = customer.id;
      await supabaseAdmin.from('empresa').update({ stripe_customer_id: customerId }).eq('id', empresa.id);
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://climapro-rho.vercel.app';
    const session = await stripePost('checkout/sessions', {
      mode: 'subscription',
      customer: customerId!,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      locale: 'pt-BR',
      allow_promotion_codes: 'true',
      'metadata[empresa_id]': empresa.id,
      'metadata[plano]': plano,
      'subscription_data[metadata][empresa_id]': empresa.id,
      success_url: `${siteUrl}/Planos?checkout=sucesso`,
      cancel_url: `${siteUrl}/Planos?checkout=cancelado`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
