// PMOC dinâmico: cada equipamento tem sua própria periodicidade de ciclo
// profundo (bimestral/trimestral/semestral/anual), mas TODO equipamento ativo
// no PMOC recebe uma checagem mensal básica — é o mínimo exigido pela
// Portaria GM 3.523 (limpeza de filtros + inspeção). O ciclo profundo se soma
// à visita do mês em que vence.

// Níveis oferecidos no plano — bimestral existe só como legado (equipamentos
// antigos podem ter esse valor salvo), não entra mais na escada nem nos
// seletores.
export const PERIODICIDADES_PMOC = ['mensal', 'trimestral', 'semestral', 'anual'];

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

// Datas vindas do banco como "yyyy-mm-dd" precisam ser interpretadas no fuso
// LOCAL: `new Date("2026-01-01")` assume meia-noite UTC, que no Brasil
// (UTC-3) ainda é 31/dez — o mês recuaria 1 e todo o cronograma deslocaria.
function parseDataLocal(valor) {
  if (valor instanceof Date) return valor;
  if (typeof valor === 'string') {
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(valor);
}

// Âncora do ciclo profundo daquele equipamento: `ciclo_ancora_pmoc` é a
// âncora explícita — o mês em que o usuário escolheu que o ciclo profundo
// cai, direto na tela do Plano Anual (redefine o padrão do ano inteiro a
// partir dali, não é uma exceção isolada daquele mês). Sem âncora explícita,
// cai para próxima/última manutenção já registrada, depois instalação, senão
// hoje.
function dataReferenciaCiclo(equipamento) {
  if (equipamento?.ciclo_ancora_pmoc) return parseDataLocal(equipamento.ciclo_ancora_pmoc);
  if (equipamento?.proxima_manutencao) return parseDataLocal(equipamento.proxima_manutencao);
  if (equipamento?.ultima_manutencao) return parseDataLocal(equipamento.ultima_manutencao);
  if (equipamento?.data_instalacao) return parseDataLocal(equipamento.data_instalacao);
  return new Date();
}

// Escada completa do PMOC: TODOS os níveis rodam juntos — mensal todo mês,
// trimestral a cada 3, semestral a cada 6 e anual 1x/ano. Cada mês recebe o
// rótulo do ciclo mais profundo que vence nele. Do mais profundo para o mais
// raso, para o find() pegar o certo em meses onde vários coincidem (ex: mês
// 6 é divisível por 3 e 6 → semestral).
const NIVEIS_ESCADA_PMOC = [
  { intervalo: 12, periodicidade: 'anual' },
  { intervalo: 6, periodicidade: 'semestral' },
  { intervalo: 3, periodicidade: 'trimestral' },
];

// Periodicidade efetiva de um equipamento num mês específico: a distância em
// meses desde a âncora (mês em que cai o ciclo ANUAL) determina o nível.
export function periodicidadeDoMes(equipamento, data = new Date()) {
  const referencia = dataReferenciaCiclo(equipamento);
  const mesesReferencia = referencia.getFullYear() * 12 + referencia.getMonth();
  const mesesAtual = data.getFullYear() * 12 + data.getMonth();
  const offset = mod(mesesAtual - mesesReferencia, 12);
  const nivel = NIVEIS_ESCADA_PMOC.find((n) => offset % n.intervalo === 0);
  const periodicidade = nivel ? nivel.periodicidade : 'mensal';
  return { periodicidade, cicloProfundo: periodicidade !== 'mensal' };
}

// Âncora (yyyy-mm-01) que faz a periodicidade escolhida cair no mês escolhido:
// recua o intervalo daquele nível, de modo que o mês vira exatamente aquele
// degrau da escada — e todos os outros meses se reposicionam juntos (ex:
// Trimestral em Março → Fev/Abr bimestrais, Jun semestral, Dez anual).
export function ancoraParaEscolha(ano, mesIndex0, periodicidade) {
  const intervalo = INTERVALO_MESES_PMOC[periodicidade] || 1;
  const d = new Date(ano, mesIndex0 - intervalo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// O Plano Anual de Manutenção que a Portaria GM 3.523 / NBR 16401 exigem: os
// 12 meses do ano-calendário informado, cada um já pré-preenchido com o nível
// da escada que vence nele — mensais, bimestrais, trimestrais, semestral e
// anual, tudo no mesmo ano, automaticamente.
export function gerarCronogramaAnual(equipamento, ano = new Date().getFullYear()) {
  return Array.from({ length: 12 }, (_, i) => {
    const data = new Date(ano, i, 1);
    return { mes: i + 1, data, ...periodicidadeDoMes(equipamento, data) };
  });
}

// Próximas `quantidade` visitas mensais a partir do mês de `apartirDe`, em
// janela corrida (não presa ao ano-calendário) — usado para popular a Agenda
// com antecedência real, independente de quando o equipamento entrou no PMOC.
export function gerarProximasVisitas(equipamento, quantidade = 12, apartirDe = new Date()) {
  const inicio = new Date(apartirDe.getFullYear(), apartirDe.getMonth(), 1);
  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    return { data, ...periodicidadeDoMes(equipamento, data) };
  });
}

// Monta o checklist completo de uma visita para um equipamento no mês de
// `hoje`: sempre a base mensal + os itens da periodicidade efetiva daquele
// mês específico.
export function checklistParaEquipamento(equipamento, hoje = new Date()) {
  const { periodicidade, cicloProfundo: cicloProfundoDevido } = periodicidadeDoMes(equipamento, hoje);

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
