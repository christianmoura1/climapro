import React from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarCheck2, Camera, CheckSquare2, ClipboardCheck, FileText, MapPin, Smartphone, Users } from "lucide-react";
import MarketingLayout from "@/marketing/components/MarketingLayout";
import { ArticleMeta, CtaBand, FaqList, FeatureGrid, Hero, LegalNote, SectionHeading, SourceLinks } from "@/marketing/components/MarketingElements";
import { getPublicPage } from "@/marketing/site-config";

const officialSources = [
  { label: "Lei nº 13.589/2018 — Presidência da República", href: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13589.htm" },
  { label: "Portaria GM/MS nº 3.523/1998 — Biblioteca Virtual em Saúde", href: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/anexo/anexo_prt3523_28_08_1998.pdf" },
  { label: "RE Anvisa nº 9/2003 — Biblioteca Virtual em Saúde", href: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2003/rdc0009_16_01_2003.html" },
];

const regions = {
  curitiba: {
    path: "/pmoc/curitiba", city: "Curitiba", state: "Paraná", code: "CWB", coordinates: "25°26′S · 49°16′O",
    eyebrow: "PMOC em Curitiba e Região Metropolitana",
    title: "PMOC em Curitiba: entenda a obrigação e organize cada visita técnica",
    description: "Quem pesquisa PMOC em Curitiba costuma estar em uma de duas situações: precisa regularizar um ambiente climatizado ou precisa organizar a execução do serviço para vários clientes. Este guia explica o ponto de partida e mostra como o ClimaPro ajuda empresas de climatização a controlar o trabalho.",
    nearby: ["São José dos Pinhais", "Pinhais", "Colombo", "Araucária"],
    localTitle: "Operações espalhadas por Curitiba e pela região metropolitana pedem uma agenda que mostre o endereço certo",
    localText: "Uma empresa pode atender uma clínica no Batel pela manhã, um escritório no Centro à tarde e deixar uma preventiva marcada em São José dos Pinhais para o dia seguinte. Quando o plano fica separado da agenda e do cadastro dos equipamentos, a equipe perde tempo procurando informações. O ClimaPro reúne cliente, endereço, equipamento, cronograma e registro da visita no mesmo fluxo.",
    audienceTitle: "Onde o PMOC aparece na rotina das empresas curitibanas",
    audiences: [
      { icon: Building2, title: "Condomínios e escritórios", description: "Cadastre unidades, ambientes e equipamentos para acompanhar o histórico de manutenção de cada local." },
      { icon: Users, title: "Clínicas, escolas e comércio", description: "Organize visitas recorrentes em ambientes de uso coletivo e mantenha os registros disponíveis para consulta." },
      { icon: ClipboardCheck, title: "Prestadores de climatização", description: "Distribua os atendimentos entre técnicos e acompanhe o que foi previsto, executado e aprovado." },
    ],
    faq: [
      { question: "O ClimaPro executa PMOC em Curitiba?", answer: "O ClimaPro é um sistema online para empresas e técnicos de climatização. Ele não presta manutenção nem substitui a contratação de uma empresa local e de um responsável técnico habilitado." },
      { question: "Posso controlar clientes de Curitiba e cidades vizinhas?", answer: "Sim. A empresa cadastra cada cliente e endereço, organiza os equipamentos e agenda as visitas. O sistema pode ser usado em Curitiba, São José dos Pinhais, Pinhais, Colombo, Araucária e em outras cidades." },
      { question: "O sistema gera um cronograma anual?", answer: "Sim. O plano anual distribui as rotinas por equipamento ao longo dos 12 meses. A periodicidade e o conteúdo técnico devem ser revisados para a instalação real." },
      { question: "Consigo registrar a execução pelo celular?", answer: "Sim. O técnico pode preencher o checklist, incluir fotos e coletar assinaturas durante a visita usando o navegador do celular." },
      { question: "Quem é responsável pelo conteúdo técnico do PMOC?", answer: "O profissional habilitado deve avaliar o sistema de climatização, definir as atividades aplicáveis e revisar os documentos conforme suas atribuições profissionais." },
    ],
  },
  "sao-paulo": {
    path: "/pmoc/sao-paulo", city: "São Paulo", state: "São Paulo", code: "SAO", coordinates: "23°33′S · 46°38′O",
    eyebrow: "PMOC em São Paulo e Grande São Paulo",
    title: "PMOC em São Paulo: controle contratos, equipes e evidências de campo",
    description: "Em São Paulo, o desafio costuma crescer com a quantidade de clientes, endereços e técnicos em circulação. Veja o que o PMOC documenta e como uma empresa de climatização pode manter cronogramas, equipamentos, fotos e assinaturas organizados sem depender de planilhas soltas.",
    nearby: ["Guarulhos", "Osasco", "Santo André", "São Bernardo do Campo"],
    localTitle: "Mais endereços e deslocamentos tornam o planejamento visível uma necessidade",
    localText: "Atender a capital, o ABC, Guarulhos e Osasco coloca várias agendas dentro da mesma operação. Um chamado atrasado ou uma preventiva esquecida afeta o cliente e ocupa a equipe com retrabalho. No ClimaPro, cada visita fica ligada ao cliente e ao equipamento, com técnico responsável, data, checklist e evidências da execução.",
    audienceTitle: "Quem usa uma rotina digital de PMOC em São Paulo",
    audiences: [
      { icon: Building2, title: "Facilities e redes com várias unidades", description: "Separe os equipamentos por cliente e local para consultar o histórico sem misturar filiais ou contratos." },
      { icon: Users, title: "Empresas com equipes externas", description: "Atribua técnicos, acompanhe chamados por status e leve a agenda para o celular de quem está em campo." },
      { icon: FileText, title: "Contratos recorrentes de manutenção", description: "Mantenha plano anual, execução e caderno de manutenção conectados ao cadastro dos equipamentos." },
    ],
    faq: [
      { question: "O ClimaPro é uma empresa que faz PMOC em São Paulo?", answer: "Não. O ClimaPro fornece o software usado por empresas e profissionais de climatização. Para executar ou elaborar o PMOC, procure uma empresa local e confirme a responsabilidade técnica necessária." },
      { question: "Dá para separar clientes da capital, ABC e Grande São Paulo?", answer: "Sim. Cada cliente mantém seus endereços, equipamentos, chamados e histórico. A agenda ajuda a visualizar os atendimentos atribuídos aos técnicos." },
      { question: "As fotos ficam vinculadas ao equipamento?", answer: "Na execução do PMOC, as fotos e o checklist são registrados por equipamento. Isso facilita entender o que foi verificado em cada visita." },
      { question: "O cliente pode assinar no local?", answer: "Sim. O fluxo aceita a assinatura do técnico e do cliente, além do nome de quem acompanhou a execução." },
      { question: "O software substitui ART, TRT ou laudo?", answer: "Não. O sistema organiza dados e documentos operacionais. ART, TRT, laudos e outras exigências dependem do caso e do profissional habilitado." },
    ],
  },
  "vitoria-vila-velha": {
    path: "/pmoc/vitoria-vila-velha", city: "Vitória e Vila Velha", state: "Espírito Santo", code: "VIX", coordinates: "20°19′S · 40°20′O",
    eyebrow: "PMOC em Vitória, Vila Velha e Grande Vitória",
    title: "PMOC em Vitória e Vila Velha: do plano anual ao registro no celular",
    description: "Empresas que atendem os dois lados da Baía de Vitória precisam conciliar clientes, travessias e visitas recorrentes. Entenda o papel do PMOC e veja como o ClimaPro organiza equipamentos, agenda, checklist, fotos e assinaturas em um único histórico.",
    nearby: ["Serra", "Cariacica", "Viana", "Guarapari"],
    localTitle: "Uma agenda única ajuda a coordenar atendimentos nos dois lados da baía",
    localText: "A mesma equipe pode ter uma manutenção em Vitória, outra em Vila Velha e contratos ativos na Serra ou em Cariacica. O deslocamento precisa entrar no planejamento, mas a informação técnica também precisa chegar completa ao celular. O ClimaPro mostra cliente, equipamento e atividade prevista antes da visita e guarda checklist, fotos e assinaturas depois da execução.",
    audienceTitle: "Rotinas de PMOC comuns na Grande Vitória",
    audiences: [
      { icon: Building2, title: "Condomínios, hotéis e comércio", description: "Organize equipamentos instalados em ambientes diferentes e consulte quando ocorreu cada manutenção." },
      { icon: CalendarCheck2, title: "Contratos entre municípios", description: "Visualize as próximas visitas de Vitória, Vila Velha, Serra e Cariacica na agenda da equipe." },
      { icon: Smartphone, title: "Técnicos em campo", description: "Abra o checklist no celular, registre evidências e conclua a visita no endereço do cliente." },
    ],
    faq: [
      { question: "O ClimaPro presta manutenção em Vitória ou Vila Velha?", answer: "O ClimaPro é uma plataforma de gestão. A execução da manutenção e a responsabilidade técnica ficam com a empresa ou o profissional contratado pelo estabelecimento." },
      { question: "Posso gerenciar clientes em toda a Grande Vitória?", answer: "Sim. O sistema funciona pela internet e permite cadastrar clientes em Vitória, Vila Velha, Serra, Cariacica, Viana, Guarapari e outras localidades." },
      { question: "A equipe consegue ver a agenda pelo celular?", answer: "Sim. Técnicos podem consultar os atendimentos e registrar a execução pelo navegador do celular, conforme as permissões configuradas pela empresa." },
      { question: "O plano anual inclui cada equipamento?", answer: "Sim. O cronograma é montado por equipamento, o que permite acompanhar periodicidades diferentes dentro do mesmo cliente." },
      { question: "O PMOC é obrigatório no Espírito Santo?", answer: "A Lei nº 13.589/2018 é federal e trata de edifícios de uso público e coletivo com ambientes climatizados artificialmente. O enquadramento e as exigências do local devem ser confirmados com um responsável técnico habilitado." },
    ],
  },
};

function RegionPanel({ region }) {
  return (
    <div className="m-region-panel" aria-label={`Área de operação em ${region.city}`}>
      <div className="m-region-panel__head"><span>{region.code}</span><small>{region.coordinates}</small></div>
      <div className="m-region-panel__route" aria-hidden="true"><span className="is-origin" /><i /><span /><i /><span /></div>
      <div className="m-region-panel__city"><MapPin aria-hidden="true" /><div><small>REGIÃO</small><strong>{region.city}</strong><span>{region.state}</span></div></div>
      <ul>{region.nearby.map((city) => <li key={city}>{city}</li>)}</ul>
      <p>Sistema online · operação organizada por endereço</p>
    </div>
  );
}

function RegionalPmocPage({ regionKey }) {
  const region = regions[regionKey];
  const page = getPublicPage(region.path);
  return (
    <MarketingLayout page={page}>
      <Hero eyebrow={region.eyebrow} title={region.title} description={region.description} primary={{ label: "Conhecer o sistema PMOC", href: "/solucoes/sistema-pmoc" }} secondary={{ label: "Ler o guia PMOC", href: "/recursos/guia-pmoc" }} notes={["Acesso pelo navegador", "Cronograma por equipamento", "Uso em campo pelo celular"]} visual={<RegionPanel region={region} />} />
      <section className="m-section m-section--paper"><div className="m-container m-reading-width"><ArticleMeta /><SectionHeading eyebrow={`Rotina local · ${region.code}`} title={region.localTitle} description={region.localText} /><p className="m-regional-copy">Se você administra um estabelecimento e procura quem faça o serviço, use este conteúdo para entender quais informações pedir no orçamento. Se você é técnico ou tem uma empresa de climatização, o ClimaPro ajuda a organizar a carteira de clientes depois que o contrato começa. A plataforma não indica prestadores nem realiza a manutenção.</p></div></section>
      <section className="m-section"><div className="m-container"><SectionHeading eyebrow="Na prática" title={region.audienceTitle} description="O PMOC precisa refletir a instalação real. O sistema entra na parte operacional: organiza o que foi planejado, o que a equipe executou e quais registros ficaram para consulta." /><FeatureGrid items={region.audiences} /></div></section>
      <section className="m-section m-section--ink"><div className="m-container m-split"><div><SectionHeading eyebrow="Antes de contratar ou executar" title="O que conferir em um PMOC" description="O escopo muda conforme os equipamentos, os ambientes e a avaliação técnica. Estes pontos ajudam a começar a conversa com o prestador ou responsável técnico." /></div><ul className="m-check-list m-check-list--light"><li><CheckSquare2 aria-hidden="true" /> Identificação dos ambientes e equipamentos</li><li><CheckSquare2 aria-hidden="true" /> Atividades e periodicidades definidas para o caso</li><li><CheckSquare2 aria-hidden="true" /> Responsável técnico e documentos aplicáveis</li><li><CheckSquare2 aria-hidden="true" /> Registro das execuções, ocorrências e correções</li><li><CheckSquare2 aria-hidden="true" /> Histórico acessível para acompanhamento</li></ul></div></section>
      <section className="m-section"><div className="m-container"><SectionHeading eyebrow="Para quem presta o serviço" title={`Como o ClimaPro apoia uma operação de PMOC em ${region.city}`} description="O cadastro do cliente dá origem ao inventário de equipamentos. A partir dele, a empresa acompanha o plano anual e a execução mensal sem redigitar os mesmos dados em documentos separados." /><FeatureGrid columns={3} items={[{ icon: CalendarCheck2, title: "Cronograma anual", description: "Visualize os 12 meses e a periodicidade prevista para cada equipamento do cliente." }, { icon: Smartphone, title: "Checklist no celular", description: "O técnico registra itens, observações e medições durante a execução da manutenção." }, { icon: Camera, title: "Fotos e assinaturas", description: "As evidências da visita ficam associadas ao registro enviado para revisão da empresa." }]} /><p className="m-regional-link-note">Quer ver o fluxo completo? Acesse a página do <Link to="/solucoes/sistema-pmoc">sistema PMOC</Link> ou faça uma estimativa na <Link to="/recursos/calculadora-preco-pmoc">calculadora de preço de PMOC</Link>.</p></div></section>
      <section className="m-section m-section--paper"><div className="m-container m-reading-width"><SectionHeading eyebrow={`Dúvidas em ${region.city}`} title="Perguntas frequentes sobre PMOC" /><FaqList items={region.faq} /><LegalNote>Este conteúdo é informativo. A legislação federal se aplica em todo o país, mas o enquadramento da instalação, as atribuições profissionais e eventuais exigências locais precisam ser confirmados com um profissional habilitado.</LegalNote><SourceLinks sources={officialSources} /></div></section>
      <div className="m-container m-cta-wrap"><CtaBand title={`Leve sua operação de PMOC em ${region.city} para um único sistema`} description="Cadastre clientes e equipamentos, monte o cronograma e acompanhe a execução da equipe em campo." primaryLabel="Criar conta gratuita" secondary={{ label: "Baixar checklist de preventiva", href: "/recursos/checklist-manutencao-preventiva-ar-condicionado" }} /></div>
    </MarketingLayout>
  );
}

export function CuritibaPmocPage() { return <RegionalPmocPage regionKey="curitiba" />; }
export function SaoPauloPmocPage() { return <RegionalPmocPage regionKey="sao-paulo" />; }
export function VitoriaVilaVelhaPmocPage() { return <RegionalPmocPage regionKey="vitoria-vila-velha" />; }
