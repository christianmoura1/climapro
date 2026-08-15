// Drena a fila `whatsapp_mensagem` e entrega no uazapi.
//
// Quem chama: o gatilho do banco, na hora que a mensagem entra na fila (via
// pg_net), e o pg_cron de minuto em minuto como rede de segurança. As duas
// chamadas podem cair juntas — a reserva do lote usa `for update skip locked`,
// então cada mensagem sai uma vez só.
//
// Dependências inline porque a função é publicada arquivo a arquivo.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-climapro-secret',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Servidor e endpoint ficam em variável de ambiente para trocar de instância
// (ou de provedor) sem publicar função nova.
const UAZAPI_URL = (Deno.env.get('UAZAPI_URL') || 'https://csmoura.uazapi.com').replace(/\/+$/, '');
const UAZAPI_ROTA_TEXTO = Deno.env.get('UAZAPI_ROTA_TEXTO') || '/send/text';
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
const CRON_SECRET = Deno.env.get('WHATSAPP_CRON_SECRET');

const LOTE = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Mensagem = {
  id: string;
  destino: string;
  texto: string;
  tentativas: number;
};

type Resultado = {
  ok: boolean;
  erro?: string;
  resposta: unknown;
};

async function enviarTexto(destino: string, texto: string): Promise<Resultado> {
  if (!UAZAPI_TOKEN) {
    return { ok: false, erro: 'UAZAPI_TOKEN não configurada na Edge Function', resposta: null };
  }

  let http: Response;
  try {
    http = await fetch(`${UAZAPI_URL}${UAZAPI_ROTA_TEXTO}`, {
      method: 'POST',
      headers: { token: UAZAPI_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: destino, text: texto }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (erro) {
    // rede fora, DNS, timeout: volta para a fila e tenta de novo depois
    return { ok: false, erro: `Falha de rede ao falar com o uazapi: ${erro.message}`, resposta: null };
  }

  const corpo = await http.text();
  let resposta: unknown = corpo;
  try {
    resposta = JSON.parse(corpo);
  } catch {
    // uazapi devolveu algo que não é JSON; guarda o texto cru para diagnóstico
  }

  if (!http.ok) {
    return { ok: false, erro: `uazapi ${http.status}: ${corpo.slice(0, 500)}`, resposta };
  }

  // A instância responde status "Pending", que quer dizer "aceitei, vou
  // entregar" — não é erro. Qualquer 2xx conta como aceito; entrega de fato
  // é assunto do WhatsApp e não volta nesta resposta.
  return { ok: true, resposta };
}

function autorizado(req: Request): boolean {
  if (!CRON_SECRET) return true; // ainda não configurado: não trava o teste inicial
  if (req.headers.get('x-climapro-secret') === CRON_SECRET) return true;
  // chamada com a service role key também passa (útil para disparo manual)
  const auth = req.headers.get('Authorization') || '';
  return auth === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!autorizado(req)) return json({ error: 'não autorizado' }, 401);

  try {
    const { data: mensagens, error } = await supabaseAdmin.rpc('whatsapp_reservar_lote', {
      p_limite: LOTE,
    });
    if (error) throw new Error(`Não consegui reservar o lote: ${error.message}`);

    const fila = (mensagens ?? []) as Mensagem[];
    if (fila.length === 0) return json({ enviadas: 0, falhas: 0, detalhe: 'fila vazia' });

    let enviadas = 0;
    let falhas = 0;
    const erros: string[] = [];

    // Sequencial de propósito. O uazapi é uma instância só e disparar 20
    // mensagens em paralelo é o tipo de coisa que faz a Meta marcar o número.
    for (const mensagem of fila) {
      const resultado = await enviarTexto(mensagem.destino, mensagem.texto);

      const { error: erroConcluir } = await supabaseAdmin.rpc('whatsapp_concluir', {
        p_id: mensagem.id,
        p_ok: resultado.ok,
        p_erro: resultado.erro ?? null,
        p_resposta: resultado.resposta ?? null,
      });
      if (erroConcluir) {
        console.error(`[whatsapp] não consegui gravar o status de ${mensagem.id}:`, erroConcluir.message);
      }

      if (resultado.ok) {
        enviadas++;
      } else {
        falhas++;
        if (erros.length < 5) erros.push(resultado.erro!);
        console.error(`[whatsapp] ${mensagem.id} falhou:`, resultado.erro);
      }
    }

    return json({ enviadas, falhas, erros });
  } catch (erro) {
    console.error('[whatsapp] erro geral:', erro);
    return json({ error: erro.message }, 500);
  }
});
