import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chaveDeReferenciaR2,
  chaveMigrada,
  chaveOrfa,
  chavePermitida,
  montarChave,
  planejarLinha,
  provedorStorage,
  referenciaSupabase,
  sanitizarNomeArquivo,
  tipoConteudoPermitido,
  urlPublicaR2,
} from './arquivos.js';
import { enviarParaR2 } from './uploadR2.js';

const EMPRESA = '11111111-1111-4111-8111-111111111111';
const OUTRA = '22222222-2222-4222-8222-222222222222';
const ARQUIVO = '33333333-3333-4333-8333-333333333333';
const BASE = 'https://arquivos.exemplo.com';
const SUPA = 'https://abc.supabase.co/storage/v1/object/public/attachments/';

test('provedor padrão continua sendo o Supabase', () => {
  assert.equal(provedorStorage(), 'supabase');
  assert.equal(provedorStorage(''), 'supabase');
  assert.equal(provedorStorage('R2'), 'r2');
  assert.equal(provedorStorage('supabase'), 'supabase');
});

test('tipo bloqueia html e aceita foto, vídeo e pdf', () => {
  assert.equal(tipoConteudoPermitido('image/jpeg'), 'image/jpeg');
  assert.equal(tipoConteudoPermitido('video/mp4'), 'video/mp4');
  assert.equal(tipoConteudoPermitido('application/pdf'), 'application/pdf');
  assert.equal(tipoConteudoPermitido(''), 'application/octet-stream');
  assert.equal(tipoConteudoPermitido('text/html'), null);
  assert.equal(tipoConteudoPermitido('image/svg+xml'), null);
});

test('nome de arquivo perde caminho e acento', () => {
  assert.equal(sanitizarNomeArquivo('pasta/Foto do telhado.JPG'), 'Foto-do-telhado.JPG');
  assert.equal(sanitizarNomeArquivo('../segredo'), 'segredo');
  assert.equal(sanitizarNomeArquivo(''), 'arquivo');
});

test('chave nova fica dentro da empresa e a migrada é estável', () => {
  assert.equal(
    montarChave(EMPRESA, 'foto.jpg', ARQUIVO),
    `${EMPRESA}/${ARQUIVO}-foto.jpg`,
  );
  const uma = chaveMigrada(EMPRESA, 'uuid-foto.jpg');
  assert.equal(uma, chaveMigrada(EMPRESA, 'uuid-foto.jpg'));
  assert.notEqual(uma, chaveMigrada(OUTRA, 'uuid-foto.jpg'));
  assert.throws(() => chaveMigrada(EMPRESA, '../etc/passwd'));
  assert.match(chaveOrfa('solto.jpg'), /^orfaos\/[0-9a-f]{8}-solto\.jpg$/);
});

test('leitura de outra empresa é recusada', () => {
  const chave = `${EMPRESA}/${ARQUIVO}-foto.jpg`;
  assert.equal(chavePermitida(chave, EMPRESA), true);
  assert.equal(chavePermitida(chave, OUTRA), false);
  assert.equal(chavePermitida(`${EMPRESA}/../${OUTRA}/segredo`, EMPRESA), false);
  assert.equal(chavePermitida(chaveOrfa('solto.jpg'), EMPRESA), false);
  assert.equal(chavePermitida(chave, null, { adminGlobal: true }), true);
});

test('reconhece URL antiga do Storage e ignora data URL e link externo', () => {
  assert.equal(referenciaSupabase(`${SUPA}uuid-foto.jpg`), 'uuid-foto.jpg');
  assert.equal(
    referenciaSupabase(`https://abc.supabase.co/storage/v1/object/sign/attachments/a%20b.jpg?token=abc`),
    'a b.jpg',
  );
  assert.equal(referenciaSupabase('data:image/png;base64,aaaa'), null);
  assert.equal(referenciaSupabase('https://prefeitura.exemplo/nota.pdf'), null);
  assert.equal(referenciaSupabase(`${SUPA}../../segredo`), null);
  assert.equal(
    referenciaSupabase('https://abc.supabase.co/storage/v1/object/public/outros/a.jpg'),
    null,
  );
});

test('URL pública codifica o nome e não usa o endpoint da API', () => {
  assert.equal(
    urlPublicaR2(`${BASE}/`, `${EMPRESA}/migrado/a b.jpg`),
    `${BASE}/${EMPRESA}/migrado/a%20b.jpg`,
  );
  assert.throws(() => urlPublicaR2('https://conta.r2.cloudflarestorage.com', 'a.jpg'));
  assert.equal(chaveDeReferenciaR2(`r2://${EMPRESA}/foto.jpg`), `${EMPRESA}/foto.jpg`);
  assert.equal(chaveDeReferenciaR2('https://outro.exemplo/foto.jpg', BASE), null);
});

test('planeja cópia e reescrita sem mexer em assinatura desenhada nem link externo', () => {
  const spec = {
    tabela: 'chamado',
    empresaCampo: 'empresa_id',
    colunas: ['fotos_finalizacao', 'assinatura_cliente'],
  };
  const plano = planejarLinha({
    id: ARQUIVO,
    empresa_id: EMPRESA,
    fotos_finalizacao: [`${SUPA}foto-1.jpg`, 'https://cdn.exemplo/ja-fora.jpg'],
    assinatura_cliente: 'data:image/png;base64,iVBORw0KGgo',
  }, spec, { basePublica: BASE });

  assert.equal(plano.copias.length, 1);
  assert.equal(plano.copias[0].caminho, 'foto-1.jpg');
  assert.equal(plano.colunas.fotos_finalizacao[0], plano.copias[0].urlNova);
  assert.equal(plano.colunas.fotos_finalizacao[1], 'https://cdn.exemplo/ja-fora.jpg');
  assert.equal(plano.colunas.assinatura_cliente, undefined);
  assert.match(plano.copias[0].chave, new RegExp(`^${EMPRESA}/migrado/`));
});

