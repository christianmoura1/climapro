// Recebe o formulário público de quem tem muitos equipamentos (hotel,
// condomínio, rede) e grava um lead.
//
// Sem login, então a escrita passa por service_role aqui dentro e a tabela
// `lead` não tem policy de insert para anon.
//
// Avisa no WhatsApp na hora. Lead de contrato grande esfria rápido: se o
// gerente do hotel preencheu às 14h e alguém retorna no dia seguinte, já
// perdeu. O aviso é direto no uazapi, sem passar pela fila `whatsapp_mensagem`,
// porque aquela fila é de eventos de uma empresa e o lead não tem empresa.
//
// Dependências inline porque a função é publicada arquivo a arquivo.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const UAZAPI_URL = (Deno.env.get('UAZAPI_URL') || 'https://csmoura.uazapi.com').replace(/\/+$/, '');
const UAZAPI_ROTA_TEXTO = Deno.env.get('UAZAPI_ROTA_TEXTO') || '/send/text';
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
const LEAD_WHATSAPP_DESTINO = Deno.env.get('LEAD_WHATSAPP_DESTINO');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const texto = (valor: unknown, limite: number) => {
  const s = String(valor ?? '').trim();
  return s ? s.slice(0, limite) : null;
};

// Mesma regra do normalizar_whatsapp() no banco. O nono dígito fica.
function normalizarNumero(bruto: string | null): string | null {
  const d = String(bruto ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length >= 12 && d.startsWith('55')) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

async function avisarNoWhatsApp(lead: Record<string, unknown>) {
  if (!UAZAPI_TOKEN || !LEAD_WHATSAPP_DESTINO) return;

  const destino = normalizarNumero(LEAD_WHATSAPP_DESTINO);
  if (!destino) return;

  const linhas = [
    '🏨 *Lead novo no site*',
    '',
    `*${lead.nome}*`,
    lead.organizacao ? `Local: ${lead.organizacao}` : null,
    lead.cidade ? `Cidade: ${lead.cidade}` : null,
    lead.quantidade_equipamentos ? `Equipamentos: ${lead.quantidade_equipamentos}` : null,
    `Telefone: ${lead.telefone}`,
    lead.email ? `E-mail: ${lead.email}` : null,
    lead.mensagem ? `\n"${lead.mensagem}"` : null,
    lead.origem ? `\nVeio de: ${lead.origem}` : null,
  ].filter(Boolean);

  try {
    await fetch(`${UAZAPI_URL}${UAZAPI_ROTA_TEXTO}`, {
      method: 'POST',
      headers: { token: UAZAPI_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: destino, text: linhas.join('\n') }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (erro) {
    // O lead já está gravado. Falhar o aviso não pode falhar o formulário.
    console.error('[lead] não consegui avisar no WhatsApp:', erro.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const corpo = await req.json();

    // Campo isca: fica escondido no formulário, então gente não preenche. Robô
    // preenche tudo que encontra. Responde sucesso de propósito, para o robô
    // não ficar tentando de novo com outro formato.
    if (texto(corpo.website, 200)) return json({ ok: true });

    const nome = texto(corpo.nome, 200);
    const telefone = texto(corpo.telefone, 40);
    if (!nome) return json({ error: 'Informe seu nome.' }, 400);
    if (!telefone || telefone.replace(/\D/g, '').length < 10) {
      return json({ error: 'Informe um telefone com DDD.' }, 400);
    }

    const quantidade = Number.parseInt(String(corpo.quantidade_equipamentos ?? ''), 10);

    const lead = {
      nome,
      telefone,
      organizacao: texto(corpo.organizacao, 200),
      email: texto(corpo.email, 200),
      cidade: texto(corpo.cidade, 120),
      quantidade_equipamentos: Number.isInteger(quantidade) && quantidade > 0 && quantidade < 100000
        ? quantidade
        : null,
      mensagem: texto(corpo.mensagem, 2000),
      origem: texto(corpo.origem, 300),
      utm: typeof corpo.utm === 'object' && corpo.utm !== null ? corpo.utm : {},
    };

    const { data, error } = await supabaseAdmin.from('lead').insert(lead).select('id').single();
    if (error) throw new Error(error.message);

    await avisarNoWhatsApp(lead);

    return json({ ok: true, id: data.id });
  } catch (erro) {
    console.error('[lead] erro ao gravar:', erro);
    return json({ error: 'Não consegui registrar seu contato agora.' }, 500);
  }
});
