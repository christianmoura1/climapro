import {
  LIMITE_CHAMADOS_FREE,
  LIMITE_CLIENTES_FREE,
  PLANOS,
  aplicacaoDoPlano,
  ehIlimitado,
  planoQueLibera,
} from "../src/lib/planos.js";
import { SITE_URL, canonicalUrl, publicPages } from "../src/marketing/site-config.js";

const downloads = [
  {
    path: "/downloads/modelo-ordem-servico-ar-condicionado.doc",
    title: "Modelo de ordem de serviço editável (.doc)",
    description: "Arquivo para registrar cliente, equipamento, diagnóstico, serviço, peças, valores, evidências e aceite.",
  },
  {
    path: "/downloads/modelo-ordem-servico-ar-condicionado.html",
    title: "Modelo de ordem de serviço para imprimir",
    description: "Versão HTML do mesmo modelo, para preencher à mão ou salvar como PDF pelo navegador.",
  },
  {
    path: "/downloads/checklist-manutencao-preventiva-ar-condicionado.csv",
    title: "Checklist de manutenção preventiva (.csv)",
    description: "Lista editável para a visita de preventiva de ar-condicionado.",
  },
  {
    path: "/downloads/checklist-manutencao-preventiva-ar-condicionado.html",
    title: "Checklist de manutenção preventiva para imprimir",
    description: "Versão HTML do checklist, para usar em campo ou salvar como PDF.",
  },
];

function reais(valor) {
  const [inteiro, centavos] = (Math.round(valor * 100) / 100).toFixed(2).split(".");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${comMilhar},${centavos}`;
}

function quantidade(valor, singular, plural, ilimitado) {
  if (ehIlimitado(valor)) return ilimitado;
  const numero = Number(valor) || 0;
  if (numero === 0) return `nenhum ${singular}`;
  return `${numero} ${numero === 1 ? singular : plural}`;
}

function precoDoPlano(plano) {
  if (!plano.valor) return "gratuito (R$ 0)";
  const anual = plano.valorAnualMes * 12;
  return `${reais(plano.valor)}/mês, ou ${reais(plano.valorAnualMes)}/mês no plano anual (${reais(anual)} cobrados uma vez por ano)`;
}

function limites(plano) {
  const gravado = aplicacaoDoPlano(plano.id);
  return [
    quantidade(gravado.limite_chamados_mes, "chamado por mês", "chamados por mês", "chamados ilimitados por mês"),
    quantidade(gravado.limite_clientes, "cliente", "clientes", "clientes ilimitados"),
    quantidade(gravado.limite_clientes_pmoc, "cliente com PMOC", "clientes com PMOC", "clientes com PMOC ilimitados"),
    quantidade(gravado.limite_tecnicos, "técnico incluso", "técnicos inclusos", "técnicos ilimitados"),
    quantidade(gravado.limite_empresas, "empresa", "empresas", "empresas ilimitadas"),
  ].join(", ");
}

function linhasDoPlano(plano) {
  const linhas = [
    `- **${plano.nome}** — ${precoDoPlano(plano)}. ${plano.resumo}.`,
    `  Limites: ${limites(plano)}.`,
  ];
  if (plano.tecnicoAdicional) {
    linhas.push(`  Técnico adicional: ${reais(plano.tecnicoAdicional)}/mês.`);
  }
  const herda = plano.herda ? `Inclui o plano ${plano.herda} e mais: ` : "Inclui: ";
  linhas.push(`  ${herda}${plano.inclui.join("; ")}.`);
  if (plano.naoInclui?.length) {
    linhas.push(`  Ainda não entra neste plano: ${plano.naoInclui.join("; ")}.`);
  }
  return linhas;
}

function introducao() {
  return [
    "# ClimaPro",
    "",
    "> Software brasileiro de gestão da manutenção em climatização e refrigeração. Organiza chamados, PMOC, equipamentos, orçamentos e a rotina de quem está em campo.",
    "",
    `O ClimaPro em ${SITE_URL} é um SaaS para técnicos autônomos, empresas de climatização e gestores de hotéis, condomínios e redes. A interface está em português do Brasil e o uso é pelo navegador.`,
    "",
    "Este produto não é o aplicativo polonês chamado Clima Pro. Também não é um serviço de dados climáticos ou ambientais: não fornece previsão do tempo, série histórica de clima nem monitoramento ambiental.",
    "",
    `No plano Free o teto é de ${LIMITE_CHAMADOS_FREE} chamados por mês e ${LIMITE_CLIENTES_FREE} clientes, com 1 técnico. O preço de tabela dos planos pagos é o anual. O mensal é a cobrança de quem prefere pagar mês a mês. Valores em reais (BRL).`,
    "",
  ].join("\n");
}

function paginas() {
  return [
    "## Páginas públicas",
    "",
    ...publicPages.map(
      (page) => `- [${page.title}](${canonicalUrl(page.path)}): ${page.description}`,
    ),
    "",
  ].join("\n");
}

function arquivos() {
  return [
    "## Arquivos gratuitos",
    "",
    ...downloads.map(
      (item) => `- [${item.title}](${SITE_URL}${item.path}): ${item.description}`,
    ),
    "",
  ].join("\n");
}

function opcional() {
  return [
    "## Opcional",
    "",
    `- [Descrição completa](${SITE_URL}/llms-full.txt): planos, limites, módulos e páginas com o texto inteiro.`,
    `- [Sitemap](${SITE_URL}/sitemap.xml): as mesmas páginas públicas, com data de atualização.`,
    `- [Robots](${SITE_URL}/robots.txt): rastreio liberado para buscadores e para bots de IA. Painéis logados ficam de fora.`,
    `- [Criar conta](${SITE_URL}/InitialChoice): o plano Free não pede cartão.`,
    `- [Entrar](${SITE_URL}/Login): acesso de quem já tem conta.`,
    `- [WhatsApp](https://wa.me/5541992572743): conversa para operação com mais técnicos do que o plano Empresa inclui.`,
    "",
  ].join("\n");
}

