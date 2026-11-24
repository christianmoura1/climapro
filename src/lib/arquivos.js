// Reexporta as regras puras (caminho, URL, migração) e acrescenta a chave
// que só existe no build do Vite: qual armazenamento o navegador usa.
export {
  TAMANHO_MAXIMO_PADRAO,
  TABELAS_ARQUIVO,
  tipoConteudoPermitido,
  sanitizarNomeArquivo,
  chaveSegura,
  chavePermitida,
  montarChave,
  chaveMigrada,
  chaveOrfa,
  normalizarBasePublica,
  urlPublicaR2,
  chaveDeReferenciaR2,
  referenciaSupabase,
  mapearTexto,
  reescreverValor,
  mesmoValor,
  planejarLinha,
  exporReferenciasR2,
} from '../../supabase/functions/_shared/arquivos.js';

// `supabase` (ou variável ausente) mantém o bucket attachments. `r2` passa
// pela Edge Function `arquivo`. A Vite grava o valor no build: mudar a
// variável na Vercel só vale depois de um deploy novo.
export function provedorStorage(explicito) {
  let valor = explicito;
  if (valor == null || valor === '') {
    try {
      valor = import.meta.env.VITE_STORAGE_PROVIDER;
    } catch {
      valor = '';
    }
  }
  return String(valor || '').trim().toLowerCase() === 'r2' ? 'r2' : 'supabase';
}
