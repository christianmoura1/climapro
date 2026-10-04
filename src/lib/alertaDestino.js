// Para onde cada alerta leva.
//
// Alerta que só avisa vira reclamação: o valor está em abrir direto no
// registro de que ele fala. "Equipamento repetindo defeito" tem que abrir
// AQUELE equipamento, não a lista com 56 deles.
//
// Ordem de precisão: equipamento é mais específico que cliente, cliente é
// mais específico que a página do tipo. Usa o primeiro que existir.

// Página genérica por tipo, usada quando o alerta não aponta para um registro.
export const PAGINA_POR_TIPO = {
  pmoc_atrasado: 'PMOC',
  pmoc_proximo: 'PMOC',
  equipamento_recorrente: 'Equipamentos',
  orcamento_parado: 'Orcamentos',
  cliente_sumido: 'Clientes',
  visita_agendada: 'PMOC',
  orcamento_aguardando_voce: 'Orcamentos',
  relatorio_disponivel: 'Chamados',
};

export function destinoDoAlerta(alerta) {
  if (!alerta) return '/Dashboard';

  if (alerta.equipamento_id) {
    return `/EquipamentoDetalhes?id=${encodeURIComponent(alerta.equipamento_id)}`;
  }

  // Orçamento ainda não tem tela de detalhe com link direto; a lista é o
  // melhor destino hoje, e o cliente junto ajuda a achar na lista.
  if (alerta.orcamento_id) {
    return '/Orcamentos';
  }

  if (alerta.cliente_id) {
    return `/Clientes?cliente=${encodeURIComponent(alerta.cliente_id)}`;
  }

  const pagina = PAGINA_POR_TIPO[alerta.tipo];
  return pagina ? `/${pagina}` : '/Dashboard';
}
