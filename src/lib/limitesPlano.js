// Mensagens dos tetos de volume do plano.
//
// A regra de verdade está no banco (gatilhos em `chamado` e `cliente`,
// migration 0017), porque chamado nasce por quatro caminhos diferentes e
// conferir em cada tela deixaria buraco. O que mora aqui é a tradução: avisar
// antes de tentar, e transformar o erro cru do Postgres em algo que o usuário
// entenda quando ele escapar do aviso.

export function chamadosDoMes(chamados = [], referencia = new Date()) {
  return chamados.filter((c) => {
    const data = new Date(c.data_abertura || c.created_at);
    if (Number.isNaN(data.getTime())) return false;
    return data.getFullYear() === referencia.getFullYear()
      && data.getMonth() === referencia.getMonth();
  }).length;
}

// O gatilho levanta a exceção com um prefixo próprio para dar para reconhecer
// aqui sem depender do texto todo.
export function mensagemDeLimite(erro) {
  const texto = String(erro?.message || '');
  if (texto.includes('LIMITE_CHAMADOS')) {
    return 'Você atingiu o limite de chamados do mês no plano Free. O plano Basic, por R$ 29,90/mês, tira esse teto.';
  }
  if (texto.includes('LIMITE_CLIENTES')) {
    return 'Você atingiu o limite de clientes do plano Free. O plano Basic, por R$ 29,90/mês, tira esse teto.';
  }
  return null;
}
