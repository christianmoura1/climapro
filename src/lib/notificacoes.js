import { base44 } from "@/api/base44Client";

// Aviso por e-mail é efeito colateral, não a operação.
//
// O chamado era criado, o e-mail para o técnico falhava e a mutation inteira
// caía em erro. A tela dizia "Erro ao criar chamado. Tente novamente." com o
// chamado já gravado no banco — e quem tentasse de novo criava um duplicado.
// Mesmo desenho estava em execução de PMOC, aprovação, ponto e financeiro.
//
// Aqui a falha do aviso vira log e a operação segue. Quem depende do e-mail
// para existir (enviar relatório, mandar a ordem de serviço para o cliente)
// continua chamando SendEmail direto, porque ali o erro precisa aparecer.
export async function notificarPorEmail({ to, subject, body }) {
  if (!to) return { enviado: false, motivo: 'sem destinatário' };

  try {
    await base44.integrations.Core.SendEmail({ to, subject, body });
    return { enviado: true };
  } catch (erro) {
    console.warn('[notificação] e-mail não enviado:', erro?.message || erro);
    return { enviado: false, motivo: erro?.message || 'falha no envio' };
  }
}
