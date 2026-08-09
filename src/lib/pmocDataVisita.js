// Data da visita do PMOC.
//
// O cronograma anual sabe o mês de cada visita e a periodicidade que vence
// nele; aqui entra o dia. A regra é uma só: todo mês a visita cai no mesmo dia
// naquele cliente, e a empresa pode remarcar um mês específico sem mexer nos
// outros.
//
// Funções puras de propósito — a mesma conta roda na página do PMOC, no painel
// do técnico, no portal do cliente e no documento impresso, e todos precisam
// mostrar a mesma data.

// "yyyy-mm-dd" do banco precisa virar data no fuso LOCAL. `new Date("2026-09-10")`
// é meia-noite UTC, que no Brasil ainda é dia 9 — a visita apareceria um dia
// antes na tela.
export function parseDataLocal(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(valor);
}

export function formatarISO(data) {
  const d = data instanceof Date ? data : parseDataLocal(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function chaveMes(ano, mes0) {
  return `${ano}-${String(mes0 + 1).padStart(2, '0')}`;
}

// Dia do mês em que as visitas daquele cliente caem. Sem escolha explícita,
// usa o dia do cadastro: espalha os clientes pelo mês em vez de empilhar todos
// no mesmo dia, e é estável (não muda sozinho de um mês para o outro).
export function diaVisitaDoCliente(cliente) {
  if (cliente?.dia_execucao_pmoc) return Number(cliente.dia_execucao_pmoc);
  const cadastro = parseDataLocal(cliente?.created_at);
  if (cadastro && !Number.isNaN(cadastro.getTime())) return cadastro.getDate();
  return 10;
}

// Cliente sem dia escolhido tem um dia derivado do cadastro, e a tela precisa
// dizer isso — senão a data parece ter saído do nada.
export function temDiaDefinido(cliente) {
  return !!cliente?.dia_execucao_pmoc;
}

function ultimoDiaDoMes(ano, mes0) {
  return new Date(ano, mes0 + 1, 0).getDate();
}

// Índice das exceções por mês, montado uma vez e reusado em toda a grade.
// Aceita a lista crua vinda de `PmocAgendamento.filter(...)`.
export function indexarAgendamentos(agendamentos = []) {
  const indice = {};
  for (const a of agendamentos) {
    const mes = parseDataLocal(a.mes_referencia);
    if (!mes) continue;
    indice[chaveMes(mes.getFullYear(), mes.getMonth())] = a;
  }
  return indice;
}

// Mesmo índice, um por cliente — para telas que listam vários clientes de uma
// vez (painel do técnico, agenda da empresa) sem uma consulta por cliente.
export function indexarAgendamentosPorCliente(agendamentos = []) {
  const porCliente = {};
  for (const a of agendamentos) {
    if (!porCliente[a.cliente_id]) porCliente[a.cliente_id] = [];
    porCliente[a.cliente_id].push(a);
  }
  return Object.fromEntries(
    Object.entries(porCliente).map(([id, lista]) => [id, indexarAgendamentos(lista)])
  );
}

// Data da visita de um mês: a exceção daquele mês, se existir; senão o dia fixo
// do cliente, encurtado quando o mês não tem aquele dia (dia 31 em fevereiro
// vira 28/29).
// `ano`/`mes0` acompanham o retorno porque a visita remarcada pode cair em
// outro mês: quem for editá-la de novo precisa mirar o mês de referência, não
// o mês da data.
export function dataVisitaDoMes(cliente, ano, mes0, indiceAgendamentos = {}) {
  const excecao = indiceAgendamentos[chaveMes(ano, mes0)];
  if (excecao?.data_visita) {
    return {
      data: parseDataLocal(excecao.data_visita),
      remarcada: true,
      observacao: excecao.observacao || '',
      ano,
      mes0,
    };
  }
  const dia = Math.min(diaVisitaDoCliente(cliente), ultimoDiaDoMes(ano, mes0));
  return { data: new Date(ano, mes0, dia), remarcada: false, observacao: '', ano, mes0 };
}

// As 12 visitas do ano-calendário, na mesma ordem da grade do cronograma.
export function visitasDoAno(cliente, ano, indiceAgendamentos = {}) {
  return Array.from({ length: 12 }, (_, mes0) => dataVisitaDoMes(cliente, ano, mes0, indiceAgendamentos));
}

// Programação de PMOC de uma empresa, montada a partir dos EQUIPAMENTOS com
// pmoc_ativo — não das linhas da tabela `pmoc`.
//
// A linha de `pmoc` é só um cabeçalho, e ela só nasce quando alguém aperta
// "Executar PMOC" pela primeira vez. Enquanto isso não acontecia, o técnico e o
// cliente não viam programação nenhuma: o painel do técnico filtrava por
// `tecnico_responsavel_id`, campo que nada no sistema preenche, e o portal do
// cliente listava linhas de `pmoc` que ainda não existiam. Quem sabe que existe
// visita marcada é o equipamento no plano, então é dele que a lista sai.
// Situação real da rodada do mês.
//
// O status da linha `pmoc` não serve para isso: quando a empresa aprova, ele
// volta para 'aguardando_execucao' de propósito, para o ciclo seguinte. Quem
// guarda o que aconteceu é o registro da execução (`manutencao_pmoc`), então é
// dele que a situação sai — e só conta a execução do mês da visita, senão a
// rodada de agosto ficaria marcada como feita por causa da de julho.
export function situacaoDaRodada(manutencoesDoCliente = [], mesDaVisita = new Date()) {
  const doMes = manutencoesDoCliente
    .filter((m) => {
      const referencia = parseDataLocal(m.data_execucao || m.created_at);
      if (!referencia || Number.isNaN(referencia.getTime())) return false;
      return referencia.getFullYear() === mesDaVisita.getFullYear()
        && referencia.getMonth() === mesDaVisita.getMonth();
    })
    .sort((a, b) => new Date(b.data_execucao || b.created_at) - new Date(a.data_execucao || a.created_at));

  return {
    situacao: doMes[0]?.status || 'aguardando_execucao',
    execucaoDoMes: doMes[0] || null,
  };
}

export function montarProgramacaoPMOC({ clientes = [], equipamentos = [], pmocs = [], agendamentos = [], manutencoes = [], hoje = new Date() }) {
  const porCliente = {};
  for (const eq of equipamentos) {
    if (!eq.pmoc_ativo) continue;
    if (!porCliente[eq.cliente_id]) porCliente[eq.cliente_id] = [];
    porCliente[eq.cliente_id].push(eq);
  }

  const indicePorCliente = indexarAgendamentosPorCliente(agendamentos);

  return Object.entries(porCliente)
    .map(([clienteId, equipamentosDoCliente]) => {
      const cliente = clientes.find((c) => c.id === clienteId);
      if (!cliente) return null;

      const doCliente = manutencoes.filter((m) => m.cliente_id === clienteId);
      const ordenadas = [...doCliente].sort(
        (a, b) => new Date(b.data_execucao || b.created_at) - new Date(a.data_execucao || a.created_at)
      );

      return {
        cliente,
        equipamentos: equipamentosDoCliente,
        pmoc: pmocs.find((p) => p.cliente_id === clienteId) || null,
        visita: proximaVisita(cliente, indicePorCliente[clienteId] || {}, hoje),
        ...situacaoDaRodada(doCliente, hoje),
        ultimaExecucao: ordenadas[0] || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.visita?.data || 0) - (b.visita?.data || 0));
}

// Próxima visita a partir de hoje: a deste mês se ainda não passou, senão a do
// mês seguinte. Olha 13 meses à frente para não devolver null em dezembro.
export function proximaVisita(cliente, indiceAgendamentos = {}, hoje = new Date()) {
  const referencia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  for (let i = 0; i < 13; i++) {
    const alvo = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const visita = dataVisitaDoMes(cliente, alvo.getFullYear(), alvo.getMonth(), indiceAgendamentos);
    if (visita.data >= referencia) return visita;
  }
  return null;
}