test('texto de WhatsApp troca só o link do Storage', () => {
  const spec = { tabela: 'whatsapp_mensagem', empresaCampo: 'empresa_id', colunas: ['texto'] };
  const plano = planejarLinha({
    id: ARQUIVO,
    empresa_id: EMPRESA,
    texto: `Relatório completo:\n${SUPA}relatorio.pdf\nObrigado.`,
  }, spec, { basePublica: BASE });

  assert.equal(plano.copias.length, 1);
  assert.match(plano.colunas.texto, /^Relatório completo:\nhttps:\/\/arquivos\.exemplo\.com\//);
  assert.match(plano.colunas.texto, /Obrigado\.$/);
  assert.doesNotMatch(plano.colunas.texto, /supabase\.co/);
});

test('equipamento não grava foto_url quando o array já cobre', () => {
  const spec = { tabela: 'equipamento', empresaCampo: 'empresa_id', colunas: ['foto_url', 'fotos_urls'] };
  const plano = planejarLinha({
    id: ARQUIVO,
    empresa_id: EMPRESA,
    foto_url: `${SUPA}principal.jpg`,
    fotos_urls: [`${SUPA}principal.jpg`, `${SUPA}detalhe.jpg`],
  }, spec, { basePublica: BASE });

  assert.equal(plano.colunas.foto_url, undefined);
  assert.equal(plano.colunas.fotos_urls.length, 2);
  assert.equal(plano.copias.length, 2);
});

test('documento do cliente reescreve o campo url e preserva o resto', () => {
  const spec = { tabela: 'cliente', empresaCampo: 'empresa_id', colunas: ['documentos'] };
  const plano = planejarLinha({
    id: ARQUIVO,
    empresa_id: EMPRESA,
    documentos: [
      { nome: 'Laudo', tipo: 'laudo', url: `${SUPA}laudo.pdf` },
      { nome: 'Nota', url: 'https://prefeitura.exemplo/nota.pdf' },
    ],
  }, spec, { basePublica: BASE });

  assert.equal(plano.copias.length, 1);
  assert.equal(plano.colunas.documentos[0].nome, 'Laudo');
  assert.match(plano.colunas.documentos[0].url, /^https:\/\/arquivos\.exemplo\.com\//);
  assert.equal(plano.colunas.documentos[1].url, 'https://prefeitura.exemplo/nota.pdf');
});

test('segunda passada só grava o que a cópia confirmou', () => {
  const spec = { tabela: 'chamado', empresaCampo: 'empresa_id', colunas: ['fotos_finalizacao'] };
  const linha = {
    id: ARQUIVO,
    empresa_id: EMPRESA,
    fotos_finalizacao: [`${SUPA}ok.jpg`, `${SUPA}falhou.jpg`],
  };
  const plano = planejarLinha(linha, spec, {
    basePublica: BASE,
    aceitar: (_empresa, caminho) => caminho === 'ok.jpg',
  });
  assert.deepEqual(plano.copias.map((c) => c.caminho), ['ok.jpg']);
  assert.match(plano.colunas.fotos_finalizacao[0], /^https:\/\/arquivos\.exemplo\.com\//);
  assert.equal(plano.colunas.fotos_finalizacao[1], `${SUPA}falhou.jpg`);
});

test('PUT vai para a URL assinada, sem mandar segredo nem Authorization', async () => {
  const chamadas = [];
  const arquivo = { name: 'foto.jpg', type: 'image/jpeg', size: 4 };
  const resultado = await enviarParaR2(arquivo, async (pedido) => {
    chamadas.push(pedido);
    return {
      upload_url: 'https://conta.r2.cloudflarestorage.com/bucket/chave?X-Amz-Signature=abc',
      file_url: `${BASE}/${EMPRESA}/chave.jpg`,
      headers: { 'Content-Type': 'image/jpeg' },
    };
  }, async (url, init) => {
    chamadas.push({ url, init });
    return { ok: true, status: 200 };
  });

  assert.equal(resultado.file_url, `${BASE}/${EMPRESA}/chave.jpg`);
  assert.equal(chamadas[0].action, 'upload');
  assert.equal(chamadas[0].contentType, 'image/jpeg');
  assert.equal(chamadas[1].init.method, 'PUT');
  assert.equal(chamadas[1].init.headers['Content-Type'], 'image/jpeg');
  assert.equal(chamadas[1].init.headers.Authorization, undefined);
  assert.equal(JSON.stringify(chamadas).includes('SECRET'), false);
});

test('html nem chega a pedir URL assinada', async () => {
  let pedidos = 0;
  await assert.rejects(
    () => enviarParaR2(
      { name: 'pagina.html', type: 'text/html', size: 10 },
      async () => {
        pedidos += 1;
        return {};
      },
    ),
    /não pode ser enviado/,
  );
  assert.equal(pedidos, 0);
});
