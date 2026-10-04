import { invokeEdgeFunction } from "@/lib/edgeFunctions";

// Envio de e-mail transacional.
//
// Esta função NUNCA lança. Foi por isso que o e-mail chegou a ficar desligado:
// o chamado era criado, o Resend recusava, a exceção subia e a tela dizia
// "Erro ao criar chamado". Quem tentava de novo duplicava o registro.
//
// Agora a falha volta como dado, não como exceção. Quem chama decide o que
// fazer — normalmente mostrar um aviso e seguir com o que já foi gravado.
//
// Se o retorno vier com `enviado: false` e um motivo citando 403 ou "domain",
// é a conta do Resend sem domínio verificado: nesse estado ela só entrega para
// o e-mail do dono da conta. A correção é verificar um domínio em
// resend.com/domains e apontar o secret EMAIL_FROM para um endereço dele.
export async function notificarPorEmail({ to, subject, body }) {
  const destino = String(to || "").trim();
  if (!destino) return { enviado: false, motivo: "sem destinatário" };
  if (!subject || !body) return { enviado: false, motivo: "mensagem incompleta" };

  try {
    const resposta = await invokeEdgeFunction("send-email", { to: destino, subject, body });
    if (resposta?.error) return { enviado: false, motivo: resposta.error };
    return { enviado: true, resposta };
  } catch (erro) {
    console.error("[notificarPorEmail] falhou:", erro);
    return { enviado: false, motivo: erro?.message || "falha ao enviar" };
  }
}

// Traduz o erro cru do Resend para algo que o operador entenda e saiba
// resolver, em vez de mostrar um 403 sem contexto.
export function explicarFalhaDeEmail(motivo) {
  const texto = String(motivo || "");
  if (/403|domain is not verified|not verified|testing emails/i.test(texto)) {
    return "O Resend está sem domínio verificado, então só entrega para o e-mail dono da conta. "
      + "Verifique um domínio em resend.com/domains e aponte o secret EMAIL_FROM para ele.";
  }
  if (/RESEND_API_KEY/i.test(texto)) {
    return "Falta a RESEND_API_KEY nos secrets das Edge Functions.";
  }
  if (/422|invalid.*email|validation/i.test(texto)) {
    return "O Resend recusou o endereço de e-mail. Confira se está escrito certo.";
  }
  return texto;
}
