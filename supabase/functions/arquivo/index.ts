// Prepara envio e leitura no Cloudflare R2.
//
// O navegador não recebe a chave do R2. Ele manda o JWT do Supabase, a
// função confere o usuário e a empresa, e devolve uma URL assinada de
// curta duração para o PUT. O link que fica gravado no banco é o endereço
// público do bucket (R2_PUBLIC_BASE_URL), estável, do mesmo jeito que o
// getPublicUrl do Storage era. Sem esse endereço a função recusa o upload:
// URL assinada expira em no máximo 7 dias e quebraria o PDF que o hotel
// arquiva e o link já mandado no WhatsApp.
//
// Leitura assinada (action download) existe para referência r2:// e para
// conferir o tenant. Quem tem empresa só abre `<empresa_id>/`. Quem está
// autenticado e ainda não tem empresa só abre `usuarios/<user_id>/`.
// Admin global abre qualquer caminho seguro. Pedido sem usuário fica 401.
import { corsHeaders } from '../_shared/cors.ts';
import { getRequestingProfile } from '../_shared/clients.ts';
import {
  chaveDeReferenciaR2,
  escopoArquivo,
  montarChaveDoEscopo,
  podeLerChave,
  tipoConteudoPermitido,
  urlPublicaR2,
} from '../_shared/arquivos.js';
import { configR2, presignPut, urlPublicaOuAssinada } from '../_shared/r2.js';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function erroConfig(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.startsWith('Falta configurar')
    || message.startsWith('R2_PUBLIC_BASE_URL')
    || message.startsWith('R2_BUCKET')
  ) {
    return json({ error: message }, 503);
  }
  console.error('[arquivo]', error);
  return json({ error: 'Não consegui preparar o arquivo.' }, 500);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const { user, profile } = await getRequestingProfile(req);
    if (!user || !profile) return json({ error: 'Usuário não autenticado.' }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Pedido inválido.' }, 400);
    const action = (body as { action?: string }).action;

    if (action === 'upload') return await upload(user.id, profile, body as Record<string, unknown>);
    if (action === 'download') return await download(user.id, profile, body as Record<string, unknown>);
    return json({ error: 'Ação desconhecida.' }, 400);
  } catch (error) {
    console.error('[arquivo]', error);
    return json({ error: 'Não consegui preparar o arquivo.' }, 500);
  }
});

function escopoDe(
  userId: string,
  profile: { empresa_id?: string | null; tipo_usuario?: string | null },
) {
  return escopoArquivo({
    userId,
    empresaId: profile.empresa_id,
    tipoUsuario: profile.tipo_usuario,
  });
}

async function upload(
  userId: string,
  profile: { empresa_id?: string | null; tipo_usuario?: string | null },
  body: Record<string, unknown>,
) {
  // O cliente não escolhe a pasta. filename com barra vira só o nome, e
  // um key/path mandado no corpo é ignorado: a pasta sai do perfil.
  const escopo = escopoDe(userId, profile);
  if (!escopo.prefixoUpload) {
    return json({ error: 'Sua conta não pode enviar arquivo.' }, 403);
  }

  const tamanho = body.size;
  if (!Number.isSafeInteger(tamanho) || (tamanho as number) <= 0) {
    return json({ error: 'O arquivo está vazio ou o tamanho não foi informado.' }, 400);
  }

  let cfg;
  try {
    cfg = configR2({ exigirBasePublica: true });
  } catch (error) {
    return erroConfig(error);
  }

  if ((tamanho as number) > cfg.maxBytes) {
    const mb = Math.floor(cfg.maxBytes / (1024 * 1024));
    return json({ error: `Arquivo grande demais. O limite é ${mb} MB.` }, 400);
  }

  const contentType = tipoConteudoPermitido(typeof body.contentType === 'string' ? body.contentType : '');
  if (!contentType) return json({ error: 'Esse tipo de arquivo não pode ser enviado.' }, 400);

  const nome = typeof body.filename === 'string' ? body.filename.slice(0, 200) : 'arquivo';
  let chave = '';
  try {
    chave = montarChaveDoEscopo(escopo, nome, crypto.randomUUID());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Empresa inválida.';
    return json({ error: message }, 403);
  }

  try {
    const assinado = await presignPut(cfg, chave, contentType);
    return json({
      upload_url: assinado.url,
      upload_expires_in: cfg.putExpires,
      file_url: urlPublicaR2(cfg.publicBaseUrl, chave),
      key: chave,
      headers: assinado.headers,
    });
  } catch (error) {
    return erroConfig(error);
  }
}

async function download(
  userId: string,
  profile: { empresa_id?: string | null; tipo_usuario?: string | null },
  body: Record<string, unknown>,
) {
  let cfg;
  try {
    cfg = configR2();
  } catch (error) {
    return erroConfig(error);
  }

  const bruto = typeof body.key === 'string' && body.key
    ? (body.key.startsWith('r2://') ? body.key : `r2://${body.key}`)
    : (typeof body.url === 'string' ? body.url : '');
  const chave = chaveDeReferenciaR2(bruto, cfg.publicBaseUrl);
  if (!chave) return json({ error: 'Arquivo não informado.' }, 400);

  if (!podeLerChave(chave, escopoDe(userId, profile))) {
    return json({ error: 'Você não pode abrir este arquivo.' }, 403);
  }

  try {
    const fileUrl = await urlPublicaOuAssinada(chave);
    const expira = cfg.publicBaseUrl ? null : cfg.getExpires;
    return json({ file_url: fileUrl, expires_in: expira, key: chave });
  } catch (error) {
    return erroConfig(error);
  }
}
