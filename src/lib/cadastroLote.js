// Cadastro de equipamento em lote.
//
// Existe por um número: a Gelax tem 117 clientes e 108 deles sem nenhum
// equipamento. Cadastrar um por vez, com treze campos, é trabalho demais para
// alguém fazer no fim do expediente — e um hotel de 80 quartos tem umas 90
// evaporadoras, o que torna o cadastro unitário inviável de vez.
//
// A ideia: o que é igual (tipo, marca, modelo, capacidade, periodicidade) você
// preenche uma vez; o que muda de máquina para máquina é só a localização.

// Teto de segurança. Quem digitar 1 a 99999 na faixa erra a mão, e criar
// noventa mil linhas no banco por engano é pior do que recusar.
export const MAXIMO_POR_LOTE = 300;

// "Quarto", 101, 120 -> ["Quarto 101", "Quarto 102", ... "Quarto 120"]
//
// Serve para hotel, onde a numeração de quarto é sequencial, e para prédio
// comercial ("Sala 12" a "Sala 30").
export function expandirFaixa({ prefixo = '', de, ate }) {
  const inicio = Number(de);
  const fim = Number(ate);
  if (!Number.isInteger(inicio) || !Number.isInteger(fim)) return [];
  if (inicio > fim) return [];
  if (fim - inicio + 1 > MAXIMO_POR_LOTE) return [];

  const base = String(prefixo).trim();
  const lista = [];
  for (let n = inicio; n <= fim; n++) {
    lista.push(base ? `${base} ${n}` : String(n));
  }
  return lista;
}

// Uma localização por linha. Linha em branco some; espaço nas pontas some.
//
// Duplicata é mantida de propósito: um saguão pode ter dois splits, e as duas
// linhas "Recepção" são dois equipamentos de verdade.
export function parseLocalizacoes(texto) {
  return String(texto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

// AC- + 7 -> "AC-007". Sem prefixo, devolve só o número com o mesmo preenchimento.
export function numeroDoEquipamento(prefixo, n) {
  const numero = String(n).padStart(3, '0');
  const base = String(prefixo || '').trim();
  return base ? `${base}${numero}` : numero;
}

// Monta as linhas que vão para o banco.
//
// `comum` é o que se repete. `localizacoes` é a lista. O resultado é o que a
// tela mostra na prévia e o que o bulkCreate grava, sem diferença entre os
// dois — o usuário confere exatamente o que vai ser criado.
export function montarEquipamentos({
  comum = {},
  localizacoes = [],
  prefixoNumero = '',
  numeroInicial = 1,
}) {
  const inicio = Number.isInteger(Number(numeroInicial)) ? Number(numeroInicial) : 1;

  return localizacoes.slice(0, MAXIMO_POR_LOTE).map((localizacao, indice) => ({
    ...comum,
    numero_equipamento: numeroDoEquipamento(prefixoNumero, inicio + indice),
    localizacao,
  }));
}

// O que impede de gravar. Devolve lista de motivos, vazia quando está tudo
// certo — a tela mostra todos de uma vez em vez de um por clique.
export function validarLote({ comum = {}, localizacoes = [] }) {
  const erros = [];
  if (!comum.cliente_id) erros.push('Escolha o cliente.');
  if (!comum.tipo) erros.push('Escolha o tipo de equipamento.');
  if (!String(comum.marca || '').trim()) erros.push('Preencha a marca.');
  if (!String(comum.modelo || '').trim()) erros.push('Preencha o modelo.');
  if (localizacoes.length === 0) erros.push('Adicione pelo menos uma localização.');
  if (localizacoes.length > MAXIMO_POR_LOTE) {
    erros.push(`São ${localizacoes.length} localizações e o limite por lote é ${MAXIMO_POR_LOTE}. Divida em duas levas.`);
  }
  return erros;
}
