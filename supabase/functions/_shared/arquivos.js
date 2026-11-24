// Regras de nome, caminho e URL dos arquivos. Sem rede e sem segredo:
// a Edge Function, o app e o script de migração importam daqui para não
// tratarem o mesmo link de jeitos diferentes.

export const TAMANHO_MAXIMO_PADRAO = 200 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// HTML e SVG servidos no domínio público viram página no nosso endereço.
// O resto do que o app realmente anexa passa.
const BLOQUEADOS = new Set([
  'text/html',
  'image/svg+xml',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
]);

const DOCUMENTOS = new Set([
  'application/pdf',
  'application/octet-stream',
  'text/plain',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

// Colunas que guardam link de arquivo. O SQL 0030 repete esta lista de
// propósito: a função do banco só aceita gravar nestas colunas.
export const TABELAS_ARQUIVO = [
  { tabela: 'empresa', empresaCampo: 'id', colunas: ['logo_url'] },
  { tabela: 'equipamento', empresaCampo: 'empresa_id', colunas: ['foto_url', 'fotos_urls'] },
  { tabela: 'chamado', empresaCampo: 'empresa_id', colunas: ['fotos_anexos', 'fotos_finalizacao', 'videos_finalizacao', 'assinatura_cliente'] },
  { tabela: 'manutencao_pmoc', empresaCampo: 'empresa_id', colunas: ['fotos_por_equipamento', 'assinatura_tecnico', 'assinatura_cliente', 'pdf_url'] },
  { tabela: 'gasto_tecnico', empresaCampo: 'empresa_id', colunas: ['comprovante_url'] },
  { tabela: 'lancamento_tecnico', empresaCampo: 'empresa_id', colunas: ['comprovante_url'] },
  { tabela: 'movimentacao_tecnico', empresaCampo: 'empresa_id', colunas: ['comprovante_url'] },
  { tabela: 'nota_fiscal', empresaCampo: 'empresa_id', colunas: ['arquivo_pdf_url', 'arquivo_xml_url'] },
  { tabela: 'ponto_eletronico', empresaCampo: 'empresa_id', colunas: ['foto_comprovante'] },
  { tabela: 'cliente', empresaCampo: 'empresa_id', colunas: ['documentos'] },
  { tabela: 'orcamento', empresaCampo: 'empresa_id', colunas: ['assinatura_cliente'] },
  { tabela: 'whatsapp_mensagem', empresaCampo: 'empresa_id', colunas: ['texto'] },
];

export function tipoConteudoPermitido(tipo) {
  const base = String(tipo || '').split(';')[0].trim().toLowerCase();
  if (!base) return 'application/octet-stream';
  if (BLOQUEADOS.has(base)) return null;
  if (base.startsWith('image/') || base.startsWith('video/') || base.startsWith('audio/')) return base;
  if (DOCUMENTOS.has(base)) return base;
  return null;
}

export function sanitizarNomeArquivo(nome) {
  const base = String(nome || 'arquivo').split(/[/\\]/).pop() || 'arquivo';
  const semAcento = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const limpo = semAcento
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return limpo || 'arquivo';
}

export function chaveSegura(chave) {
  if (typeof chave !== 'string') return false;
  if (!chave || chave.length > 1024) return false;
  if (chave.startsWith('/') || chave.includes('..') || chave.includes('\\') || chave.includes('\0')) return false;
  if (/[\u0000-\u001f\u007f]/.test(chave)) return false;
  return true;
}

// Pasta de quem ainda não tem empresa. Fica fora de `<empresa_id>/` para
// um usuário não alcançar o arquivo de outro tenant.
export const PASTA_USUARIO = 'usuarios';

function idValido(valor) {
  const texto = String(valor || '').trim();
  return UUID.test(texto) ? texto.toLowerCase() : '';
}

function comecaComPasta(chave, pasta) {
  const prefixo = `${String(pasta).toLowerCase()}/`;
  return chave.slice(0, prefixo.length).toLowerCase() === prefixo;
}

// A pasta da empresa é o controle de tenant. Admin global lê qualquer
// caminho seguro. Os demais leem a própria empresa e, se ainda não têm
// empresa, só `usuarios/<user_id>/`.
export function chavePermitida(chave, empresaId, { adminGlobal = false, userId = null } = {}) {
  if (!chaveSegura(chave)) return false;
  if (adminGlobal) return true;
  const empresa = idValido(empresaId);
  if (empresa && comecaComPasta(chave, empresa)) return true;
  const usuario = idValido(userId);
  if (usuario && comecaComPasta(chave, `${PASTA_USUARIO}/${usuario}`)) return true;
  return false;
}

export function montarChave(empresaId, nome, id) {
  const empresa = idValido(empresaId);
  if (!empresa) throw new Error('Empresa inválida.');
  if (!UUID.test(String(id || ''))) throw new Error('Identificador de arquivo inválido.');
  return `${empresa}/${id}-${sanitizarNomeArquivo(nome)}`;
}

export function montarChaveUsuario(userId, nome, id) {
  const usuario = idValido(userId);
  if (!usuario) throw new Error('Usuário inválido.');
  if (!UUID.test(String(id || ''))) throw new Error('Identificador de arquivo inválido.');
  return `${PASTA_USUARIO}/${usuario}/${id}-${sanitizarNomeArquivo(nome)}`;
}

// Quem pode gravar e ler. O bucket antigo `attachments` era público e
// qualquer autenticado inseria, atualizava e apagava qualquer objeto,
// sem pasta. No R2 a pasta isola o tenant: isso não volta.
//
// Com empresa, o envio cai em `<empresa_id>/` e a leitura também. Sem
// empresa, envio e leitura ficam em `usuarios/<user_id>/`. admin_global
// lê qualquer caminho seguro. O envio dele usa a empresa, se tiver, e
// a pasta pessoal se não tiver — o cliente não escolhe a pasta.
export function escopoArquivo({ userId, empresaId, tipoUsuario } = {}) {
  const adminGlobal = tipoUsuario === 'admin_global';
  const empresa = idValido(empresaId);
  const usuario = idValido(userId);
  return {
    adminGlobal,
    empresaId: empresa,
    userId: usuario,
    prefixoUpload: empresa || (usuario ? `${PASTA_USUARIO}/${usuario}` : ''),
  };
}

export function podeLerChave(chave, escopo) {
  if (!escopo) return false;
  return chavePermitida(chave, escopo.empresaId || null, {
    adminGlobal: !!escopo.adminGlobal,
    // Com empresa, a leitura fica na pasta dela. A pasta pessoal só entra
    // enquanto a conta ainda não tem tenant. admin_global ignora os dois.
    userId: escopo.empresaId ? null : escopo.userId,
  });
}

export function montarChaveDoEscopo(escopo, nome, id) {
  if (!escopo?.prefixoUpload) throw new Error('Sua conta não pode enviar arquivo.');
  if (escopo.empresaId) return montarChave(escopo.empresaId, nome, id);
  return montarChaveUsuario(escopo.userId, nome, id);
}

function fnv1a(texto) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// Mesma origem vira sempre a mesma chave. Rodar a migração de novo não
// duplica o arquivo no R2.
function caminhoMigravel(caminho) {
  const bruto = String(caminho || '');
  if (!bruto || bruto.includes('..') || bruto.startsWith('/')) {
    throw new Error('Caminho de arquivo inválido.');
  }
  return bruto;
}

export function chaveMigrada(empresaId, caminho) {
  if (!UUID.test(String(empresaId || ''))) throw new Error('Empresa inválida na migração.');
  const bruto = caminhoMigravel(caminho);
  const nome = sanitizarNomeArquivo(bruto.split('/').filter(Boolean).pop());
  return `${empresaId}/migrado/${fnv1a(bruto)}-${nome}`;
}

// Arquivo que está no bucket e não aparece em nenhuma coluna. Fica fora da
// pasta da empresa de propósito: não há tenant para pendurar nele.
export function chaveOrfa(caminho) {
  const bruto = caminhoMigravel(caminho);
  const nome = sanitizarNomeArquivo(bruto.split('/').filter(Boolean).pop());
  return `orfaos/${fnv1a(bruto)}-${nome}`;
}

export function normalizarBasePublica(base) {
  const limpa = String(base || '').trim().replace(/\/+$/, '');
  if (!limpa) return '';
  if (!/^https:\/\/\S+$/i.test(limpa)) {
    throw new Error('R2_PUBLIC_BASE_URL precisa ser um endereço https, sem espaço.');
  }
  if (limpa.includes('r2.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_BASE_URL é o endereço público do bucket (domínio próprio ou pub-....r2.dev), não o endpoint da API.');
  }
  return limpa;
}

export function urlPublicaR2(base, chave) {
  const raiz = normalizarBasePublica(base);
  if (!raiz) throw new Error('R2_PUBLIC_BASE_URL não configurada.');
  if (!chaveSegura(chave)) throw new Error('Caminho de arquivo inválido.');
  const caminho = chave.split('/').filter(Boolean).map((parte) => encodeURIComponent(parte)).join('/');
  return `${raiz}/${caminho}`;
}

// `r2://empresa/arquivo` é a referência estável quando ainda não há domínio
// público. O app troca isso por uma URL assinada na hora de abrir.
export function chaveDeReferenciaR2(valor, basePublica = '') {
  if (typeof valor !== 'string' || !valor) return null;
  if (valor.startsWith('r2://')) {
    const chave = valor.slice('r2://'.length).replace(/^\/+/, '');
    return chaveSegura(chave) ? chave : null;
  }
  if (!basePublica) return null;
  let raiz = '';
  try {
    raiz = normalizarBasePublica(basePublica);
  } catch {
    return null;
  }
  if (!raiz || !valor.startsWith(`${raiz}/`)) return null;
  const resto = valor.slice(raiz.length + 1).split('?')[0].split('#')[0];
  let chave = '';
  try {
    chave = resto.split('/').map((parte) => decodeURIComponent(parte)).join('/');
  } catch {
    return null;
  }
  return chaveSegura(chave) ? chave : null;
}

// Só quando a string inteira é o link do Storage. Texto com o link no meio
// (mensagem de WhatsApp) é tratado por mapearTexto, que recorta a URL antes.
export function referenciaSupabase(url, bucket = 'attachments') {
  if (typeof url !== 'string' || !url || url.startsWith('data:')) return null;
  const texto = url.trim();
  const nome = String(bucket).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^https?:\\/\\/[^/\\s]+/storage/v1/object/(?:public|sign|authenticated)/${nome}/([^?#\\s]+)`);
  const achado = texto.match(re);
  if (!achado) return null;
  const resto = texto.slice(achado[0].length);
  if (resto && !resto.startsWith('?') && !resto.startsWith('#')) return null;
  let caminho = achado[1];
  try {
    caminho = decodeURIComponent(caminho);
  } catch {
    return null;
  }
  if (!caminho || caminho.includes('..') || caminho.startsWith('/')) return null;
  return caminho;
}

export function mapearTexto(texto, trocarUrl) {
  if (typeof texto !== 'string' || texto === '') return texto;
  const direto = trocarUrl(texto);
  if (direto !== texto) return direto;
  if (!texto.includes('http')) return texto;
  return texto.replace(/https?:\/\/[^\s"'<>]+/g, (bruto) => {
    const limpo = bruto.replace(/[),.;]+$/g, '');
    const novo = trocarUrl(limpo);
    if (novo === limpo) return bruto;
    return novo + bruto.slice(limpo.length);
  });
}

export function reescreverValor(valor, trocarUrl) {
  if (typeof valor === 'string') return mapearTexto(valor, trocarUrl);
  if (Array.isArray(valor)) return valor.map((item) => reescreverValor(item, trocarUrl));
  if (valor && typeof valor === 'object') {
    const saida = {};
    for (const [chave, item] of Object.entries(valor)) saida[chave] = reescreverValor(item, trocarUrl);
    return saida;
  }
  return valor;
}

export function mesmoValor(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// `aceitar(empresaId, caminho)` deixa a segunda passada gravar só o que
// realmente foi copiado. Sem ele, a simulação mostra o plano inteiro.
export function planejarLinha(linha, spec, { bucket = 'attachments', basePublica, aceitar } = {}) {
  const empresaId = linha?.[spec.empresaCampo];
  if (!empresaId) return { colunas: {}, copias: [], erro: 'Registro sem empresa.' };

  const copias = [];
  const trocar = (url) => {
    const caminho = referenciaSupabase(url, bucket);
    if (!caminho) return url;
    if (aceitar && !aceitar(empresaId, caminho)) return url;
    let chave;
    try {
      chave = chaveMigrada(empresaId, caminho);
    } catch {
      return url;
    }
    const urlNova = urlPublicaR2(basePublica, chave);
    copias.push({ empresaId, caminho, chave, urlAntiga: url, urlNova });
    return urlNova;
  };

  const colunas = {};
  for (const coluna of spec.colunas) {
    if (!linha || !Object.prototype.hasOwnProperty.call(linha, coluna)) continue;
    const novo = reescreverValor(linha[coluna], trocar);
    if (!mesmoValor(novo, linha[coluna])) colunas[coluna] = novo;
  }

  // O gatilho do equipamento faz foto_url ser sempre a primeira de fotos_urls.
  // Gravar as duas ao mesmo tempo seria desfeito por ele.
  if (spec.tabela === 'equipamento') {
    const fotos = Object.prototype.hasOwnProperty.call(colunas, 'fotos_urls')
      ? colunas.fotos_urls
      : linha.fotos_urls;
    if (Array.isArray(fotos) && fotos.length > 0) delete colunas.foto_url;
  }

  const textoFinal = JSON.stringify(colunas);
  const vistos = new Set();
  const copiasUteis = [];
  for (const copia of copias) {
    if (!textoFinal.includes(copia.urlNova)) continue;
    const id = `${copia.empresaId}\0${copia.caminho}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    copiasUteis.push(copia);
  }
  return { colunas, copias: copiasUteis, erro: null };
}

export async function exporReferenciasR2(valor, assinar) {
  if (typeof valor === 'string') {
    if (!valor.startsWith('r2://')) return valor;
    const chave = chaveDeReferenciaR2(valor);
    if (!chave) return valor;
    try {
      return await assinar(chave);
    } catch (erro) {
      console.error('[arquivo] falha ao abrir referência r2:', erro);
      return valor;
    }
  }
  if (Array.isArray(valor)) {
    const saida = [];
    for (const item of valor) saida.push(await exporReferenciasR2(item, assinar));
    return saida;
  }
  if (valor && typeof valor === 'object') {
    const saida = {};
    for (const [chave, item] of Object.entries(valor)) {
      saida[chave] = await exporReferenciasR2(item, assinar);
    }
    return saida;
  }
  return valor;
}
