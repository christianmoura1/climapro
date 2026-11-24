// Cliente mínimo do R2. A chave secreta só existe aqui, na Edge Function
// ou na máquina de quem roda a migração. O navegador recebe URL assinada
// de curta duração e nunca vê R2_SECRET_ACCESS_KEY.

import { TAMANHO_MAXIMO_PADRAO, chaveSegura, normalizarBasePublica, urlPublicaR2 } from './arquivos.js';
import { presignUrl, uriDoObjeto } from './sigv4.js';

function env(nome) {
  if (typeof Deno !== 'undefined' && Deno.env && typeof Deno.env.get === 'function') {
    const valor = Deno.env.get(nome);
    if (valor) return valor;
  }
  if (typeof process !== 'undefined' && process.env && process.env[nome]) return process.env[nome];
  return '';
}

function limitar(valor, padrao, maximo) {
  const n = Number(String(valor || '').trim());
  if (!Number.isFinite(n) || n <= 0) return padrao;
  return Math.min(Math.floor(n), maximo);
}

export function configR2({ exigirBasePublica = false } = {}) {
  const accountId = env('R2_ACCOUNT_ID').trim();
  const accessKeyId = env('R2_ACCESS_KEY_ID').trim();
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY').trim();
  const bucket = env('R2_BUCKET').trim();
  const faltando = [];
  if (!accountId) faltando.push('R2_ACCOUNT_ID');
  if (!accessKeyId) faltando.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) faltando.push('R2_SECRET_ACCESS_KEY');
  if (!bucket) faltando.push('R2_BUCKET');
  if (bucket.includes('/') || bucket.includes('..') || bucket.includes(' ')) {
    throw new Error('R2_BUCKET inválido.');
  }

  let publicBaseUrl = '';
  const bruta = env('R2_PUBLIC_BASE_URL').trim();
  if (bruta) publicBaseUrl = normalizarBasePublica(bruta);
  else if (exigirBasePublica) faltando.push('R2_PUBLIC_BASE_URL');

  if (faltando.length) throw new Error(`Falta configurar: ${faltando.join(', ')}.`);

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    maxBytes: limitar(env('R2_MAX_BYTES'), TAMANHO_MAXIMO_PADRAO, 1024 * 1024 * 1024),
    putExpires: limitar(env('R2_PUT_EXPIRES_SECONDS'), 600, 3600),
    getExpires: limitar(env('R2_GET_EXPIRES_SECONDS'), 3600, 604800),
  };
}

function hostDe(cfg) {
  return `${cfg.accountId}.r2.cloudflarestorage.com`;
}

async function assinar(cfg, method, chave, { contentType, expires }) {
  if (!chaveSegura(chave)) throw new Error('Caminho de arquivo inválido.');
  const host = hostDe(cfg);
  const signedHeaders = { host };
  if (contentType) signedHeaders['content-type'] = contentType;
  return presignUrl({
    method,
    host,
    canonicalUri: uriDoObjeto(cfg.bucket, chave),
    region: 'auto',
    service: 's3',
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    expires,
    signedHeaders,
  });
}

export async function presignPut(cfg, chave, contentType, expires = cfg.putExpires) {
  const assinado = await assinar(cfg, 'PUT', chave, { contentType, expires });
  return { url: assinado.url, headers: { 'Content-Type': contentType } };
}

export async function presignGet(cfg, chave, expires = cfg.getExpires) {
  const assinado = await assinar(cfg, 'GET', chave, { expires });
  return { url: assinado.url };
}

export async function presignHead(cfg, chave) {
  const assinado = await assinar(cfg, 'HEAD', chave, { expires: 60 });
  return { url: assinado.url };
}

// Domínio público quando existe (link estável para WhatsApp, e-mail, QR e
// <img>). Sem ele, devolve GET assinado de curta duração — útil para abrir
// na hora, ruim para gravar no banco.
export async function urlPublicaOuAssinada(chave, expires) {
  const cfg = configR2();
  if (!chaveSegura(chave)) throw new Error('Caminho de arquivo inválido.');
  if (cfg.publicBaseUrl) return urlPublicaR2(cfg.publicBaseUrl, chave);
  const assinado = await presignGet(cfg, chave, expires ?? cfg.getExpires);
  return assinado.url;
}
