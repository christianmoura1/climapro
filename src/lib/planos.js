// Descrição dos planos para a página de Planos e para as telas de bloqueio.
//
// Este arquivo diz o que o cliente VÊ. Quem grava o que ele efetivamente
// recebe é supabase/functions/_shared/stripe.ts, no webhook do Stripe. Os dois
// rodam em runtimes diferentes (navegador e Deno) e não dá para importar um do
// outro — mexeu aqui, confira lá.

export const ILIMITADO = 999999;

// Ciclos de cobrança.
//
// O preço de tabela é o ANUAL — é ele que aparece na propaganda e é para ele
// que a conta fecha. O mensal custa 20% mais caro, que é o preço de pagar
// parcelado. Os dois valores são escritos à mão em cada plano, e não
// calculados, porque preço com dois decimais quebrados ("R$ 47,88") faz a
// pessoa desconfiar; todos terminam em ,90 de propósito.
export function mensalidadeNoAnual(plano) {
  return plano?.valorAnualMes || 0;
}

// O que sai do bolso de uma vez quando escolhe o anual.
export function valorAnual(plano) {
  return mensalidadeNoAnual(plano) * 12;
}

export function economiaAnual(plano) {
  if (!plano?.valor || !plano?.valorAnualMes) return 0;
  return (plano.valor - plano.valorAnualMes) * 12;
}

export function percentualDesconto(plano) {
  if (!plano?.valor || !plano?.valorAnualMes) return 0;
  return Math.round((1 - plano.valorAnualMes / plano.valor) * 100);
}

// Número que vai no seletor Mensal/Anual, acima dos cartões. Usa o menor
// desconto da tabela para a promessa valer para qualquer plano que a pessoa
// escolher depois.
export function descontoDoAnual() {
  const descontos = PLANOS.filter((p) => p.valor > 0).map(percentualDesconto);
  return descontos.length ? Math.min(...descontos) : 0;
}

