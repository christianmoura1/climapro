import { tipoConteudoPermitido } from './arquivos.js';

// Sobe o arquivo para a URL assinada que a Edge Function devolveu.
// `pedirPresign` é injetado para o teste não precisar do Supabase, e para
// o app usar o mesmo helper de Edge Function que o resto.
export async function enviarParaR2(file, pedirPresign, fetchImpl = fetch) {
  if (!file || !file.size) throw new Error('O arquivo está vazio.');

  const contentType = tipoConteudoPermitido(file.type);
  if (!contentType) throw new Error('Esse tipo de arquivo não pode ser enviado.');

  const presign = await pedirPresign({
    action: 'upload',
    filename: file.name || 'arquivo',
    contentType,
    size: file.size,
  });

  if (!presign?.upload_url || !presign?.file_url) {
    throw new Error(presign?.error || 'Não consegui preparar o envio do arquivo.');
  }

  let resposta;
  try {
    resposta = await fetchImpl(presign.upload_url, {
      method: 'PUT',
      headers: presign.headers || { 'Content-Type': contentType },
      body: file,
    });
  } catch {
    throw new Error('Não consegui falar com o armazenamento. Se isso começou depois da troca, confira o CORS do bucket.');
  }

  if (!resposta?.ok) {
    const status = resposta?.status ? ` (resposta ${resposta.status})` : '';
    throw new Error(`Não consegui guardar o arquivo${status}. Confira o CORS do bucket.`);
  }

  return { file_url: presign.file_url, key: presign.key || null };
}
