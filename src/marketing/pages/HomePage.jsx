import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  ClipboardCheck,
  Columns3,
  FileCheck2,
  Gauge,
  MapPinned,
  UsersRound,
} from "lucide-react";
import MarketingLayout from "@/marketing/components/MarketingLayout";
import {
  CtaBand,
  FaqList,
  FeatureGrid,
  FlowSteps,
  Hero,
  RecordPreview,
  SectionHeading,
} from "@/marketing/components/MarketingElements";
import { getPublicPage } from "@/marketing/site-config";

const page = getPublicPage("/");

const features = [
  {
    icon: Columns3,
    title: "Chamados em Kanban",
    description:
      "Abra o atendimento, atribua um t?cnico e acompanhe cada etapa at? a revis?o da empresa.",
  },
  {
    icon: CalendarDays,
    title: "Agenda operacional",
    description:
      "Vincule a visita ao chamado e mantenha data, hor?rio, endere?o e respons?vel no mesmo fluxo.",
  },
  {
    icon: ClipboardCheck,
    title: "PMOC por equipamento",
    description:
      "Monte o cronograma anual e execute o checklist previsto para cada equipamento cadastrado.",
  },
  {
    icon: Camera,
    title: "Evid?ncias da visita",
    description:
      "Registre fotos, v?deos quando aplic?vel, observa??es e a assinatura coletada no atendimento.",
  },
  {
    icon: UsersRound,
    title: "Equipe e clientes",
    description:
      "Organize t?cnicos, clientes, locais e equipamentos sem espalhar a opera??o em planilhas.",
  },
  {
    icon: FileCheck2,
    title: "Hist?rico para consulta",
    description:
      "Mantenha os registros ligados ao cliente e abra vers?es preparadas para imprimir ou salvar em PDF.",
  },
];

const faq = [
  {
    question: "O plano gratuito pede cart?o de cr?dito?",
    answer:
      "N?o. O plano Free n?o passa por checkout e pode ser usado dentro dos limites exibidos no sistema.",
  },
  {
    question: "Posso cadastrar t?cnicos?",
    answer:
      "Sim. O limite varia por plano; no Free, a configura??o atual prev? um t?cnico.",
  },
  {
    question: "Consigo acompanhar chamados por status?",
    answer:
      "Sim. Os chamados aparecem em um quadro Kanban e tamb?m podem ser ligados ? agenda e ao t?cnico respons?vel.",
  },
  {
    question: "O relat?rio sai em PDF?",
    answer:
      "O ClimaPro abre vers?es preparadas para impress?o. No navegador, voc? pode escolher ?Salvar como PDF?.",
  },
  {
    question: "O ClimaPro substitui o respons?vel t?cnico?",
    answer:
      "N?o. O sistema organiza dados, execu??o e documentos. O conte?do t?cnico e as obriga??es do caso continuam sob revis?o do profissional habilitado.",
  },
];

