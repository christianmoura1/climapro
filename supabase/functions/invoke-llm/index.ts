// Único ponto do app que usa um LLM hoje (geração do documento de PMOC em PMOCDetail.jsx).
// Baixa prioridade — implementação mínima usando a API da Anthropic.
import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, response_json_schema } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'IA não configurada (ANTHROPIC_API_KEY ausente)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const schemaInstruction = response_json_schema
      ? `\n\nResponda APENAS com um JSON válido seguindo exatamente este schema, sem markdown ao redor:\n${JSON.stringify(response_json_schema)}`
      : '';

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt + schemaInstruction }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      throw new Error(`Anthropic respondeu ${anthropicResponse.status}: ${errText}`);
    }

    const result = await anthropicResponse.json();
    const text = result.content?.[0]?.text ?? '';
    const parsed = response_json_schema ? JSON.parse(text) : text;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao chamar LLM:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
