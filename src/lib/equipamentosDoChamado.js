// Vínculo entre chamado e equipamento.
//
// O chamado guarda isso em dois lugares: `equipamento_id` (um só, do tempo em
// que um chamado era sempre de um aparelho) e `equipamentos_ids` (array, para
// a manutenção que passa em vários de uma vez). Toda tela que filtra histórico
// precisa olhar os dois, e essa regra estava copiada em seis lugares.
//
// Quando faltou o campo no formulário da empresa, 213 dos 215 chamados nasceram
// sem vínculo nenhum e o histórico por equipamento ficou vazio para todo mundo.
// Centralizar aqui é o que impede a próxima tela de esquecer um dos lados.

// Todos os equipamentos de um chamado, sem repetir.
export function idsDoChamado(chamado) {
  if (!chamado) return [];
  const doArray = Array.isArray(chamado.equipamentos_ids) ? chamado.equipamentos_ids : [];
  const todos = [chamado.equipamento_id, ...doArray].filter(Boolean);
  return [...new Set(todos)];
}

// O chamado passou neste equipamento?
export function chamadoTemEquipamento(chamado, equipamentoId) {
  if (!equipamentoId) return false;
  return idsDoChamado(chamado).includes(equipamentoId);
}

// Os dois campos a gravar. `equipamento_id` recebe o primeiro porque muita
// tela e a Edge Function pública ainda leem só ele; o array é a verdade.
export function vinculoDeEquipamentos(ids = []) {
  const limpos = [...new Set(ids.filter(Boolean))];
  return {
    equipamentos_ids: limpos,
    equipamento_id: limpos[0] ?? null,
  };
}

// Chamados de um equipamento, na ordem em que vieram.
export function chamadosDoEquipamento(chamados = [], equipamentoId) {
  return chamados.filter((c) => chamadoTemEquipamento(c, equipamentoId));
}
