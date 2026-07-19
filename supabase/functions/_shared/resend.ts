const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'ClimaPro <onboarding@resend.dev>';

export async function sendEmailViaResend({ to, subject, body }: { to: string; subject: string; body: string }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada nos secrets da function.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html: body }),
  });

  if (!response.ok) {
    throw new Error(`Resend respondeu ${response.status}: ${await response.text()}`);
  }

  return response.json();
}