function modulos() {
  const chaves = [
    "pmoc",
    "agenda",
    "orcamentos",
    "qr_equipamento",
    "estoque",
    "financeiro",
    "ponto_eletronico",
    "notas_fiscais",
    "multiempresa",
  ];
  const pmocNoBasic = aplicacaoDoPlano("basic").limite_clientes_pmoc;

  return chaves.map((chave) => {
    const plano = planoQueLibera(chave);
    const nome = {
      pmoc: "PMOC (Lei nº 13.589/2018), com cronograma anual e caderno de manutenção",
      agenda: "Agenda, com integração ao Google Calendar",
      orcamentos: "Orçamento com aprovação e assinatura do cliente por link",
      qr_equipamento: "QR Code por equipamento",
      estoque: "Estoque de peças com custo médio",
      financeiro: "Financeiro, com entradas, saídas e relatórios",
      ponto_eletronico: "Ponto eletrônico",
      notas_fiscais: "Registro de notas fiscais",
      multiempresa: "Multiempresa",
    }[chave];
    const detalhe = chave === "pmoc"
      ? ` No ${plano?.nome || "Basic"} são ${pmocNoBasic} clientes; no Profissional em diante, o PMOC fica ilimitado.`
      : "";
    return `- ${nome}: a partir do plano ${plano?.nome || "pago"}.${detalhe}`;
  });
}

export function llmsTxt() {
  return [
    introducao().trimEnd(),
    "",
    "## Planos e preços",
    "",
    ...PLANOS.flatMap((plano) => linhasDoPlano(plano)),
    "",
    paginas().trimEnd(),
    "",
    arquivos().trimEnd(),
    "",
    opcional().trimEnd(),
    "",
  ].join("\n");
}

export function llmsFullTxt() {
  return [
    introducao().trimEnd(),
    "",
    "## O que o sistema faz",
    "",
    "Chamados e ordem de serviço acompanham o atendimento do pedido até a revisão da empresa. O encerramento registra foto e assinatura de quem acompanhou a visita.",
    "",
    "O PMOC segue a Lei nº 13.589/2018, que trata de edifícios de uso público e coletivo com ambientes climatizados artificialmente. O ClimaPro monta cronograma, checklist por equipamento e histórico. O conteúdo técnico e a conformidade do caso ficam com o profissional habilitado. O sistema não substitui o responsável técnico e não emite laudo, ART ou TRT.",
    "",
    "Equipamentos ficam ligados ao cliente. No plano que inclui QR Code, a etiqueta abre a ficha da máquina. O orçamento, quando o plano inclui, segue por um link para o cliente aprovar e assinar. Agenda, estoque, financeiro, ponto e notas entram nos planos indicados abaixo.",
    "",
    "Há portal do técnico, para executar a visita, e portal do cliente, para acompanhar o que a empresa já revisou. Página de equipamento por QR Code e link de orçamento são públicos só para quem recebe o endereço. Eles não aparecem no sitemap.",
    "",
    "Quem usa de graça tem chamados, clientes, equipamentos e um técnico, dentro dos tetos do Free. Os módulos abaixo abrem a partir do plano citado:",
    "",
    ...modulos(),
    "",
    "## Para quem é",
    "",
    "- Técnico autônomo de ar-condicionado e refrigeração que documenta a visita sem carregar papel.",
    "- Empresa de climatização com equipe de campo e contrato de manutenção.",
    "- Gestor de hotel, condomínio ou rede que precisa ver o registro do PMOC. A manutenção continua com uma empresa do ramo. O ClimaPro é onde esse registro fica.",
    "",
    "## Planos e preços",
    "",
    "Os limites abaixo são os que o produto aplica na conta. Chamado acima do teto do mês e cliente acima do teto são recusados.",
    "",
    ...PLANOS.flatMap((plano) => linhasDoPlano(plano)),
    "",
    "## O que o ClimaPro não é",
    "",
    "- Não é o aplicativo polonês chamado Clima Pro.",
    "- Não é produto de dados climáticos, meteorologia ou meio ambiente.",
    "- Não presta o serviço de manutenção nem indica prestador.",
    "- Não garante conformidade com a vigilância sanitária. O registro ajuda. A avaliação é do responsável técnico.",
    "",
    paginas().trimEnd(),
    "",
    arquivos().trimEnd(),
    "",
    opcional().trimEnd(),
    "",
  ].join("\n");
}
