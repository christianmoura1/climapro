// Envio de e-mail desligado.
//
// A conta do Resend não tem domínio verificado, então ela só entrega para o
// dono da conta. Na prática nenhum técnico e nenhum cliente recebia nada, e a
// tentativa ainda derrubava a operação: o chamado era criado, o e-mail falhava,
// a tela dizia "Erro ao criar chamado" e quem tentasse de novo duplicava.
//
// Em vez de tentar e falhar, não se tenta. Os avisos que importam já aparecem
// no sino de notificações, dentro do sistema.
//
// Para religar: apagar o `return` abaixo. Antes disso, verificar um domínio em
// resend.com/domains e apontar o secret EMAIL_FROM para um endereço dele —
// sem isso volta tudo a falhar.
//
// eslint-disable-next-line no-unused-vars
export async function notificarPorEmail({ to, subject, body }) {
  return { enviado: false, motivo: 'envio de e-mail desligado' };
}
