// Permissão da agenda no cadastro do técnico. Os valores batem com o check
// da coluna tecnico.agenda_permissao (migration 0031).

export const PERMISSOES_AGENDA = ['nenhum', 'ver', 'editar'];

export const ROTULO_AGENDA = {
  nenhum: 'Sem acesso',
  ver: 'Ver',
  editar: 'Ver e editar',
};

// Cadastro antigo, ou resposta de antes da migration, conta como 'ver': é o
// default da coluna. Quem deve ficar de fora precisa estar gravado como 'nenhum'.
export function normalizarAgendaPermissao(valor) {
  return PERMISSOES_AGENDA.includes(valor) ? valor : 'ver';
}

export function podeVerAgenda(valor) {
  const permissao = normalizarAgendaPermissao(valor);
  return permissao === 'ver' || permissao === 'editar';
}

export function podeEditarAgenda(valor) {
  return normalizarAgendaPermissao(valor) === 'editar';
}
