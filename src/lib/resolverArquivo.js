import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { chaveDeReferenciaR2 } from '@/lib/arquivos';

const cache = new Map();

// Link http(s) e data URL seguem como estão — é o caso do Storage antigo e
// do domínio público do R2. `r2://...` vira URL assinada, pedida de novo
// quando está perto de vencer.
export async function resolverUrlArquivo(url) {
  if (typeof url !== 'string' || url === '') return url;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;

  const chave = chaveDeReferenciaR2(url);
  if (!chave) return url;

  const guardado = cache.get(chave);
  if (guardado && guardado.ate > Date.now() + 30_000) return guardado.url;

  const resposta = await invokeEdgeFunction('arquivo', { action: 'download', key: chave });
  if (!resposta?.file_url) throw new Error('Não consegui abrir o arquivo.');

  const segundos = Number(resposta.expires_in);
  const ate = Number.isFinite(segundos) && segundos > 0
    ? Date.now() + segundos * 1000
    : Date.now() + 24 * 60 * 60 * 1000;
  cache.set(chave, { url: resposta.file_url, ate });
  return resposta.file_url;
}