export default function HomePage() {
  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Opera??o de climatiza??o em um s? fluxo"
        title="Gest?o de manuten??o para quem vive a rotina da climatiza??o"
        description="Chamados, PMOC e agenda para sua opera??o de climatiza??o. Cadastre os equipamentos, envie a equipe para o atendimento e mantenha o hist?rico de cada servi?o no mesmo lugar."
        secondary={{
          label: "Ver como funciona o PMOC",
          href: "/solucoes/sistema-pmoc",
        }}
        notes={["Plano Free dispon?vel", "Sem cart?o no plano gratuito", "Acesso pelo navegador"]}
        visual={<RecordPreview kind="service-order" />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Do chamado ao registro"
            title="A informa??o acompanha o trabalho de campo"
            description="O ClimaPro conecta a solicita??o, a agenda, a execu??o e a aprova??o. Assim, o contexto n?o se perde quando o atendimento muda de m?o."
            align="center"
          />
          <FlowSteps
            items={[
              {
                title: "Cadastre o contexto",
                description: "Cliente, endere?o, equipamento e motivo do atendimento entram no chamado.",
              },
              {
                title: "Organize a visita",
                description: "Defina t?cnico, data e hor?rio. O endere?o cadastrado pode ser aberto no Google Maps.",
              },
              {
                title: "Registre a execu??o",
                description: "A equipe descreve o servi?o, adiciona evid?ncias e coleta a assinatura do cliente.",
              },
              {
                title: "Revise e preserve",
                description: "A empresa aprova o registro e mant?m o hist?rico ligado ao cliente e ao equipamento.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section" id="funcionalidades">
        <div className="m-container">
          <SectionHeading
            eyebrow="Rotina operacional"
            title="O que sua equipe consegue fazer no ClimaPro"
            description="Recursos constru?dos em torno do atendimento t?cnico, sem promessas de automa??es que o produto ainda n?o entrega."
          />
          <FeatureGrid items={features} />
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">PMOC organizado por equipamento</span>
            <h2>O plano anual s? funciona quando a execu??o volta para o hist?rico</h2>
            <p>
              Cadastre os equipamentos do cliente, distribua as manuten??es ao longo do ano e
              registre checklist, fotos e assinaturas durante a visita. Depois, revise o
              conte?do antes de disponibiliz?-lo ao cliente.
            </p>
            <Link className="m-button m-button--light" to="/solucoes/sistema-pmoc">
              Conhecer o sistema PMOC
              <Gauge aria-hidden="true" />
            </Link>
          </div>
          <RecordPreview />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="Comece pelo plano gratuito"
              title="Teste o fluxo com uma opera??o pequena"
              description="O plano Free configurado no produto inclui at? 5 chamados por m?s, 1 t?cnico, 1 cliente e agenda b?sica. Quando a opera??o crescer, os planos dispon?veis aparecem dentro do sistema."
            />
            <a className="m-button" href="/InitialChoice">
              Criar conta gratuita
              <MapPinned aria-hidden="true" />
            </a>
          </div>
          <aside className="m-plan-card">
            <span className="m-record__code">PLANO FREE</span>
            <strong>R$ 0</strong>
            <p>Para conhecer o fluxo antes de contratar.</p>
            <ul>
              <li><ClipboardCheck aria-hidden="true" /> At? 5 chamados por m?s</li>
              <li><UsersRound aria-hidden="true" /> 1 t?cnico e 1 cliente</li>
              <li><CalendarDays aria-hidden="true" /> Agenda b?sica</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Ferramentas de campo"
            title="Materiais gratuitos para usar antes mesmo de criar a conta"
            description="Baixe um modelo, leve um checklist para a visita ou estime seus custos. Cada recurso tem conte?do pr?prio e pode ser usado sem cadastro."
          />
          <FeatureGrid
            columns={4}
            items={[
              {
                title: "Modelo de ordem de servi?o",
                description: "Arquivo edit?vel com os campos essenciais para documentar o atendimento.",
                link: {
                  label: "Baixar modelo",
                  href: "/recursos/modelo-ordem-servico-ar-condicionado",
                },
              },
              {
                title: "Checklist de preventiva",
                description: "Uma base adapt?vel para inspe??o, observa??es, fotos e a??es recomendadas.",
                link: {
                  label: "Abrir checklist",
                  href: "/recursos/checklist-manutencao-preventiva-ar-condicionado",
                },
              },
              {
                title: "Guia PMOC",
                description: "Um ponto de partida com fontes oficiais e limites claros do software.",
                link: { label: "Ler o guia", href: "/recursos/guia-pmoc" },
              },
              {
                title: "Calculadora de pre?o",
                description: "Estime m?o de obra, deslocamento, custos indiretos e margem do contrato.",
                link: {
                  label: "Calcular pre?o",
                  href: "/recursos/calculadora-preco-pmoc",
                },
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading
            eyebrow="Antes de criar sua conta"
            title="Perguntas frequentes"
            description="Respostas diretas sobre o que j? est? dispon?vel no produto."
          />
          <FaqList items={faq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Coloque o pr?ximo atendimento em ordem"
          description="Crie a conta gratuita, cadastre seu primeiro cliente e conhe?a o fluxo completo do chamado."
          secondary={{
            label: "Ver ordem de servi?o",
            href: "/solucoes/ordem-servico-ar-condicionado",
          }}
        />
      </div>
    </MarketingLayout>
  );
}
