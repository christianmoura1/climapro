import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  Camera,
  CheckSquare2,
  CircleDollarSign,
  ClipboardList,
  FileClock,
  FileText,
  MapPin,
  ReceiptText,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import MarketingLayout from "@/marketing/components/MarketingLayout";
import {
  ArticleMeta,
  CtaBand,
  FaqList,
  FeatureGrid,
  FlowSteps,
  Hero,
  LegalNote,
  RecordPreview,
  SectionHeading,
  SourceLinks,
} from "@/marketing/components/MarketingElements";
import { getPublicPage } from "@/marketing/site-config";

const officialSources = [
  {
    label: "Lei n? 13.589/2018 ? Presid?ncia da Rep?blica",
    href: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13589.htm",
  },
  {
    label: "Portaria GM/MS n? 3.523/1998 ? Biblioteca Virtual em Sa?de",
    href: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/anexo/anexo_prt3523_28_08_1998.pdf",
  },
  {
    label: "RE Anvisa n? 9/2003 ? Biblioteca Virtual em Sa?de",
    href: "https://bvs.saude.gov.br/bvs/saudelegis/anvisa/2003/rdc0009_16_01_2003.html",
  },
];

const pmocFaq = [
  {
    question: "O sistema cria o PMOC sozinho?",
    answer:
      "Ele organiza cronograma, checklist e documentos a partir dos dados cadastrados. O conte?do t?cnico precisa ser conferido e revisado para o caso real.",
  },
  {
    question: "Quem deve revisar o documento?",
    answer:
      "O profissional habilitado e respons?vel pelo escopo, de acordo com as atribui??es e regras aplic?veis ? instala??o.",
  },
  {
    question: "A manuten??o pode ter fotos e assinaturas?",
    answer:
      "Sim. A execu??o aceita fotos por equipamento e coleta os registros de assinatura do t?cnico e do respons?vel no local.",
  },
  {
    question: "O cliente participa do fluxo?",
    answer:
      "Sim. Depois da revis?o da empresa, o registro pode seguir para valida??o do cliente.",
  },
  {
    question: "O ClimaPro garante conformidade legal?",
    answer:
      "N?o. ? uma ferramenta de organiza??o e registro. A conformidade depende da instala??o, da execu??o, dos dados inseridos e da revis?o t?cnica.",
  },
  {
    question: "PMOC ? obrigat?rio em qualquer ar-condicionado?",
    answer:
      "A Lei n? 13.589/2018 trata de edif?cios de uso p?blico e coletivo com ambientes climatizados artificialmente. Situa??es espec?ficas devem ser avaliadas com o respons?vel t?cnico e as regras aplic?veis.",
  },
];

