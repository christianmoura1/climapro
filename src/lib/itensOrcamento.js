// Catálogo de itens comuns de climatização e refrigeração, usado como sugestão
// (datalist) no formulário de orçamento. Não é uma lista fechada: o campo
// continua aceitando texto livre, porque cada empresa nomeia serviço do seu
// jeito e sempre aparece algo fora do catálogo.
//
// A ordem dentro de cada grupo é a de uso, não alfabética — o que mais se
// orça aparece primeiro.

export const SERVICOS_LIMPEZA = [
  'Higienização completa de split (evaporadora + condensadora)',
  'Higienização de evaporadora',
  'Higienização de condensadora',
  'Limpeza química de serpentina',
  'Limpeza de dreno',
  'Desentupimento de dreno',
  'Troca de filtro de ar',
];

export const SERVICOS_MANUTENCAO = [
  'Manutenção preventiva (PMOC)',
  'Manutenção corretiva',
  'Visita técnica para diagnóstico',
  'Detecção de vazamento de gás',
  'Teste de estanqueidade',
  'Vácuo no sistema',
  'Recolhimento de gás refrigerante',
  'Solda em tubulação de cobre',
  'Medição de amperagem e tensão',
  'Laudo técnico',
];

export const SERVICOS_INSTALACAO = [
  'Instalação de split até 12.000 BTUs',
  'Instalação de split de 18.000 a 24.000 BTUs',
  'Instalação de split de 30.000 a 60.000 BTUs',
  'Instalação de ar-condicionado de janela',
  'Instalação de multi split',
  'Desinstalação de equipamento',
  'Remanejamento de equipamento',
  'Instalação de tubulação frigorígena (metro)',
  'Instalação de linha de dreno (metro)',
  'Instalação de suporte para condensadora',
  'Instalação de ponto elétrico / tomada',
  'Instalação de bomba de dreno',
  'Passagem de infraestrutura em alvenaria',
];

export const SERVICOS_CARGA_GAS = [
  'Carga de gás R-410A',
  'Carga de gás R-32',
  'Carga de gás R-22',
  'Complemento de carga de gás',
];

export const SERVICOS_TROCA = [
  'Troca de compressor',
  'Troca de capacitor',
  'Troca de placa eletrônica',
  'Troca de motor do ventilador',
  'Troca de hélice do ventilador',
  'Troca de turbina da evaporadora',
  'Troca de sensor de temperatura',
  'Troca de filtro secador',
  'Troca de válvula de expansão',
  'Troca de válvula de serviço',
  'Troca de contatora',
  'Troca de placa display',
  'Troca de controle remoto',
];

export const PECAS = [
  'Compressor',
  'Capacitor',
  'Placa eletrônica',
  'Motor do ventilador',
  'Hélice do ventilador',
  'Turbina da evaporadora',
  'Sensor de temperatura',
  'Filtro secador',
  'Válvula de expansão',
  'Válvula de serviço',
  'Contatora',
  'Disjuntor',
  'Controle remoto',
  'Bomba de dreno',
  'Filtro de ar',
  'Placa display',
];

export const MATERIAIS = [
  'Tubo de cobre (metro)',
  'Isolamento térmico (metro)',
  'Cabo PP (metro)',
  'Mangueira de dreno (metro)',
  'Fita PVC',
  'Suporte para condensadora',
  'Canaleta / acabamento (metro)',
  'Gás R-410A (kg)',
  'Gás R-32 (kg)',
  'Gás R-22 (kg)',
  'Nitrogênio para teste',
  'Material elétrico diverso',
];

export const OUTROS = [
  'Mão de obra (hora técnica)',
  'Taxa de deslocamento',
  'Locação de andaime',
  'Locação de plataforma elevatória',
];

// Lista achatada para o <datalist>. Sem duplicatas: alguns nomes aparecem tanto
// como serviço de troca quanto como peça avulsa.
export const ITENS_ORCAMENTO = [...new Set([
  ...SERVICOS_LIMPEZA,
  ...SERVICOS_MANUTENCAO,
  ...SERVICOS_INSTALACAO,
  ...SERVICOS_CARGA_GAS,
  ...SERVICOS_TROCA,
  ...PECAS,
  ...MATERIAIS,
  ...OUTROS,
])];