export function reais(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Rótulo de cada módulo, usado nas telas de bloqueio ("o módulo Estoque está
// disponível a partir do plano Empresa").
export const NOME_MODULO = {
  chamados: 'Chamados',
  clientes: 'Clientes',
  equipamentos: 'Equipamentos',
  tecnicos: 'Técnicos',
  pmoc: 'PMOC',
  agenda: 'Agenda',
  orcamentos: 'Orçamentos',
  qr_equipamento: 'QR Code por equipamento',
  ponto_eletronico: 'Ponto eletrônico',
  estoque: 'Estoque',
  financeiro: 'Financeiro',
  notas_fiscais: 'Notas Fiscais',
  multiempresa: 'Multiempresa',
};

export const PLANOS = [
  {
    id: 'free',
    nome: 'Free',
    preco: 'Gratuito',
    valor: 0,
    resumo: 'Para experimentar e sair do caderno',
    tecnicos: 1,
    destaque: false,
    inclui: [
      'Até 10 chamados por mês',
      'Até 10 clientes',
      'Cadastro de equipamentos',
      '1 técnico',
      'Fecha chamado com foto e assinatura, mesmo sem internet',
    ],
    naoInclui: ['PMOC', 'Agenda', 'Orçamentos', 'QR Code', 'Financeiro', 'Estoque', 'Ponto eletrônico'],
  },
  {
    id: 'basic',
    nome: 'Basic',
    preco: 'R$ 47,90/mês',
    valor: 47.9,
    valorAnualMes: 39.9,
    resumo: 'Para quem passou do volume do Free',
    tecnicos: 1,
    destaque: false,
    herda: 'Free',
    inclui: [
      'Chamados ilimitados',
      'Clientes ilimitados',
      'PMOC de 2 clientes, com cronograma e caderno de manutenção',
    ],
    naoInclui: ['Agenda', 'Orçamentos', 'QR Code', 'Financeiro', 'Estoque', 'Ponto eletrônico'],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: 'R$ 95,90/mês',
    valor: 95.9,
    valorAnualMes: 79.9,
    resumo: 'Para a empresa que já tem contrato de PMOC',
    tecnicos: 3,
    tecnicoAdicional: 29,
    destaque: true,
    herda: 'Basic',
    inclui: [
      'PMOC ilimitado, com cronograma anual e caderno de manutenção',
      'Até 3 técnicos (adicional R$ 29/mês cada)',
      'Agenda com Google Calendar',
      'Orçamento com aprovação e assinatura do cliente por link',
      'QR Code por equipamento',
    ],
    naoInclui: ['Financeiro', 'Estoque', 'Ponto eletrônico', 'Multiempresa'],
  },
  {
    id: 'empresa',
    nome: 'Empresa',
    preco: 'R$ 236,90/mês',
    valor: 236.9,
    valorAnualMes: 197,
    resumo: 'Para quem tem equipe em campo e controla custo',
    tecnicos: 10,
    tecnicoAdicional: 29,
    destaque: false,
    herda: 'Profissional',
    inclui: [
      'Até 10 técnicos (adicional R$ 29/mês cada)',
      'Financeiro com entradas, saídas e relatórios',
      'Estoque de peças com custo médio',
      'Ponto eletrônico',
      'Multiempresa',
      'Registro de notas fiscais',
    ],
    naoInclui: [],
  },
];

// Planos que não são mais vendidos, mas podem estar gravados em alguma
// empresa. Servem só para a tela não quebrar ao exibir o plano atual.
export const PLANOS_DESCONTINUADOS = {
  essencial: 'Essencial (descontinuado)',
  corporativo: 'Corporativo (descontinuado)',
  enterprise: 'Enterprise',
};

export function planoPorId(id) {
  return PLANOS.find((p) => p.id === id) || null;
}

export function nomeDoPlano(id) {
  return planoPorId(id)?.nome || PLANOS_DESCONTINUADOS[id] || 'Free';
}

// Menor plano que entrega o módulo pedido. Usado na tela de bloqueio para
// dizer a partir de qual plano o recurso existe.
export function planoQueLibera(modulo) {
  const porModulo = {
    pmoc: 'basic',
    agenda: 'profissional',
    orcamentos: 'profissional',
    qr_equipamento: 'profissional',
    ponto_eletronico: 'empresa',
    estoque: 'empresa',
    financeiro: 'empresa',
    notas_fiscais: 'empresa',
    multiempresa: 'empresa',
  };
  return planoPorId(porModulo[modulo]) || null;
}

// Menor plano que tira o teto de volume. O Free é o único com limite de
// chamados e clientes, então quem estourar é sempre convidado para o Basic.
export function planoQueLiberaVolume() {
  return planoPorId('basic');
}

// Espelho do que o webhook grava (supabase/functions/_shared/stripe.ts). Serve
// ao painel admin, que troca o plano de uma empresa na mão, sem passar pelo
// Stripe. Sem isso o admin gravaria o plano e deixaria os módulos como
// estavam, que é o bug que esta rodada de mudanças veio corrigir.
const MODULOS_FREE = {
  chamados: true, clientes: true, equipamentos: true, tecnicos: true,
  pmoc: false, agenda: false, ponto_eletronico: false,
  orcamentos: false, estoque: false, qr_equipamento: false,
  financeiro: false, notas_fiscais: false, multiempresa: false,
  api: false, white_label: false,
};

// PMOC é o que o Basic entrega além do volume. No Free a tela fica fechada:
// deixar montar o cronograma inteiro para barrar na hora de ligar o primeiro
// equipamento é pior do que dizer não na porta.
const MODULOS_BASIC = { ...MODULOS_FREE, pmoc: true };

const MODULOS_PROFISSIONAL = { ...MODULOS_BASIC, agenda: true, orcamentos: true, qr_equipamento: true };

const MODULOS_EMPRESA = {
  ...MODULOS_PROFISSIONAL,
  ponto_eletronico: true, estoque: true,
  financeiro: true, notas_fiscais: true, multiempresa: true,
};

// Teto do Free. Enxuto de propósito: ele serve para a pessoa ver o fluxo
// rodando com os clientes reais dela, não para tocar a empresa de graça.
export const LIMITE_CHAMADOS_FREE = 10;
export const LIMITE_CLIENTES_FREE = 10;

const APLICACAO_POR_PLANO = {
  free: { limite_tecnicos: 1, limite_empresas: 1, limite_chamados_mes: LIMITE_CHAMADOS_FREE, limite_clientes: LIMITE_CLIENTES_FREE, limite_clientes_pmoc: 0, modulos_ativos: MODULOS_FREE },
  basic: { limite_tecnicos: 1, limite_empresas: 1, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: 2, modulos_ativos: MODULOS_BASIC },
  profissional: { limite_tecnicos: 3, limite_empresas: 1, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: ILIMITADO, modulos_ativos: MODULOS_PROFISSIONAL },
  empresa: { limite_tecnicos: 10, limite_empresas: 3, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: ILIMITADO, modulos_ativos: MODULOS_EMPRESA },
  enterprise: { limite_tecnicos: ILIMITADO, limite_empresas: ILIMITADO, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: ILIMITADO, modulos_ativos: { ...MODULOS_EMPRESA, api: true, white_label: true } },
  essencial: { limite_tecnicos: 3, limite_empresas: 1, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: ILIMITADO, modulos_ativos: MODULOS_PROFISSIONAL },
  corporativo: { limite_tecnicos: 10, limite_empresas: 3, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: ILIMITADO, modulos_ativos: MODULOS_EMPRESA },
};

// Campos a gravar na empresa ao mudar o plano manualmente.
export function aplicacaoDoPlano(planoId) {
  const base = APLICACAO_POR_PLANO[planoId] || APLICACAO_POR_PLANO.free;
  return { plano: planoId, ...base };
}

// Página → módulo que ela exige. Aplicado nas rotas em PrivateApplication.jsx.
// Páginas fora deste mapa são abertas para qualquer plano.
export const MODULO_POR_PAGINA = {
  PMOC: 'pmoc',
  Agenda: 'agenda',
  Orcamentos: 'orcamentos',
  Estoque: 'estoque',
  PontoEletronico: 'ponto_eletronico',
  Financeiro: 'financeiro',
  NotasFiscais: 'notas_fiscais',
};

export function ehIlimitado(valor) {
  return Number(valor) >= ILIMITADO;
}

export function formatarLimite(valor) {
  return ehIlimitado(valor) ? 'ilimitado' : String(valor ?? 0);
}
