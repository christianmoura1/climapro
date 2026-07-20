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
