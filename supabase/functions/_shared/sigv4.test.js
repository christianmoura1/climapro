import assert from 'node:assert/strict';
import test from 'node:test';
import { presignUrl } from './sigv4.js';

// Exemplo oficial da AWS, "Authenticating Requests: Using Query Parameters".
// https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
const CANONICAL = [
  'GET',
  '/test.txt',
  'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host',
  'host:examplebucket.s3.amazonaws.com',
  '',
  'host',
  'UNSIGNED-PAYLOAD',
].join('\n');

test('assinatura do exemplo oficial da AWS', async () => {
  const assinado = await presignUrl({
    method: 'GET',
    host: 'examplebucket.s3.amazonaws.com',
    canonicalUri: '/test.txt',
    region: 'us-east-1',
    service: 's3',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    expires: 86400,
    now: new Date('2013-05-24T00:00:00.000Z'),
    signedHeaders: { host: 'examplebucket.s3.amazonaws.com' },
  });

  assert.equal(assinado.canonicalRequest, CANONICAL);
  assert.equal(assinado.signature, 'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  assert.equal(
    assinado.url,
    'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
  );
});

test('PUT assina o content-type e devolve o header que o navegador tem que repetir', async () => {
  const assinado = await presignUrl({
    method: 'PUT',
    host: 'conta.r2.cloudflarestorage.com',
    canonicalUri: '/climapro/empresa/foto.jpg',
    region: 'auto',
    accessKeyId: 'AKID',
    secretAccessKey: 'SEGREDO',
    expires: 600,
    now: new Date('2024-01-02T03:04:05.000Z'),
    signedHeaders: {
      host: 'conta.r2.cloudflarestorage.com',
      'content-type': 'image/jpeg',
    },
  });

  assert.match(assinado.url, /X-Amz-SignedHeaders=content-type%3Bhost/);
  assert.equal(assinado.headers['Content-Type'], 'image/jpeg');
  assert.equal(assinado.headers.host, undefined);
  assert.doesNotMatch(assinado.url, /SEGREDO/);
});
