#!/usr/bin/env node
// Copia os arquivos do bucket `attachments` do Supabase para o Cloudflare R2
// e troca os links gravados no banco. Não apaga nada no Supabase.
//
// Sem --apply só mostra o que faria. O arquivo scripts/r2.env (não vai para
// o git) guarda a service role e a chave do R2, só nesta máquina.

import { existsSync, readFileSync } from 'node:fs';
import { TABELAS_ARQUIVO, chaveOrfa, planejarLinha, referenciaSupabase, reescreverValor } from '../supabase/functions/_shared/arquivos.js';
import { configR2, presignHead, presignPut } from '../supabase/functions/_shared/r2.js';

const AJUDA = `
Migra fotos, vídeos, PDFs, logos e comprovantes do Storage do Supabase para o R2.

Uso:
  node scripts/migrar-storage-r2.mjs                 simula, não grava nada
  node scripts/migrar-storage-r2.mjs --apply         copia e atualiza o banco
  node scripts/migrar-storage-r2.mjs --apply --limite 10
  node scripts/migrar-storage-r2.mjs --apply --incluir-orfaos

Antes do --apply, cole no SQL editor do Supabase o arquivo
supabase/migrations/0030_gravar_arquivo_sem_updated_at.sql
https://supabase.com/dashboard/project/plprhjkkxgmapnbmaaew/sql/new

Variáveis (ambiente ou scripts/r2.env):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY     a chave service_role, não a anon
  SUPABASE_BUCKET               opcional, padrão attachments
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET
  R2_PUBLIC_BASE_URL            domínio público, escolhido antes de gravar

O script não apaga o bucket antigo. Links já enviados no WhatsApp e no
e-mail continuam apontando para o Supabase até esses arquivos serem
removidos de lá, no painel, depois de conferir.
`.trim();

const PAINEL_SQL = 'https://supabase.com/dashboard/project/plprhjkkxgmapnbmaaew/sql/new';

