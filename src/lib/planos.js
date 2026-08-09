// Descrição dos planos para a página de Planos e para as telas de bloqueio.
//
// Este arquivo diz o que o cliente VÊ. Quem grava o que ele efetivamente
// recebe é supabase/functions/_shared/stripe.ts, no webhook do Stripe. Os dois
// rodam em runtimes diferentes (navegador e Deno) e não dá para importar um do
// outro — mexeu aqui, confira lá.

export const ILIMITADO = 999999;

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
      'Até 40 chamados por mês',
      'Até 20 clientes',
      'Cadastro de equipamentos',
      '1 técnico',
      'PMOC de 1 cliente',
      'Fecha chamado com foto e assinatura, mesmo sem internet',
    ],
    naoInclui: ['Agenda', 'Orçamentos', 'QR Code', 'Financeiro', 'Estoque', 'Ponto eletrônico'],
  },
  {
    id: 'basic',
    nome: 'Basic',
    preco: 'R$ 29,90/mês',
    valor: 29.9,
    resumo: 'Para quem passou do volume do Free',
    tecnicos: 1,
    destaque: false,
    inclui: [
      'Tudo do Free',
      'Chamados ilimitados',
      'Clientes ilimitados',
    ],
    naoInclui: ['Agenda', 'Orçamentos', 'QR Code', 'Financeiro', 'Estoque', 'Ponto eletrônico'],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: 'R$ 79,90/mês',
    valor: 79.9,
    resumo: 'Para a empresa que já tem contrato de PMOC',
    tecnicos: 3,
    tecnicoAdicional: 29,
    destaque: true,
    inclui: [
      'Tudo do Basic',
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
    preco: 'R$ 197/mês',
    valor: 197,
    resumo: 'Para quem tem equipe em campo e controla custo',
    tecnicos: 10,
    tecnicoAdicional: 29,
    destaque: false,
    inclui: [
      'Tudo do Profissional',
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
  pmoc: true, agenda: false, ponto_eletronico: false,
  orcamentos: false, estoque: false, qr_equipamento: false,
  financeiro: false, notas_fiscais: false, multiempresa: false,
  api: false, white_label: false,
};

const MODULOS_PROFISSIONAL = { ...MODULOS_FREE, agenda: true, orcamentos: true, qr_equipamento: true };

const MODULOS_EMPRESA = {
  ...MODULOS_PROFISSIONAL,
  ponto_eletronico: true, estoque: true,
  financeiro: true, notas_fiscais: true, multiempresa: true,
};

// O Free passa a ter teto de volume: é o que separa ele do Basic, já que os
// dois entregam exatamente os mesmos módulos.
export const LIMITE_CHAMADOS_FREE = 40;
export const LIMITE_CLIENTES_FREE = 20;

const APLICACAO_POR_PLANO = {
  free: { limite_tecnicos: 1, limite_empresas: 1, limite_chamados_mes: LIMITE_CHAMADOS_FREE, limite_clientes: LIMITE_CLIENTES_FREE, limite_clientes_pmoc: 1, modulos_ativos: MODULOS_FREE },
  basic: { limite_tecnicos: 1, limite_empresas: 1, limite_chamados_mes: ILIMITADO, limite_clientes: ILIMITADO, limite_clientes_pmoc: 1, modulos_ativos: MODULOS_FREE },
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
//
// PMOC não entra: o módulo é true em todos os planos e o que separa o Free é o
// limite de clientes com PMOC, cobrado na hora de ativar o equipamento.
export const MODULO_POR_PAGINA = {
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
