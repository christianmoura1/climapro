// Fila de ações pendentes para quando o técnico está sem rede.
//
// O caso que motivou isso: técnico fecha o chamado no subsolo com 6 fotos e a
// assinatura do cliente, a rede cai no envio e ele perde tudo — inclusive a
// assinatura, que exige o cliente presente de novo. Aqui a ação inteira,
// arquivos incluídos, é gravada no aparelho e reenviada sozinha quando o sinal
// volta.
//
// IndexedDB guarda Blob/File nativamente, então as fotos vão para o disco do
// celular como estão, sem base64 (que inflaria ~33% e estouraria o limite de
// localStorage em qualquer chamado com foto).

const DB_NOME = 'climapro-outbox';
const DB_VERSAO = 1;
const STORE = 'acoes';

let dbPromise = null;

function abrirDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function transacionar(modo, fn) {
  return abrirDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo);
    const store = tx.objectStore(STORE);
    let resultado;
    try {
      resultado = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(resultado?.result ?? resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function estaOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

// Erro de rede tem cara diferente em cada camada (fetch cru, supabase-js,
// PostgREST). Erro de validação/permissão NÃO deve virar item de fila: ele vai
// falhar de novo para sempre.
export function ehFalhaDeRede(erro) {
  if (!estaOnline()) return true;
  const msg = String(erro?.message || erro || '').toLowerCase();
  return msg.includes('failed to fetch')
    || msg.includes('networkerror')
    || msg.includes('network request failed')
    || msg.includes('load failed')
    || msg.includes('falha de rede')
    || msg.includes('timeout')
    || erro?.name === 'TypeError' && msg.includes('fetch');
}

export async function enfileirar(tipo, payload) {
  return transacionar('readwrite', (store) => store.add({
    tipo,
    payload,
    criado_em: new Date().toISOString(),
    tentativas: 0,
    ultimo_erro: null,
  }));
}

export async function listar() {
  return transacionar('readonly', (store) => store.getAll());
}

export async function contarPendentes() {
  try {
    return await transacionar('readonly', (store) => store.count());
  } catch {
    return 0;
  }
}

export async function remover(id) {
  return transacionar('readwrite', (store) => store.delete(id));
}

async function registrarFalha(item, erro) {
  return transacionar('readwrite', (store) => store.put({
    ...item,
    tentativas: (item.tentativas || 0) + 1,
    ultimo_erro: String(erro?.message || erro),
  }));
}

// Handlers registrados por quem sabe processar cada tipo de ação. Fica assim
// para a outbox não depender do base44Client nem das telas — quem registra é o
// módulo dono da ação.
const handlers = new Map();

export function registrarHandler(tipo, fn) {
  handlers.set(tipo, fn);
}

let sincronizando = false;

// Processa a fila inteira, em ordem de criação. Um item que falha por rede
// interrompe a rodada (não adianta insistir nos seguintes). Um item que falha
// por outro motivo três vezes é descartado, para não travar a fila para
// sempre com algo que nunca vai passar.
export async function sincronizar({ aoMudar } = {}) {
  if (sincronizando || !estaOnline()) return { enviados: 0, restantes: await contarPendentes() };
  sincronizando = true;
  let enviados = 0;

  try {
    const itens = await listar();
    for (const item of itens) {
      const handler = handlers.get(item.tipo);
      if (!handler) continue;

      try {
        await handler(item.payload);
        await remover(item.id);
        enviados += 1;
        aoMudar?.();
      } catch (erro) {
        if (ehFalhaDeRede(erro)) {
          await registrarFalha(item, erro);
          break;
        }
        await registrarFalha(item, erro);
        if ((item.tentativas || 0) + 1 >= 3) {
          console.error(`[outbox] descartando ação ${item.tipo} após 3 falhas:`, erro);
          await remover(item.id);
          aoMudar?.();
        }
      }
    }
  } finally {
    sincronizando = false;
  }

  return { enviados, restantes: await contarPendentes() };
}

// Liga a sincronização automática: dispara ao voltar a rede, ao abrir o app e
// quando a aba volta ao foco (o celular costuma suspender a aba no bolso).
export function iniciarSincronizacaoAutomatica(aoMudar) {
  const rodar = () => { sincronizar({ aoMudar }).then(aoMudar); };

  window.addEventListener('online', rodar);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') rodar();
  });

  rodar();

  return () => window.removeEventListener('online', rodar);
}