export function PmocLandingPage() {
  const page = getPublicPage("/solucoes/sistema-pmoc");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Cronograma, execu??o e hist?rico"
        title="Sistema PMOC para sair da planilha e acompanhar cada manuten??o"
        description="Cadastre os equipamentos do cliente e organize o cronograma do ano. Na visita, o t?cnico preenche o checklist previsto, adiciona fotos e coleta assinaturas. Depois, a empresa revisa o registro antes de disponibiliz?-lo ao cliente."
        primary={{
          label: "Cadastrar o primeiro PMOC",
          href: "/InitialChoice",
          external: true,
        }}
        secondary={{
          label: "Ler o guia PMOC",
          href: "/recursos/guia-pmoc",
        }}
        notes={["Cronograma de 12 meses", "Hist?rico por equipamento", "Revis?o antes do cliente"]}
        visual={<RecordPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="O que o sistema organiza"
            title="Plano e execu??o permanecem conectados"
            description="A rotina ? constru?da a partir dos clientes e equipamentos cadastrados, n?o de um documento solto que desaparece depois da assinatura."
            align="center"
          />
          <FeatureGrid
            items={[
              {
                icon: CalendarCheck2,
                title: "Cronograma anual",
                description:
                  "Distribua as manuten??es por 12 meses considerando a periodicidade definida para cada equipamento.",
              },
              {
                icon: CheckSquare2,
                title: "Checklist em campo",
                description:
                  "O t?cnico registra os itens previstos na execu??o e inclui observa??es do equipamento.",
              },
              {
                icon: Camera,
                title: "Fotos e assinaturas",
                description:
                  "Cada execu??o aceita evid?ncias fotogr?ficas e registros de assinatura do t?cnico e do respons?vel no local.",
              },
              {
                icon: UserCheck,
                title: "Fluxo de revis?o",
                description:
                  "A manuten??o conclu?da pelo t?cnico aguarda a aprova??o da empresa antes da valida??o do cliente.",
              },
              {
                icon: FileClock,
                title: "Hist?rico do equipamento",
                description:
                  "As visitas ficam ligadas ao equipamento para consulta das execu??es ao longo do tempo.",
              },
              {
                icon: FileText,
                title: "Plano e caderno imprim?veis",
                description:
                  "Abra vers?es preparadas para impress?o e use o navegador para salvar o documento como PDF.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="Cronograma anual por equipamento"
              title="A pr?xima visita nasce do plano, n?o da mem?ria"
              description="O plano anual re?ne equipamentos, periodicidades e meses previstos. Na agenda, a equipe enxerga o que precisa ser executado e mant?m o registro ligado ? origem."
            />
            <ul className="m-check-list">
              <li><CheckSquare2 aria-hidden="true" /> Planejamento de janeiro a dezembro</li>
              <li><CheckSquare2 aria-hidden="true" /> Periodicidade definida por equipamento</li>
              <li><CheckSquare2 aria-hidden="true" /> Pr?ximas manuten??es vis?veis na opera??o</li>
            </ul>
          </div>
          <div className="m-month-board" aria-label="Exemplo de cronograma anual">
            {["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"].map(
              (month, index) => (
                <div className={index === 2 || index === 5 || index === 8 || index === 11 ? "is-planned" : ""} key={month}>
                  <span>{month}</span>
                  <strong>{index === 2 || index === 5 || index === 8 || index === 11 ? "Preventiva" : "?"}</strong>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container">
          <SectionHeading
            eyebrow="Da visita ? valida??o"
            title="Checklist, evid?ncias e revis?o em quatro etapas"
            description="A assinatura coletada no sistema ? parte do registro operacional. Ela n?o substitui ART, TRT, laudo ou a an?lise t?cnica exigida para o caso."
          />
          <FlowSteps
            items={[
              {
                title: "T?cnico executa",
                description: "Preenche o checklist previsto e descreve as condi??es encontradas.",
              },
              {
                title: "Evid?ncias entram no registro",
                description: "Fotos e assinaturas ficam associadas ?quela execu??o.",
              },
              {
                title: "Empresa revisa",
                description: "O respons?vel confere o conte?do antes de liberar o registro.",
              },
              {
                title: "Cliente valida",
                description: "O cliente pode consultar e validar a manuten??o disponibilizada.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <ArticleMeta />
          <SectionHeading
            eyebrow="PMOC ? rotina e registro"
            title="O software ajuda a organizar; a responsabilidade t?cnica continua humana"
            description="A Lei n? 13.589/2018 prev? PMOC para edif?cios de uso p?blico e coletivo com ambientes climatizados artificialmente. O enquadramento, o conte?do e os documentos necess?rios precisam ser validados para cada instala??o."
          />
          <LegalNote>
            Conte?do informativo, n?o ? aconselhamento jur?dico ou t?cnico. Requisitos,
            responsabilidades e documentos do caso devem ser confirmados pelo profissional
            habilitado. O ClimaPro n?o torna uma empresa regular por si s?.
          </LegalNote>
          <SourceLinks sources={officialSources} />
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="D?vidas sobre PMOC" title="Perguntas frequentes" />
          <FaqList items={pmocFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Organize o primeiro cronograma anual"
          description="Cadastre um cliente e seus equipamentos para conhecer o fluxo de planejamento e execu??o."
          primaryLabel="Criar conta e come?ar"
          secondary={{ label: "Baixar checklist de preventiva", href: "/recursos/checklist-manutencao-preventiva-ar-condicionado" }}
        />
      </div>
    </MarketingLayout>
  );
}

const osFaq = [
  {
    question: "Posso anexar fotos?",
    answer:
      "Sim. O fechamento do chamado aceita fotos e v?deos dentro dos limites configurados no produto.",
  },
  {
    question: "H? assinatura do cliente?",
    answer:
      "Sim. A finaliza??o coleta o nome de quem acompanhou a visita e o registro de assinatura do cliente. Isso documenta o fluxo, sem promessa autom?tica de validade jur?dica.",
  },
  {
    question: "Serve para manuten??o corretiva e preventiva?",
    answer:
      "Sim. O chamado registra a solicita??o e o servi?o realizado. Para o plano e a execu??o do PMOC, h? um fluxo espec?fico.",
  },
  {
    question: "A ordem de servi?o gera nota fiscal?",
    answer:
      "N?o trate a OS como nota fiscal. O ClimaPro ainda n?o anuncia emiss?o fiscal oficial integrada ao fechamento.",
  },
  {
    question: "O sistema otimiza a rota?",
    answer:
      "N?o. Ele abre o endere?o cadastrado no Google Maps para ajudar na navega??o, mas n?o faz roteiriza??o autom?tica.",
  },
];

export function ServiceOrderLandingPage() {
  const page = getPublicPage("/solucoes/ordem-servico-ar-condicionado");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Chamado, agenda e evid?ncias"
        title="Ordem de servi?o de ar-condicionado que acompanha o atendimento at? a aprova??o"
        description="Uma OS come?a com a solicita??o, mas o trabalho s? fica documentado quando a equipe registra o que fez. No ClimaPro, o chamado pode ser agendado, atribu?do a um t?cnico e finalizado com fotos, v?deos, nome de quem acompanhou e assinatura do cliente."
        secondary={{
          label: "Baixar modelo de OS",
          href: "/recursos/modelo-ordem-servico-ar-condicionado",
        }}
        notes={["Kanban por status", "Agenda ligada ao chamado", "Hist?rico por equipamento"]}
        visual={<RecordPreview kind="service-order" />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Do pedido ? aprova??o"
            title="Um ?nico registro acompanha todo o atendimento"
            description="No produto, a ordem de servi?o ? tratada como chamado operacional. Ela re?ne o contexto e as evid?ncias da visita; n?o ? nota fiscal nem laudo t?cnico."
            align="center"
          />
          <FlowSteps
            items={[
              {
                title: "Abra o chamado",
                description: "Informe cliente, equipamento, solicita??o, prioridade e t?cnico respons?vel.",
              },
              {
                title: "Agende a visita",
                description: "Data e hor?rio entram na agenda e o endere?o pode ser aberto no Maps.",
              },
              {
                title: "Finalize em campo",
                description: "O t?cnico descreve a execu??o, inclui evid?ncias e coleta a assinatura.",
              },
              {
                title: "Aprove na empresa",
                description: "O atendimento conclu?do fica aguardando a revis?o da empresa.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Fechamento com contexto"
            title="Evid?ncias suficientes para entender o que aconteceu"
            description="A equipe consegue retornar ao chamado e consultar quem atendeu, o equipamento envolvido e os registros coletados."
          />
          <FeatureGrid
            items={[
              {
                icon: ClipboardList,
                title: "Cliente e equipamento",
                description: "O chamado mant?m o v?nculo com o cadastro que deu origem ? visita.",
              },
              {
                icon: CalendarCheck2,
                title: "T?cnico e agenda",
                description: "Respons?vel, data e hor?rio ajudam a coordenar a execu??o.",
              },
              {
                icon: Camera,
                title: "Fotos e v?deos",
                description: "O encerramento aceita at? 10 fotos e at? 2 v?deos no fluxo atual.",
              },
              {
                icon: UserCheck,
                title: "Acompanhante e assinatura",
                description: "Nome de quem acompanhou e assinatura do cliente entram no registro.",
              },
              {
                icon: MapPin,
                title: "Endere?o no Maps",
                description: "Abra o destino cadastrado no Google Maps, sem promessa de otimiza??o autom?tica.",
              },
              {
                icon: FileClock,
                title: "Hist?rico consult?vel",
                description: "A empresa preserva a sequ?ncia de atendimentos do cliente e do equipamento.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">Um modelo para come?ar hoje</span>
            <h2>Prefere testar no papel antes de digitalizar?</h2>
            <p>
              Preparamos um modelo edit?vel com dados do cliente, equipamento, diagn?stico,
              servi?o, pe?as, valores, observa??es e assinaturas. Use sem cadastro e adapte ao
              seu processo.
            </p>
            <Link className="m-button m-button--light" to="/recursos/modelo-ordem-servico-ar-condicionado">
              Baixar modelo gratuito
              <ReceiptText aria-hidden="true" />
            </Link>
          </div>
          <div className="m-document-preview" aria-label="Pr?via do modelo de ordem de servi?o">
            <span>ORDEM DE SERVI?O ? N? ______</span>
            <strong>Cliente e local do atendimento</strong>
            <i />
            <strong>Equipamento e solicita??o</strong>
            <i />
            <i />
            <strong>Servi?o executado e aceite</strong>
            <i />
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Sobre a ordem de servi?o" title="Perguntas frequentes" />
          <FaqList items={osFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Documente o pr?ximo chamado do come?o ao fim"
          description="Crie uma conta gratuita ou baixe o modelo para testar os campos com sua equipe."
          secondary={{ label: "Conhecer o sistema PMOC", href: "/solucoes/sistema-pmoc" }}
        />
      </div>
    </MarketingLayout>
  );
}

const technicianFaq = [
  {
    question: "D? para usar sozinho?",
    answer:
      "Sim. O plano Free configurado no produto prev? um t?cnico, um cliente e at? cinco chamados por m?s.",
  },
  {
    question: "Posso registrar foto e assinatura no celular?",
    answer:
      "A interface aceita esses registros pelo navegador. Como c?mera, sistema e navegador variam, vale testar no dispositivo usado em campo antes de padronizar o processo.",
  },
  {
    question: "Posso controlar gastos?",
    answer:
      "Sim. O perfil t?cnico possui lan?amento de gastos ligados ? rotina de trabalho.",
  },
  {
    question: "Funciona sem internet?",
    answer:
      "N?o h? suporte offline verificado. Considere conex?o ativa para abrir, atualizar e enviar os registros.",
  },
  {
    question: "O sistema me torna respons?vel t?cnico?",
    answer:
      "N?o. Usar o software n?o concede atribui??o profissional nem substitui o respons?vel t?cnico habilitado.",
  },
];

export function TechnicianLandingPage() {
  const page = getPublicPage("/para/tecnico-autonomo");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Para quem atende sozinho"
        title="Menos papel na visita, mais controle dos seus atendimentos"
        description="Para quem trabalha sozinho, uma visita esquecida vira perda de receita. O ClimaPro re?ne seus chamados, agenda e registros para voc? chegar ao cliente com a ordem certa e sair com o servi?o documentado."
        primary={{
          label: "Come?ar no plano gratuito",
          href: "/InitialChoice",
          external: true,
        }}
        secondary={{
          label: "Baixar modelo de OS",
          href: "/recursos/modelo-ordem-servico-ar-condicionado",
        }}
        notes={["1 t?cnico no plano Free", "At? 5 chamados por m?s", "Uso pelo navegador"]}
        visual={<TechnicianPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Seu painel de trabalho"
            title="Chamados, PMOCs e agenda sem carregar uma pilha de papel"
            description="O painel t?cnico mostra o que est? pendente e o que j? foi finalizado, com acesso aos atendimentos atribu?dos."
            align="center"
          />
          <FeatureGrid
            items={[
              {
                icon: Smartphone,
                title: "Meus chamados",
                description: "Veja os atendimentos atribu?dos e atualize a execu??o pelo navegador do celular.",
              },
              {
                icon: CalendarCheck2,
                title: "Minha agenda",
                description: "Consulte data, hor?rio e endere?o das pr?ximas visitas em um s? lugar.",
              },
              {
                icon: CheckSquare2,
                title: "Meus PMOCs",
                description: "Acesse as manuten??es previstas e preencha o checklist por equipamento.",
              },
              {
                icon: Camera,
                title: "Foto e assinatura",
                description: "Documente a finaliza??o do chamado com evid?ncias e aceite do cliente.",
              },
              {
                icon: CircleDollarSign,
                title: "Gastos do trabalho",
                description: "Lance gastos da rotina para manter um registro operacional b?sico.",
              },
              {
                icon: FileClock,
                title: "Pendentes e finalizados",
                description: "Separe o que ainda precisa de a??o do trabalho que j? foi entregue.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="Uma visita bem fechada"
              title="Registre o que voc? encontrou e o que entregou"
              description="No chamado, o encerramento pede contexto do servi?o, evid?ncias e aceite. No PMOC, o checklist previsto acompanha cada equipamento."
            />
            <ul className="m-check-list">
              <li><CheckSquare2 aria-hidden="true" /> Descri??o do servi?o executado</li>
              <li><CheckSquare2 aria-hidden="true" /> Fotos e v?deos quando necess?rios</li>
              <li><CheckSquare2 aria-hidden="true" /> Nome e assinatura de quem acompanhou</li>
              <li><CheckSquare2 aria-hidden="true" /> Registro enviado para revis?o da empresa</li>
            </ul>
          </div>
          <RecordPreview kind="service-order" />
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">Plano Free</span>
            <h2>Comece pequeno e confira se o fluxo cabe na sua rotina</h2>
            <p>
              A configura??o atual do plano gratuito inclui at? 5 chamados por m?s, 1 t?cnico,
              1 cliente e agenda b?sica. Consulte os planos dentro do sistema quando precisar
              ampliar a opera??o.
            </p>
            <a className="m-button m-button--light" href="/InitialChoice">
              Criar conta gratuita
              <Users aria-hidden="true" />
            </a>
          </div>
          <div className="m-free-meter">
            <span>CAPACIDADE DO FREE</span>
            <div><strong>5</strong><small>chamados / m?s</small></div>
            <div><strong>1</strong><small>t?cnico</small></div>
            <div><strong>1</strong><small>cliente</small></div>
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Quem trabalha sozinho pergunta" title="D?vidas frequentes" />
          <FaqList items={technicianFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Leve seu pr?ximo atendimento para o ClimaPro"
          description="Comece pelo plano gratuito ou use primeiro o modelo de OS para ajustar seu processo."
          primaryLabel="Come?ar no plano gratuito"
          secondary={{ label: "Baixar modelo de OS", href: "/recursos/modelo-ordem-servico-ar-condicionado" }}
        />
      </div>
    </MarketingLayout>
  );
}

function TechnicianPreview() {
  return (
    <div className="m-phone-preview">
      <div className="m-phone-preview__speaker" />
      <div className="m-phone-preview__head">
        <span>HOJE ? 3 ATENDIMENTOS</span>
        <strong>Ol?, Rafael</strong>
      </div>
      {[
        ["09:00", "Preventiva ? Cl?nica Norte", "Finalizado"],
        ["14:30", "Corretiva ? Ed. Horizonte", "Em andamento"],
        ["17:00", "PMOC ? Loja Centro", "Pr?ximo"],
      ].map(([time, title, status]) => (
        <div className="m-phone-preview__row" key={time}>
          <span>{time}</span>
          <div><strong>{title}</strong><small>{status}</small></div>
        </div>
      ))}
    </div>
  );
}
