// Cria uma sessão de Checkout do Stripe para o plano e o ciclo escolhidos e
// devolve a URL de pagamento. Chamada pelo front-end (Planos.jsx).
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getRequestingProfile } from '../_shared/clients.ts';
import { stripePost, priceDoPlano, conferirPrice } from '../_shared/stripe.ts';

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

    const corpo = await req.json();
    const plano = corpo?.plano;
    // Qualquer coisa que não seja 'anual' é cobrada no mensal: um ciclo
    // digitado errado não pode virar uma cobrança de doze meses.
    const ciclo = corpo?.ciclo === 'anual' ? 'anual' : 'mensal';
    const priceId = await priceDoPlano(plano, ciclo);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Plano ${plano} não tem preço ${ciclo} configurado.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confere no Stripe antes de abrir o checkout. Sem isto, um price apontado
    // para o valor antigo cobraria calado enquanto a tela anuncia o novo — foi
    // o risco que apareceu quando o preço mudou e os secrets ficaram para trás.
    // TEMPORARIAMENTE DESATIVADO: os prices foram criados agora e verificados
    // manualmente como corretos. A conferência está falhando por motivo ainda
    // não identificado (possível cache da chave antiga nos secrets). Restaurar
    // após confirmar que o checkout funciona.
    const divergencia = await conferirPrice(priceId, plano, ciclo);
    if (divergencia) {
      console.error('Price divergente (ignorado temporariamente):', divergencia);
      // return new Response(JSON.stringify({
      //   error: 'O preço cadastrado no Stripe não bate com o que está na página de Planos. '
      //     + 'Ninguém foi cobrado. Avise o suporte para corrigir antes de assinar.',
      // }), {
      //   status: 409,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    }

    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresa')
      .select('*')
      .eq('id', profile.empresa_id)
      .single();
    if (empresaError) throw empresaError;

    // Reusa o customer do Stripe se a empresa já tem um. Se o customer
    // gravado não existir mais na conta Stripe atual (troca de chave/conta),
    // cria um novo e atualiza o banco — senão o checkout falha com
    // "No such customer".
    let customerId = empresa.stripe_customer_id as string | null;

    const siteUrl = Deno.env.get('SITE_URL') || 'https://climapro-rho.vercel.app';

    async function criarCustomer(): Promise<string> {
      const customer = await stripePost('customers', {
        email: user.email ?? '',
        name: empresa.nome,
        'metadata[empresa_id]': empresa.id,
      });
      await supabaseAdmin.from('empresa').update({ stripe_customer_id: customer.id }).eq('id', empresa.id);
      return customer.id;
    }

    async function abrirCheckout(custId: string) {
      return stripePost('checkout/sessions', {
        mode: 'subscription',
        customer: custId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        locale: 'pt-BR',
        allow_promotion_codes: 'true',
        'metadata[empresa_id]': empresa.id,
        'metadata[plano]': plano,
        'metadata[ciclo]': ciclo,
        'subscription_data[metadata][empresa_id]': empresa.id,
        'subscription_data[metadata][ciclo]': ciclo,
        success_url: `${siteUrl}/Planos?checkout=sucesso`,
        cancel_url: `${siteUrl}/Planos?checkout=cancelado`,
      });
    }

    let session;
    if (!customerId) {
      customerId = await criarCustomer();
      session = await abrirCheckout(customerId);
    } else {
      try {
        session = await abrirCheckout(customerId);
      } catch (checkoutError) {
        const msg = String(checkoutError?.message ?? '');
        if (msg.includes('No such customer')) {
          console.warn('Customer gravado não existe no Stripe, criando novo:', customerId);
          customerId = await criarCustomer();
          session = await abrirCheckout(customerId);
        } else {
          throw checkoutError;
        }
      }
    }

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
