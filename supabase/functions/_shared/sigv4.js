// URL pré-assinada no padrão AWS Signature Version 4 (query string).
//
// Roda na Edge Function (Deno) e no script de migração (Node). Os dois têm
// crypto.subtle, então não há dependência para instalar e a chave do R2 não
// precisa de um SDK.
//
// O teste ao lado (sigv4.test.js) reproduz o exemplo oficial da AWS
// (GET /test.txt em 24/05/2013). Se a assinatura divergir, o R2 recusa o
// envio com 403 e o técnico vê falha de upload sem pista melhor que isso.

const encoder = new TextEncoder();

export function encodeRfc3986(valor) {
  return encodeURIComponent(String(valor)).replace(/[!'()*]/g, (caractere) =>
    `%${caractere.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

// Cada pedaço do caminho é codificado; a barra que separa pastas fica.
export function uriCanonica(caminho) {
  const limpo = String(caminho || '').replace(/^\/+|\/+$/g, '');
  if (!limpo) return '/';
  return `/${limpo.split('/').map((parte) => encodeRfc3986(parte)).join('/')}`;
}

export function uriDoObjeto(bucket, chave) {
  return `${uriCanonica(bucket).replace(/\/$/, '')}${uriCanonica(chave)}`;
}

function copiarBytes(bytes) {
  const copia = new Uint8Array(bytes.byteLength);
  copia.set(bytes);
  return copia;
}

function hex(bytes) {
  let saida = '';
  for (const byte of bytes) saida += byte.toString(16).padStart(2, '0');
  return saida;
}

async function hmacSha256(chave, dados) {
  const bruta = typeof chave === 'string' ? encoder.encode(chave) : copiarBytes(chave);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    bruta,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinatura = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dados));
  return new Uint8Array(assinatura);
}

async function sha256Hex(texto) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(texto));
  return hex(new Uint8Array(digest));
}

export function dataAmz(data) {
  return data.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function cabecalhosCanonicos(cabecalhos) {
  const entradas = Object.entries(cabecalhos)
    .map(([nome, valor]) => [String(nome).toLowerCase().trim(), String(valor).trim().replace(/\s+/g, ' ')])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return {
    bloco: entradas.map(([nome, valor]) => `${nome}:${valor}\n`).join(''),
    assinados: entradas.map(([nome]) => nome).join(';'),
  };
}

function queryCanonica(parametros) {
  return Object.entries(parametros)
    .map(([nome, valor]) => [encodeRfc3986(nome), encodeRfc3986(valor)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([nome, valor]) => `${nome}=${valor}`)
    .join('&');
}

// `query` entra na assinatura (listagem, por exemplo). O que volta em
// `headers` é o que o cliente precisa repetir no PUT: o host o navegador
// manda sozinho, então ele fica de fora. Content-Type, se foi assinado,
// tem que ir idêntico — senão o R2 responde 403.
export async function presignUrl({
  method,
  host,
  canonicalUri,
  query = {},
  region = 'auto',
  service = 's3',
  accessKeyId,
  secretAccessKey,
  expires = 900,
  now = new Date(),
  signedHeaders = { host },
}) {
  const amz = dataAmz(now);
  const dia = amz.slice(0, 8);
  const escopo = `${dia}/${region}/${service}/aws4_request`;
  const { bloco, assinados } = cabecalhosCanonicos(signedHeaders);

  const parametros = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${escopo}`,
    'X-Amz-Date': amz,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': assinados,
    ...query,
  };

  const canonicalQuery = queryCanonica(parametros);
  // O bloco de headers já termina com \n. O join acrescenta outro \n e
  // essa linha em branco faz parte do formato: sem ela a assinatura não bate.
  const canonicalRequest = [
    String(method || 'GET').toUpperCase(),
    canonicalUri,
    canonicalQuery,
    bloco,
    assinados,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amz,
    escopo,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dia);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const assinatura = hex(await hmacSha256(kSigning, stringToSign));

  // A assinatura cobre a query sem este parâmetro. Ele vai no fim, que é o
  // formato do exemplo da AWS; o R2 aceita a ordem que for.
  const finalQuery = `${canonicalQuery}&X-Amz-Signature=${assinatura}`;
  const headers = {};
  for (const [nome, valor] of Object.entries(signedHeaders)) {
    if (String(nome).toLowerCase() === 'host') continue;
    headers[String(nome).toLowerCase() === 'content-type' ? 'Content-Type' : nome] = String(valor).trim();
  }

  return {
    url: `https://${host}${canonicalUri}?${finalQuery}`,
    headers,
    canonicalRequest,
    signature: assinatura,
  };
}
