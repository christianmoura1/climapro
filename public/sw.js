// Service worker do ClimaPro.
//
// O objetivo é um só: o técnico em campo (casa de máquinas, subsolo, laje de
// shopping) conseguir abrir o app e fechar o chamado sem rede. A fila de
// sincronização das ações fica em src/lib/outbox.js — aqui só tratamos de
// deixar o app carregar.
//
// Regra que não pode ser quebrada: nada de API vai para cache. Dado de negócio
// velho servido como se fosse atual é pior que erro de rede, porque o técnico
// não tem como perceber.

const VERSAO = 'climapro-v1';
const CACHE_APP = `${VERSAO}-app`;
const CACHE_ASSETS = `${VERSAO}-assets`;

// Shell do app autenticado, gerado pelo scripts/prerender.mjs. É para onde o
// vercel.json aponta todas as rotas privadas.
const SHELL = '/__app';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then((cache) => cache.addAll([SHELL]))
      .catch(() => {
        // Primeira instalação sem rede: segue sem o shell, o runtime resolve.
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((nome) => !nome.startsWith(VERSAO)).map((nome) => caches.delete(nome))
      ))
      .then(() => self.clients.claim())
  );
});

// Permite que a página force a ativação de um SW novo sem esperar o reload.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function ehAssetComHash(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/assets/');
}

function ehNavegacao(request) {
  return request.mode === 'navigate';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só GET entra em qualquer estratégia de cache. POST/PATCH/DELETE são
  // escritas: passam direto e, se falharem, quem trata é a outbox.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase (REST, Auth, Storage, Edge Functions) e qualquer outra origem:
  // deixa passar sem tocar. Nunca cacheia dado de negócio.
  if (url.origin !== self.location.origin) return;

  // Assets com hash no nome são imutáveis: cache primeiro, rede só se faltar.
  if (ehAssetComHash(url)) {
    event.respondWith(
      caches.match(request).then((emCache) => emCache || fetch(request).then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_ASSETS).then((cache) => cache.put(request, copia));
        }
        return resposta;
      }))
    );
    return;
  }

  // Navegação: rede primeiro, para que um deploy novo apareça de imediato.
  // Sem rede, devolve o que estiver em cache e, em último caso, o shell.
  if (ehNavegacao(request)) {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(CACHE_APP).then((cache) => cache.put(request, copia));
          }
          return resposta;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_APP);
          return (await cache.match(request))
            || (await cache.match(SHELL))
            || new Response(
              '<!doctype html><meta charset="utf-8"><title>Sem conexão</title>'
              + '<body style="font-family:system-ui;padding:2rem;text-align:center">'
              + '<h1>Sem conexão</h1><p>Abra o app novamente quando o sinal voltar.</p></body>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        })
    );
    return;
  }

  // Demais GETs da própria origem (ícone, manifest, imagem estática):
  // rede primeiro com cache de reserva.
  event.respondWith(
    fetch(request)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_ASSETS).then((cache) => cache.put(request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(request))
  );
});
