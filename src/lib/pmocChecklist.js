// PMOC dinâmico: cada equipamento tem sua própria periodicidade de ciclo
// profundo (bimestral/trimestral/semestral/anual), mas TODO equipamento ativo
// no PMOC recebe uma checagem mensal básica — é o mínimo exigido pela
// Portaria GM 3.523 (limpeza de filtros + inspeção). O ciclo profundo se soma
// à visita do mês em que vence.

export const PERIODICIDADES_PMOC = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'];

export const LABEL_PERIODICIDADE = {
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

export const CHECKLIST_MENSAL_BASE = [
  'Limpeza de filtros',
  'Inspeção visual do equipamento',
  'Verificação de drenos',
  'Inspeção elétrica básica',
  'Teste de funcionamento',
];

// Itens adicionais só do nível do ciclo profundo daquele equipamento — não
// cumulativo entre níveis (cada equipamento tem uma única periodicidade).
export const CHECKLIST_CICLO_PROFUNDO = {
  mensal: [],
  bimestral: [
    'Medição de amperagem',
  ],
  trimestral: [
    'Medição de amperagem',
    'Verificação de pressões do sistema',
    'Limpeza de condensador',
  ],
  semestral: [
    'Medição de amperagem e tensão',
    'Verificação de pressões do sistema',
    'Limpeza de evaporadora e condensadora',
    'Lubrificação de motores',
    'Verificação de isolamento térmico',
  ],
  anual: [
    'Medição de amperagem, tensão e resistência',
    'Verificação completa de pressões',
    'Limpeza profunda de evaporadora e condensadora',
    'Lubrificação de componentes móveis',
    'Verificação de isolamento térmico',
    'Verificação e carga de gás refrigerante',
    'Teste de vazamentos',
    'Verificação de dispositivos de segurança',
    'Emissão de laudo técnico',
  ],
};

// Soma dias/meses a uma data-base conforme a periodicidade. dataBase pode ser
// string (yyyy-mm-dd / ISO) ou Date; retorna Date.
export function calcularProximaManutencao(dataBase, periodicidade) {
  const base = dataBase ? new Date(dataBase) : new Date();
  const proxima = new Date(base);
  switch (periodicidade) {
    case 'mensal':
      proxima.setMonth(proxima.getMonth() + 1);
      break;
    case 'bimestral':
      proxima.setMonth(proxima.getMonth() + 2);
      break;
    case 'trimestral':
      proxima.setMonth(proxima.getMonth() + 3);
      break;
    case 'semestral':
      proxima.setMonth(proxima.getMonth() + 6);
      break;
    case 'anual':
      proxima.setFullYear(proxima.getFullYear() + 1);
      break;
    default:
      proxima.setMonth(proxima.getMonth() + 1);
  }
  return proxima;
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

// 'em_dia' | 'vence_em_breve' (<=7 dias) | 'atrasado' | 'nunca_executado'
export function statusManutencao(proximaManutencao) {
  if (!proximaManutencao) return 'nunca_executado';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const proxima = new Date(proximaManutencao);
  proxima.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((proxima - hoje) / UM_DIA_MS);
  if (diasRestantes < 0) return 'atrasado';
  if (diasRestantes <= 7) return 'vence_em_breve';
  return 'em_dia';
}

export const STATUS_MANUTENCAO_CONFIG = {
  em_dia: { label: 'Em dia', cor: 'bg-green-100 text-green-800 border-green-200' },
  vence_em_breve: { label: 'Vence em breve', cor: 'bg-amber-100 text-amber-800 border-amber-200' },
  atrasado: { label: 'Atrasado', cor: 'bg-red-100 text-red-800 border-red-200' },
  nunca_executado: { label: 'Nunca executado', cor: 'bg-muted text-muted-foreground border-border' },
};

const INTERVALO_MESES_PMOC = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };

function mod(a, b) {
  return ((a % b) + b) % b;
}

// Âncora do ciclo profundo daquele equipamento: usa a próxima manutenção já
// calculada quando existe (ela é sempre congruente, módulo a periodicidade,
// com todas as datas futuras corretas do ciclo — não importa se já ficou no
// passado em relação ao ano exibido), senão cai para última manutenção /
// instalação / hoje.
function dataReferenciaCiclo(equipamento) {
  if (equipamento?.proxima_manutencao) return new Date(equipamento.proxima_manutencao);
  if (equipamento?.ultima_manutencao) return new Date(equipamento.ultima_manutencao);
  if (equipamento?.data_instalacao) return new Date(equipamento.data_instalacao);
  return new Date();
}

// O Plano Anual de Manutenção que a Portaria GM 3.523 / NBR 16401 exigem: os
// 12 meses do ano-calendário informado, marcando em quais este equipamento
// tem, além da checagem mensal obrigatória (todo mês, todo equipamento
// ativo), o ciclo profundo próprio dele (troca de gás, teste elétrico
// completo, etc.) previsto.
export function gerarCronogramaAnual(equipamento, ano = new Date().getFullYear()) {
  const periodicidade = equipamento?.periodicidade_pmoc || 'mensal';
  const intervaloMeses = INTERVALO_MESES_PMOC[periodicidade] || 1;
  const referencia = dataReferenciaCiclo(equipamento);
  const mesesReferencia = referencia.getFullYear() * 12 + referencia.getMonth();

  return Array.from({ length: 12 }, (_, i) => {
    const mesesAtual = ano * 12 + i;
    const cicloProfundo = mod(mesesAtual - mesesReferencia, intervaloMeses) === 0;
    return { mes: i + 1, data: new Date(ano, i, 1), cicloProfundo };
  });
}

// Próximas `quantidade` visitas mensais a partir do mês de `apartirDe`, em
// janela corrida (não presa ao ano-calendário) — usado para popular a Agenda
// com antecedência real, independente de quando o equipamento entrou no PMOC.
export function gerarProximasVisitas(equipamento, quantidade = 12, apartirDe = new Date()) {
  const periodicidade = equipamento?.periodicidade_pmoc || 'mensal';
  const intervaloMeses = INTERVALO_MESES_PMOC[periodicidade] || 1;
  const referencia = dataReferenciaCiclo(equipamento);
  const mesesReferencia = referencia.getFullYear() * 12 + referencia.getMonth();
  const inicio = new Date(apartirDe.getFullYear(), apartirDe.getMonth(), 1);

  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    const mesesAtual = data.getFullYear() * 12 + data.getMonth();
    const cicloProfundo = mod(mesesAtual - mesesReferencia, intervaloMeses) === 0;
    return { data, cicloProfundo };
  });
}

// Monta o checklist completo de uma visita para um equipamento: sempre a base
// mensal + os itens do ciclo profundo quando ele está vencendo/vencido.
export function checklistParaEquipamento(equipamento, hoje = new Date()) {
  const periodicidade = equipamento?.periodicidade_pmoc || 'mensal';
  const cicloProfundoDevido =
    periodicidade === 'mensal' ||
    !equipamento?.proxima_manutencao ||
    new Date(equipamento.proxima_manutencao) <= hoje;

  const itensMensal = CHECKLIST_MENSAL_BASE.map((descricao) => ({
    descricao,
    concluido: false,
    observacao: '',
  }));
  const itensCicloProfundo = cicloProfundoDevido
    ? (CHECKLIST_CICLO_PROFUNDO[periodicidade] || []).map((descricao) => ({
        descricao,
        concluido: false,
        observacao: '',
      }))
    : [];

  return { itensMensal, itensCicloProfundo, cicloProfundoDevido };
}
