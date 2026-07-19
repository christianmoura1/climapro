// Envia e-mail transacional via Resend. Chamada pelo adapter (base44.integrations.Core.SendEmail).
// A RESEND_API_KEY fica só nos secrets da function, nunca chega ao front-end.
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'to, subject e body são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendEmailViaResend({ to, subject, body });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
