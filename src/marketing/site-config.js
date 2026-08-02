export const SITE_URL = "https://geradordepmoc.com.br";

export const publicPages = [
  {
    path: "/",
    title: "ClimaPro | Gestão de PMOC, chamados e equipes de climatização",
    description:
      "Organize chamados, PMOC, agenda e equipe técnica no ClimaPro. Registre a execução do serviço e acompanhe a rotina da sua empresa.",
    eyebrow: "Gestão de climatização",
    schemaType: "WebSite",
  },
  {
    path: "/solucoes/sistema-pmoc",
    title: "Sistema PMOC para planejar e registrar manutenções | ClimaPro",
    description:
      "Monte o cronograma anual, execute checklists por equipamento e reúna fotos, assinaturas e histórico das manutenções PMOC.",
    eyebrow: "Solução para PMOC",
    schemaType: "WebPage",
  },
  {
    path: "/solucoes/ordem-servico-ar-condicionado",
    title: "Ordem de serviço para ar-condicionado com fotos e assinatura | ClimaPro",
    description:
      "Abra, agende e acompanhe ordens de serviço de ar-condicionado. A equipe registra fotos, vídeos, assinatura do cliente e status do atendimento.",
    eyebrow: "Solução para chamados",
    schemaType: "WebPage",
  },
  {
    path: "/para/tecnico-autonomo",
    title: "Sistema para técnico de ar-condicionado autônomo | ClimaPro",
    description:
      "Organize os chamados, agenda e registros das visitas de ar-condicionado. Comece com o plano gratuito do ClimaPro.",
    eyebrow: "Para técnico autônomo",
    schemaType: "WebPage",
  },
  {
    path: "/recursos/modelo-ordem-servico-ar-condicionado",
    title: "Modelo de ordem de serviço para ar-condicionado | Baixe grátis",
    description:
      "Baixe um modelo de ordem de serviço para manutenção de ar-condicionado e saiba quais campos registrar no atendimento.",
    eyebrow: "Recurso gratuito",
    schemaType: "Article",
  },
  {
    path: "/recursos/checklist-manutencao-preventiva-ar-condicionado",
    title: "Checklist de manutenção preventiva de ar-condicionado | Grátis",
    description:
      "Use este checklist de manutenção preventiva de ar-condicionado para planejar a visita, registrar observações e orientar a rotina da equipe.",
    eyebrow: "Recurso gratuito",
    schemaType: "Article",
  },
  {
    path: "/recursos/guia-pmoc",
    title: "Guia PMOC: o que é, quando avaliar e como organizar | ClimaPro",
    description:
      "Entenda o que é PMOC, o que a lei prevê para ambientes climatizados e como organizar plano, execução e registros com revisão técnica.",
    eyebrow: "Guia prático",
    schemaType: "Article",
  },
  {
    path: "/recursos/calculadora-preco-pmoc",
    title: "Calculadora de preço de PMOC: estime custos e margem | ClimaPro",
    description:
      "Estime mão de obra, deslocamento, insumos, custos indiretos e margem para formar uma referência de preço de PMOC.",
    eyebrow: "Ferramenta gratuita",
    schemaType: "WebApplication",
  },
  {
    path: "/pmoc/curitiba",
    title: "PMOC em Curitiba: guia e sistema para empresas | ClimaPro",
    description: "Entenda o PMOC em Curitiba e organize clientes, equipamentos, cronograma, checklist, fotos e assinaturas em um sistema para climatização.",
    eyebrow: "PMOC em Curitiba",
    schemaType: "WebPage",
    areaServed: ["Curitiba", "São José dos Pinhais", "Pinhais", "Colombo", "Araucária"],
  },
  {
    path: "/pmoc/sao-paulo",
    title: "PMOC em São Paulo: guia e sistema de gestão | ClimaPro",
    description: "Saiba como funciona o PMOC em São Paulo e controle contratos, equipes, equipamentos, cronogramas e evidências de manutenção no ClimaPro.",
    eyebrow: "PMOC em São Paulo",
    schemaType: "WebPage",
    areaServed: ["São Paulo", "Guarulhos", "Osasco", "Santo André", "São Bernardo do Campo"],
  },
  {
    path: "/pmoc/vitoria-vila-velha",
    title: "PMOC em Vitória e Vila Velha ES: guia e sistema | ClimaPro",
    description: "Entenda o PMOC em Vitória e Vila Velha e organize equipamentos, agenda, checklist, fotos e assinaturas da equipe de climatização.",
    eyebrow: "PMOC em Vitória e Vila Velha",
    schemaType: "WebPage",
    areaServed: ["Vitória", "Vila Velha", "Serra", "Cariacica", "Viana", "Guarapari"],
  },
];

export const publicPaths = new Set(publicPages.map((page) => page.path));

export function normalizePath(pathname = "/") {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function isMarketingPath(pathname) {
  const normalized = normalizePath(pathname);
  return publicPaths.has(normalized) || normalized === "/LandingPage";
}

export function getPublicPage(pathname) {
  const normalized = normalizePath(pathname);
  return publicPages.find((page) => page.path === normalized) ?? publicPages[0];
}

export function canonicalUrl(pathname) {
  const normalized = normalizePath(pathname);
  return `${SITE_URL}${normalized === "/" ? "" : normalized}`;
}

const labels = {
  "sistema-pmoc": "Sistema PMOC",
  "ordem-servico-ar-condicionado": "Ordem de serviço",
  "tecnico-autonomo": "Técnico autônomo",
  "modelo-ordem-servico-ar-condicionado": "Modelo de OS",
  "checklist-manutencao-preventiva-ar-condicionado": "Checklist de preventiva",
  "guia-pmoc": "Guia PMOC",
  "calculadora-preco-pmoc": "Calculadora de preço",
  curitiba: "PMOC em Curitiba",
  "sao-paulo": "PMOC em São Paulo",
  "vitoria-vila-velha": "PMOC em Vitória e Vila Velha",
};

export function getBreadcrumbs(pathname) {
  const normalized = normalizePath(pathname);
  const currentSegment = normalized.split("/").filter(Boolean).at(-1);

  if (!currentSegment) return [{ name: "Início", path: "/" }];

  return [
    { name: "Início", path: "/" },
    { name: labels[currentSegment] ?? currentSegment, path: normalized },
  ];
}

export function structuredDataFor(page) {
  const canonical = canonicalUrl(page.path);
  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "ClimaPro",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
  };

  if (page.path === "/") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        organization,
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          name: "ClimaPro",
          url: SITE_URL,
          inLanguage: "pt-BR",
          description: page.description,
          publisher: { "@id": `${SITE_URL}/#organization` },
        },
      ],
    };
  }

  const breadcrumbs = getBreadcrumbs(page.path);
  const pageNode = {
    "@type": page.schemaType,
    "@id": `${canonical}#page`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "pt-BR",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  if (page.areaServed) {
    pageNode.about = {
      "@type": "SoftwareApplication",
      name: "ClimaPro",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      areaServed: page.areaServed.map((name) => ({ "@type": "City", name })),
    };
  }

  if (page.schemaType === "Article") {
    pageNode.dateModified = "2026-08-02";
    pageNode.author = { "@id": `${SITE_URL}/#organization` };
  }

  if (page.schemaType === "WebApplication") {
    pageNode.applicationCategory = "BusinessApplication";
    pageNode.operatingSystem = "Web browser";
    pageNode.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "ClimaPro",
        url: SITE_URL,
        inLanguage: "pt-BR",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      pageNode,
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: canonicalUrl(item.path),
        })),
      },
    ],
  };
}
