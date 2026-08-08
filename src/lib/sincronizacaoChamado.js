import { base44 } from "@/api/base44Client";
import { registrarHandler } from "@/lib/outbox";

export const ACAO_FINALIZAR_CHAMADO = 'finalizar_chamado';

// Sobe os arquivos que ainda são Blob/File e devolve as URLs. Itens que já
// vieram como string são URLs de um envio anterior que subiu antes da rede
// cair — reaproveita em vez de duplicar no Storage.
async function subirArquivos(arquivos = []) {
  const urls = [];
  for (const arquivo of arquivos) {
    if (typeof arquivo === 'string') {
      urls.push(arquivo);
      continue;
    }
    const { file_url } = await base44.integrations.Core.UploadFile({ file: arquivo });
    urls.push(file_url);
  }
  return urls;
}

// Executa a finalização inteira: upload de fotos, vídeos e assinatura, depois
// o update do chamado e o log. Serve tanto para o envio imediato quanto para o
// reenvio a partir da outbox — é o mesmo caminho, o que evita os dois
// comportarem diferente.
export async function finalizarChamado(payload) {
  const {
    chamadoId,
    empresa_id,
    user_id,
    user_email,
    nome_cliente_confirmacao,
    observacoes_finalizacao,
    fotos,
    videos,
    assinatura,
    data_finalizacao,
  } = payload;

  const [fotosUrls, videosUrls, assinaturaUrls] = await Promise.all([
    subirArquivos(fotos),
    subirArquivos(videos),
    subirArquivos(assinatura ? [assinatura] : []),
  ]);

  await base44.entities.Chamado.update(chamadoId, {
    status: 'aguardando_aprovacao_empresa',
    data_finalizacao: data_finalizacao || new Date().toISOString(),
    fotos_finalizacao: fotosUrls,
    videos_finalizacao: videosUrls,
    nome_cliente_confirmacao,
    assinatura_cliente: assinaturaUrls[0] || null,
    observacoes_tecnico: observacoes_finalizacao,
  });

  // O log não pode derrubar a finalização: se ele falhar, o chamado já foi
  // atualizado e reenfileirar duplicaria o update.
  try {
    await base44.entities.LogAcao.create({
      empresa_id,
      user_id,
      user_email,
      tipo_usuario: 'tecnico',
      acao: `Finalizou o chamado com ${fotosUrls.length} foto(s) e ${videosUrls.length} vídeo(s). Cliente confirmou: ${nome_cliente_confirmacao}. Aguardando aprovação da empresa.`,
      entidade_afetada: 'Chamado',
      entidade_id: chamadoId,
      data_hora: new Date().toISOString(),
    });
  } catch (erro) {
    console.error('[sincronizacaoChamado] falha ao registrar log:', erro);
  }

  return { fotosUrls, videosUrls };
}

registrarHandler(ACAO_FINALIZAR_CHAMADO, finalizarChamado);