function lerArgs(argv) {
  const opcoes = { apply: false, incluirOrfaos: false, limite: Infinity, env: null, ajuda: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opcoes.ajuda = true;
    else if (arg === '--apply') opcoes.apply = true;
    else if (arg === '--incluir-orfaos') opcoes.incluirOrfaos = true;
    else if (arg === '--limite') {
      opcoes.limite = Number(argv[i + 1]);
      i += 1;
      if (!Number.isInteger(opcoes.limite) || opcoes.limite <= 0) {
        throw new Error('--limite precisa ser um número inteiro maior que zero.');
      }
    } else if (arg === '--env') {
      opcoes.env = argv[i + 1];
      i += 1;
      if (!opcoes.env) throw new Error('--env precisa do caminho do arquivo.');
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  return opcoes;
}

function aplicarEnv(caminho, obrigatorio) {
  if (!existsSync(caminho)) {
    if (obrigatorio) throw new Error(`Não achei o arquivo ${caminho}`);
    return;
  }
  const texto = readFileSync(caminho, 'utf8');
  for (const linha of texto.split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const eq = limpa.indexOf('=');
    if (eq < 1) continue;
    const chave = limpa.slice(0, eq).trim();
    let valor = limpa.slice(eq + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (!process.env[chave]) process.env[chave] = valor;
  }
}

function cfgSupabase() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const bucketOrigem = (process.env.SUPABASE_BUCKET || 'attachments').trim();
  const faltando = [];
  if (!supabaseUrl) faltando.push('SUPABASE_URL');
  if (!serviceRoleKey) faltando.push('SUPABASE_SERVICE_ROLE_KEY');
  if (faltando.length) throw new Error(`Falta configurar: ${faltando.join(', ')}.`);
  if (!supabaseUrl.startsWith('https://')) throw new Error('SUPABASE_URL precisa começar com https://');
  return { supabaseUrl, serviceRoleKey, bucketOrigem };
}

function cabecalhos(cfg, json = false) {
  const headers = {
    apikey: cfg.serviceRoleKey,
    Authorization: `Bearer ${cfg.serviceRoleKey}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function lerTabela(cfg, spec) {
  const linhas = [];
  let cursor = '';
  const colunas = [...new Set(['id', spec.empresaCampo, ...spec.colunas])].join(',');
  for (;;) {
    const params = new URLSearchParams();
    params.set('select', colunas);
    params.set('order', 'id.asc');
    params.set('limit', '400');
    if (cursor) params.set('id', `gt.${cursor}`);
    const resposta = await fetch(`${cfg.supabaseUrl}/rest/v1/${spec.tabela}?${params}`, {
      headers: cabecalhos(cfg),
    });
    if (!resposta.ok) {
      const texto = await resposta.text();
      throw new Error(`${spec.tabela}: ${resposta.status} ${texto.slice(0, 240)}`);
    }
    const pagina = await resposta.json();
    if (!Array.isArray(pagina) || pagina.length === 0) break;
    linhas.push(...pagina);
    cursor = pagina[pagina.length - 1].id;
    if (pagina.length < 400) break;
  }
  return linhas;
}

function citarCaminhos(valor, bucket, destino) {
  reescreverValor(valor, (url) => {
    const caminho = referenciaSupabase(url, bucket);
    if (caminho) destino.add(caminho);
    return url;
  });
}

async function listarStorage(cfg) {
  const objetos = [];
  const visitados = new Set();

  async function descer(prefixo) {
    if (visitados.has(prefixo)) return;
    visitados.add(prefixo);
    let offset = 0;
    let anterior = '';
    for (;;) {
      const resposta = await fetch(`${cfg.supabaseUrl}/storage/v1/object/list/${cfg.bucketOrigem}`, {
        method: 'POST',
        headers: cabecalhos(cfg, true),
        body: JSON.stringify({
          prefix: prefixo,
          limit: 1000,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        }),
      });
      if (!resposta.ok) {
        const texto = await resposta.text();
        throw new Error(`listagem do bucket: ${resposta.status} ${texto.slice(0, 200)}`);
      }
      const lista = await resposta.json();
      if (!Array.isArray(lista) || lista.length === 0) break;
      const marca = `${lista[0]?.name}:${lista.length}:${offset}`;
      if (marca === anterior) break;
      anterior = marca;
      for (const item of lista) {
        if (!item?.name) continue;
        const caminho = `${prefixo}${item.name}`;
        if (!item.id) await descer(caminho.endsWith('/') ? caminho : `${caminho}/`);
        else objetos.push(caminho);
      }
      if (lista.length < 1000) break;
      offset += lista.length;
    }
  }

  await descer('');
  return objetos;
}

async function conferirFuncao(cfg) {
  const resposta = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/climapro_gravar_arquivo`, {
    method: 'POST',
    headers: { ...cabecalhos(cfg, true), Prefer: 'return=minimal' },
    body: JSON.stringify({
      p_tabela: 'nao_existe',
      p_id: '00000000-0000-0000-0000-000000000000',
      p_coluna: 'logo_url',
      p_valor: 'x',
    }),
  });
  const texto = await resposta.text();
  if (
    texto.includes('PGRST202')
    || texto.includes('Could not find the function')
    || texto.includes('schema cache')
  ) {
    return false;
  }
  if (texto.includes('não permitida') || texto.includes('nao permitida')) return true;
  throw new Error(`Resposta inesperada ao testar a função de gravação: ${texto.slice(0, 300)}`);
}

async function gravarColuna(cfg, tabela, id, coluna, valor) {
  const resposta = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/climapro_gravar_arquivo`, {
    method: 'POST',
    headers: { ...cabecalhos(cfg, true), Prefer: 'return=minimal' },
    body: JSON.stringify({ p_tabela: tabela, p_id: id, p_coluna: coluna, p_valor: valor }),
  });
  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`${tabela}.${coluna}: ${texto.slice(0, 300)}`);
  }
}

async function objetoExiste(r2, chave) {
  const assinado = await presignHead(r2, chave);
  const resposta = await fetch(assinado.url, { method: 'HEAD', redirect: 'manual' });
  if (resposta.status === 200) return true;
  if (resposta.status === 404) return false;
  throw new Error(`consulta no R2 respondeu ${resposta.status}`);
}

async function copiarArquivo(cfg, r2, caminho, chave) {
  if (await objetoExiste(r2, chave)) return 'existia';
  const encoded = caminho.split('/').map((parte) => encodeURIComponent(parte)).join('/');
  const origem = await fetch(`${cfg.supabaseUrl}/storage/v1/object/${cfg.bucketOrigem}/${encoded}`, {
    headers: cabecalhos(cfg),
    redirect: 'manual',
  });
  if (!origem.ok) throw new Error(`download falhou (${origem.status})`);
  const contentType = (origem.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim()
    || 'application/octet-stream';
  const bytes = new Uint8Array(await origem.arrayBuffer());
  const destino = await presignPut(r2, chave, contentType);
  const enviado = await fetch(destino.url, {
    method: 'PUT',
    headers: destino.headers,
    body: bytes,
    redirect: 'manual',
  });
  if (!enviado.ok) throw new Error(`envio ao R2 falhou (${enviado.status})`);
  return 'copiado';
}

async function emFila(itens, trabalhador, paralelo = 2) {
  const fila = [...itens];
  if (fila.length === 0) return;
  await Promise.all(Array.from({ length: Math.min(paralelo, fila.length) }, async () => {
    while (fila.length) {
      const item = fila.shift();
      await trabalhador(item);
    }
  }));
}

function idJob(empresaId, caminho) {
  return `${empresaId}\0${caminho}`;
}

function avisoSql() {
  console.error('');
  console.error('Falta aplicar um SQL no Supabase antes de gravar.');
  console.error(`Abra ${PAINEL_SQL}`);
  console.error('Cole o conteúdo de supabase/migrations/0030_gravar_arquivo_sem_updated_at.sql e rode.');
  console.error('Sem isso, a gravação mudaria a data de atualização de chamados e PMOCs.');
}

async function main() {
  const opcoes = lerArgs(process.argv.slice(2));
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }

  aplicarEnv(opcoes.env || new URL('./r2.env', import.meta.url), Boolean(opcoes.env));

  const cfg = cfgSupabase();
  const r2 = configR2({ exigirBasePublica: true });

  console.log(opcoes.apply ? 'Modo: gravar de verdade' : 'Modo: simulação (nada será copiado nem alterado no banco)');
  console.log(`Origem: ${cfg.bucketOrigem}`);
  console.log(`Destino: ${r2.bucket}`);
  console.log(`Endereço público: ${r2.publicBaseUrl}`);
  if (r2.publicBaseUrl.includes('.r2.dev')) {
    console.log('Aviso: o endereço r2.dev funciona, mas o Cloudflare limita o acesso. O domínio próprio é melhor, e precisa ser escolhido antes de gravar — o link fica salvo no banco e no WhatsApp.');
  }

  const registros = [];
  const citados = new Set();
  const erros = [];

  for (const spec of TABELAS_ARQUIVO) {
    let linhas;
    try {
      linhas = await lerTabela(cfg, spec);
    } catch (erro) {
      erros.push(`Não consegui ler ${spec.tabela}: ${erro.message}`);
      console.error(erros[erros.length - 1]);
      continue;
    }
    for (const linha of linhas) {
      for (const coluna of spec.colunas) citarCaminhos(linha[coluna], cfg.bucketOrigem, citados);
      const plano = planejarLinha(linha, spec, {
        bucket: cfg.bucketOrigem,
        basePublica: r2.publicBaseUrl,
      });
      if (plano.erro || Object.keys(plano.colunas).length === 0) continue;
      registros.push({ spec, linha });
    }
  }

  const jobs = new Map();
  for (const registro of registros) {
    for (const copia of planejarLinha(registro.linha, registro.spec, {
      bucket: cfg.bucketOrigem,
      basePublica: r2.publicBaseUrl,
    }).copias) {
      const id = idJob(copia.empresaId, copia.caminho);
      if (!jobs.has(id)) jobs.set(id, { ...copia, ok: !opcoes.apply, estado: 'pendente', erro: null });
    }
  }

  let orfaos = [];
  try {
    const existentes = await listarStorage(cfg);
    orfaos = existentes.filter((caminho) => !citados.has(caminho));
  } catch (erro) {
    erros.push(`Não consegui listar o bucket para achar órfãos: ${erro.message}`);
    console.error(erros[erros.length - 1]);
  }

  const listaJobs = [...jobs.values()].sort((a, b) => a.caminho.localeCompare(b.caminho));
  const cortados = Number.isFinite(opcoes.limite) && listaJobs.length > opcoes.limite;
  const paraCopiar = listaJobs.slice(0, opcoes.limite);

  console.log('');
  console.log(`Referências a copiar: ${listaJobs.length}`);
  console.log(`Linhas do banco a atualizar: ${registros.length}`);
  console.log(`Arquivos no bucket sem nenhuma citação: ${orfaos.length}`);
  if (orfaos.length > 0) {
    for (const caminho of orfaos.slice(0, 20)) console.log(`  órfão: ${caminho}`);
    if (orfaos.length > 20) console.log(`  ... e mais ${orfaos.length - 20}`);
    if (!opcoes.incluirOrfaos) {
      console.log('Órfãos não são copiados. Se algum importar, rode de novo com --incluir-orfaos.');
    }
  }
  for (const exemplo of paraCopiar.slice(0, 3)) {
    console.log(`  ${exemplo.caminho}  ->  ${exemplo.urlNova}`);
  }

  if (!opcoes.apply) {
    console.log('');
    console.log('Nada foi alterado. Quando o endereço público estiver certo, rode de novo com --apply.');
    if (erros.length) process.exitCode = 1;
    return;
  }

  if (!(await conferirFuncao(cfg))) {
    avisoSql();
    process.exitCode = 1;
    return;
  }

  let copiados = 0;
  let jaExistiam = 0;
  await emFila(paraCopiar, async (job) => {
    try {
      const estado = await copiarArquivo(cfg, r2, job.caminho, job.chave);
      job.ok = true;
      job.estado = estado;
      if (estado === 'copiado') copiados += 1;
      else jaExistiam += 1;
      console.error(`${estado}: ${job.caminho}`);
    } catch (erro) {
      job.ok = false;
      job.erro = erro.message;
      erros.push(`${job.caminho}: ${erro.message}`);
      console.error(`falhou ${job.caminho}: ${erro.message}`);
    }
  });

  const aceitos = new Set(paraCopiar.filter((job) => job.ok).map((job) => idJob(job.empresaId, job.caminho)));
  let linhasGravadas = 0;
  let colunasGravadas = 0;

  for (const registro of registros) {
    const plano = planejarLinha(registro.linha, registro.spec, {
      bucket: cfg.bucketOrigem,
      basePublica: r2.publicBaseUrl,
      aceitar: (empresaId, caminho) => aceitos.has(idJob(empresaId, caminho)),
    });
    const colunas = Object.entries(plano.colunas);
    if (colunas.length === 0) continue;
    try {
      for (const [coluna, valor] of colunas) {
        await gravarColuna(cfg, registro.spec.tabela, registro.linha.id, coluna, valor);
        colunasGravadas += 1;
      }
      linhasGravadas += 1;
    } catch (erro) {
      erros.push(`${registro.spec.tabela} ${registro.linha.id}: ${erro.message}`);
      console.error(erros[erros.length - 1]);
    }
  }

  let orfaosCopiados = 0;
  if (opcoes.incluirOrfaos) {
    for (const caminho of orfaos) {
      try {
        const estado = await copiarArquivo(cfg, r2, caminho, chaveOrfa(caminho));
        if (estado === 'copiado' || estado === 'existia') orfaosCopiados += 1;
        console.error(`${estado} (órfão): ${caminho}`);
      } catch (erro) {
        erros.push(`órfão ${caminho}: ${erro.message}`);
        console.error(`falhou órfão ${caminho}: ${erro.message}`);
      }
    }
  }

  console.log('');
  console.log(`Copiados agora: ${copiados}`);
  console.log(`Já estavam no R2: ${jaExistiam}`);
  console.log(`Falhas de cópia: ${paraCopiar.filter((job) => !job.ok).length}`);
  console.log(`Linhas atualizadas: ${linhasGravadas}`);
  console.log(`Colunas atualizadas: ${colunasGravadas}`);
  if (opcoes.incluirOrfaos) console.log(`Órfãos copiados para a pasta orfaos/: ${orfaosCopiados}`);
  if (cortados) console.log(`Parei no limite de ${opcoes.limite}. Rode de novo para continuar.`);
  if (erros.length) {
    console.log(`Erros: ${erros.length}`);
    process.exitCode = 1;
  }
}

main().catch((erro) => {
  console.error(erro.message || erro);
  process.exit(1);
});
