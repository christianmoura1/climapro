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
      "Abra o atendimento, atribua um técnico e acompanhe cada etapa até a revisão da empresa.",
  },
  {
    icon: CalendarDays,
    title: "Agenda operacional",
    description:
      "Vincule a visita ao chamado e mantenha data, horário, endereço e responsável no mesmo fluxo.",
  },
  {
    icon: ClipboardCheck,
    title: "PMOC por equipamento",
    description:
      "Monte o cronograma anual e execute o checklist previsto para cada equipamento cadastrado.",
  },
  {
    icon: Camera,
    title: "Evidências da visita",
    description:
      "Registre fotos, vídeos quando aplicável, observações e a assinatura coletada no atendimento.",
  },
  {
    icon: UsersRound,
    title: "Equipe e clientes",
    description:
      "Organize técnicos, clientes, locais e equipamentos sem espalhar a operação em planilhas.",
  },
  {
    icon: FileCheck2,
    title: "Histórico para consulta",
    description:
      "Mantenha os registros ligados ao cliente e abra versões preparadas para imprimir ou salvar em PDF.",
  },
];

const faq = [
  {
    question: "O plano gratuito pede cartão de crédito?",
    answer:
      "Não. O plano Free não passa por checkout e pode ser usado dentro dos limites exibidos no sistema.",
  },
  {
    question: "Posso cadastrar técnicos?",
    answer:
      "Sim. O limite varia por plano; no Free, a configuração atual prevê um técnico.",
  },
  {
    question: "Consigo acompanhar chamados por status?",
    answer:
      "Sim. Os chamados aparecem em um quadro Kanban e também podem ser ligados à agenda e ao técnico responsável.",
  },
  {
    question: "O relatório sai em PDF?",
    answer:
      "O ClimaPro abre versões preparadas para impressão. No navegador, você pode escolher “Salvar como PDF”.",
  },
  {
    question: "O ClimaPro substitui o responsável técnico?",
    answer:
      "Não. O sistema organiza dados, execução e documentos. O conteúdo técnico e as obrigações do caso continuam sob revisão do profissional habilitado.",
  },
];

export default function HomePage() {
  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Operação de climatização em um só fluxo"
        title="Gestão de manutenção para quem vive a rotina da climatização"
        description="Chamados, PMOC e agenda para sua operação de climatização. Cadastre os equipamentos, envie a equipe para o atendimento e mantenha o histórico de cada serviço no mesmo lugar."
        secondary={{
          label: "Ver como funciona o PMOC",
          href: "/solucoes/sistema-pmoc",
        }}
        notes={["Plano Free disponível", "Sem cartão no plano gratuito", "Acesso pelo navegador"]}
        visual={<RecordPreview kind="service-order" />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Do chamado ao registro"
            title="A informação acompanha o trabalho de campo"
            description="O ClimaPro conecta a solicitação, a agenda, a execução e a aprovação. Assim, o contexto não se perde quando o atendimento muda de mão."
            align="center"
          />
          <FlowSteps
            items={[
              {
                title: "Cadastre o contexto",
                description: "Cliente, endereço, equipamento e motivo do atendimento entram no chamado.",
              },
              {
                title: "Organize a visita",
                description: "Defina técnico, data e horário. O endereço cadastrado pode ser aberto no Google Maps.",
              },
              {
                title: "Registre a execução",
                description: "A equipe descreve o serviço, adiciona evidências e coleta a assinatura do cliente.",
              },
              {
                title: "Revise e preserve",
                description: "A empresa aprova o registro e mantém o histórico ligado ao cliente e ao equipamento.",
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
            description="Recursos construídos em torno do atendimento técnico, sem promessas de automações que o produto ainda não entrega."
          />
          <FeatureGrid items={features} />
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">PMOC organizado por equipamento</span>
            <h2>O plano anual só funciona quando a execução volta para o histórico</h2>
            <p>
              Cadastre os equipamentos do cliente, distribua as manutenções ao longo do ano e
              registre checklist, fotos e assinaturas durante a visita. Depois, revise o
              conteúdo antes de disponibilizá-lo ao cliente.
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
              title="Teste o fluxo com uma operação pequena"
              description="O plano Free inclui até 40 chamados por mês, 20 clientes, 1 técnico e PMOC de 1 cliente. Passou disso, o Basic sai por R$ 29,90/mês sem limite de chamados nem de clientes. Os demais planos aparecem dentro do sistema."
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
              <li><ClipboardCheck aria-hidden="true" /> Até 5 chamados por mês</li>
              <li><UsersRound aria-hidden="true" /> 1 técnico e 1 cliente</li>
              <li><CalendarDays aria-hidden="true" /> Agenda básica</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Ferramentas de campo"
            title="Materiais gratuitos para usar antes mesmo de criar a conta"
            description="Baixe um modelo, leve um checklist para a visita ou estime seus custos. Cada recurso tem conteúdo próprio e pode ser usado sem cadastro."
          />
          <FeatureGrid
            columns={4}
            items={[
              {
                title: "Modelo de ordem de serviço",
                description: "Arquivo editável com os campos essenciais para documentar o atendimento.",
                link: {
                  label: "Baixar modelo",
                  href: "/recursos/modelo-ordem-servico-ar-condicionado",
                },
              },
              {
                title: "Checklist de preventiva",
                description: "Uma base adaptável para inspeção, observações, fotos e ações recomendadas.",
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
                title: "Calculadora de preço",
                description: "Estime mão de obra, deslocamento, custos indiretos e margem do contrato.",
                link: {
                  label: "Calcular preço",
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
            description="Respostas diretas sobre o que já está disponível no produto."
          />
          <FaqList items={faq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Coloque o próximo atendimento em ordem"
          description="Crie a conta gratuita, cadastre seu primeiro cliente e conheça o fluxo completo do chamado."
          secondary={{
            label: "Ver ordem de serviço",
            href: "/solucoes/ordem-servico-ar-condicionado",
          }}
        />
      </div>
    </MarketingLayout>
  );
}
