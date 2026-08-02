export const SITE_URL = "https://geradordepmoc.com.br";

export const publicPages = [
  {
    path: "/",
    title: "ClimaPro | Gest?o de PMOC, chamados e equipes de climatiza??o",
    description:
      "Organize chamados, PMOC, agenda e equipe t?cnica no ClimaPro. Registre a execu??o do servi?o e acompanhe a rotina da sua empresa.",
    eyebrow: "Gest?o de climatiza??o",
    schemaType: "WebSite",
  },
  {
    path: "/solucoes/sistema-pmoc",
    title: "Sistema PMOC para planejar e registrar manuten??es | ClimaPro",
    description:
      "Monte o cronograma anual, execute checklists por equipamento e re?na fotos, assinaturas e hist?rico das manuten??es PMOC.",
    eyebrow: "Solu??o para PMOC",
    schemaType: "WebPage",
  },
  {
    path: "/solucoes/ordem-servico-ar-condicionado",
    title: "Ordem de servi?o para ar-condicionado com fotos e assinatura | ClimaPro",
    description:
      "Abra, agende e acompanhe ordens de servi?o de ar-condicionado. A equipe registra fotos, v?deos, assinatura do cliente e status do atendimento.",
    eyebrow: "Solu??o para chamados",
    schemaType: "WebPage",
  },
  {
    path: "/para/tecnico-autonomo",
    title: "Sistema para t?cnico de ar-condicionado aut?nomo | ClimaPro",
    description:
      "Organize os chamados, agenda e registros das visitas de ar-condicionado. Comece com o plano gratuito do ClimaPro.",
    eyebrow: "Para t?cnico aut?nomo",
    schemaType: "WebPage",
  },
  {
    path: "/recursos/modelo-ordem-servico-ar-condicionado",
    title: "Modelo de ordem de servi?o para ar-condicionado | Baixe gr?tis",
    description:
      "Baixe um modelo de ordem de servi?o para manuten??o de ar-condicionado e saiba quais campos registrar no atendimento.",
    eyebrow: "Recurso gratuito",
    schemaType: "Article",
  },
  {
    path: "/recursos/checklist-manutencao-preventiva-ar-condicionado",
    title: "Checklist de manuten??o preventiva de ar-condicionado | Gr?tis",
    description:
      "Use este checklist de manuten??o preventiva de ar-condicionado para planejar a visita, registrar observa??es e orientar a rotina da equipe.",
    eyebrow: "Recurso gratuito",
    schemaType: "Article",
  },
  {
    path: "/recursos/guia-pmoc",
    title: "Guia PMOC: o que ?, quando avaliar e como organizar | ClimaPro",
    description:
      "Entenda o que ? PMOC, o que a lei prev? para ambientes climatizados e como organizar plano, execu??o e registros com revis?o t?cnica.",
    eyebrow: "Guia pr?tico",
    schemaType: "Article",
  },
  {
    path: "/recursos/calculadora-preco-pmoc",
    title: "Calculadora de pre?o de PMOC: estime custos e margem | ClimaPro",
    description:
      "Estime m?o de obra, deslocamento, insumos, custos indiretos e margem para formar uma refer?ncia de pre?o de PMOC.",
    eyebrow: "Ferramenta gratuita",
    schemaType: "WebApplication",
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
  "ordem-servico-ar-condicionado": "Ordem de servi?o",
  "tecnico-autonomo": "T?cnico aut?nomo",
  "modelo-ordem-servico-ar-condicionado": "Modelo de OS",
  "checklist-manutencao-preventiva-ar-condicionado": "Checklist de preventiva",
  "guia-pmoc": "Guia PMOC",
  "calculadora-preco-pmoc": "Calculadora de pre?o",
};

export function getBreadcrumbs(pathname) {
  const normalized = normalizePath(pathname);
  const currentSegment = normalized.split("/").filter(Boolean).at(-1);

  if (!currentSegment) return [{ name: "In?cio", path: "/" }];

  return [
    { name: "In?cio", path: "/" },
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
