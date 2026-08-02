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
    label: "Lei nº 13.589/2018 — Presidência da República",
    href: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13589.htm",
  },
  {
    label: "Portaria GM/MS nº 3.523/1998 — Biblioteca Virtual em Saúde",
    href: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/anexo/anexo_prt3523_28_08_1998.pdf",
  },
  {
    label: "RE Anvisa nº 9/2003 — Biblioteca Virtual em Saúde",
    href: "https://bvs.saude.gov.br/bvs/saudelegis/anvisa/2003/rdc0009_16_01_2003.html",
  },
];

const pmocFaq = [
  {
    question: "O sistema cria o PMOC sozinho?",
    answer:
      "Ele organiza cronograma, checklist e documentos a partir dos dados cadastrados. O conteúdo técnico precisa ser conferido e revisado para o caso real.",
  },
  {
    question: "Quem deve revisar o documento?",
    answer:
      "O profissional habilitado e responsável pelo escopo, de acordo com as atribuições e regras aplicáveis à instalação.",
  },
  {
    question: "A manutenção pode ter fotos e assinaturas?",
    answer:
      "Sim. A execução aceita fotos por equipamento e coleta os registros de assinatura do técnico e do responsável no local.",
  },
  {
    question: "O cliente participa do fluxo?",
    answer:
      "Sim. Depois da revisão da empresa, o registro pode seguir para validação do cliente.",
  },
  {
    question: "O ClimaPro garante conformidade legal?",
    answer:
      "Não. É uma ferramenta de organização e registro. A conformidade depende da instalação, da execução, dos dados inseridos e da revisão técnica.",
  },
  {
    question: "PMOC é obrigatório em qualquer ar-condicionado?",
    answer:
      "A Lei nº 13.589/2018 trata de edifícios de uso público e coletivo com ambientes climatizados artificialmente. Situações específicas devem ser avaliadas com o responsável técnico e as regras aplicáveis.",
  },
];

export function PmocLandingPage() {
  const page = getPublicPage("/solucoes/sistema-pmoc");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Cronograma, execução e histórico"
        title="Sistema PMOC para sair da planilha e acompanhar cada manutenção"
        description="Cadastre os equipamentos do cliente e organize o cronograma do ano. Na visita, o técnico preenche o checklist previsto, adiciona fotos e coleta assinaturas. Depois, a empresa revisa o registro antes de disponibilizá-lo ao cliente."
        primary={{
          label: "Cadastrar o primeiro PMOC",
          href: "/InitialChoice",
          external: true,
        }}
        secondary={{
          label: "Ler o guia PMOC",
          href: "/recursos/guia-pmoc",
        }}
        notes={["Cronograma de 12 meses", "Histórico por equipamento", "Revisão antes do cliente"]}
        visual={<RecordPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="O que o sistema organiza"
            title="Plano e execução permanecem conectados"
            description="A rotina é construída a partir dos clientes e equipamentos cadastrados, não de um documento solto que desaparece depois da assinatura."
            align="center"
          />
          <FeatureGrid
            items={[
              {
                icon: CalendarCheck2,
                title: "Cronograma anual",
                description:
                  "Distribua as manutenções por 12 meses considerando a periodicidade definida para cada equipamento.",
              },
              {
                icon: CheckSquare2,
                title: "Checklist em campo",
                description:
                  "O técnico registra os itens previstos na execução e inclui observações do equipamento.",
              },
              {
                icon: Camera,
                title: "Fotos e assinaturas",
                description:
                  "Cada execução aceita evidências fotográficas e registros de assinatura do técnico e do responsável no local.",
              },
              {
                icon: UserCheck,
                title: "Fluxo de revisão",
                description:
                  "A manutenção concluída pelo técnico aguarda a aprovação da empresa antes da validação do cliente.",
              },
              {
                icon: FileClock,
                title: "Histórico do equipamento",
                description:
                  "As visitas ficam ligadas ao equipamento para consulta das execuções ao longo do tempo.",
              },
              {
                icon: FileText,
                title: "Plano e caderno imprimíveis",
                description:
                  "Abra versões preparadas para impressão e use o navegador para salvar o documento como PDF.",
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
              title="A próxima visita nasce do plano, não da memória"
              description="O plano anual reúne equipamentos, periodicidades e meses previstos. Na agenda, a equipe enxerga o que precisa ser executado e mantém o registro ligado à origem."
            />
            <ul className="m-check-list">
              <li><CheckSquare2 aria-hidden="true" /> Planejamento de janeiro a dezembro</li>
              <li><CheckSquare2 aria-hidden="true" /> Periodicidade definida por equipamento</li>
              <li><CheckSquare2 aria-hidden="true" /> Próximas manutenções visíveis na operação</li>
            </ul>
          </div>
          <div className="m-month-board" aria-label="Exemplo de cronograma anual">
            {["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"].map(
              (month, index) => (
                <div className={index === 2 || index === 5 || index === 8 || index === 11 ? "is-planned" : ""} key={month}>
                  <span>{month}</span>
                  <strong>{index === 2 || index === 5 || index === 8 || index === 11 ? "Preventiva" : "—"}</strong>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container">
          <SectionHeading
            eyebrow="Da visita à validação"
            title="Checklist, evidências e revisão em quatro etapas"
            description="A assinatura coletada no sistema é parte do registro operacional. Ela não substitui ART, TRT, laudo ou a análise técnica exigida para o caso."
          />
          <FlowSteps
            items={[
              {
                title: "Técnico executa",
                description: "Preenche o checklist previsto e descreve as condições encontradas.",
              },
              {
                title: "Evidências entram no registro",
                description: "Fotos e assinaturas ficam associadas àquela execução.",
              },
              {
                title: "Empresa revisa",
                description: "O responsável confere o conteúdo antes de liberar o registro.",
              },
              {
                title: "Cliente valida",
                description: "O cliente pode consultar e validar a manutenção disponibilizada.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <ArticleMeta />
          <SectionHeading
            eyebrow="PMOC é rotina e registro"
            title="O software ajuda a organizar; a responsabilidade técnica continua humana"
            description="A Lei nº 13.589/2018 prevê PMOC para edifícios de uso público e coletivo com ambientes climatizados artificialmente. O enquadramento, o conteúdo e os documentos necessários precisam ser validados para cada instalação."
          />
          <LegalNote>
            Conteúdo informativo, não é aconselhamento jurídico ou técnico. Requisitos,
            responsabilidades e documentos do caso devem ser confirmados pelo profissional
            habilitado. O ClimaPro não torna uma empresa regular por si só.
          </LegalNote>
          <SourceLinks sources={officialSources} />
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Dúvidas sobre PMOC" title="Perguntas frequentes" />
          <FaqList items={pmocFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Organize o primeiro cronograma anual"
          description="Cadastre um cliente e seus equipamentos para conhecer o fluxo de planejamento e execução."
          primaryLabel="Criar conta e começar"
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
      "Sim. O fechamento do chamado aceita fotos e vídeos dentro dos limites configurados no produto.",
  },
  {
    question: "Há assinatura do cliente?",
    answer:
      "Sim. A finalização coleta o nome de quem acompanhou a visita e o registro de assinatura do cliente. Isso documenta o fluxo, sem promessa automática de validade jurídica.",
  },
  {
    question: "Serve para manutenção corretiva e preventiva?",
    answer:
      "Sim. O chamado registra a solicitação e o serviço realizado. Para o plano e a execução do PMOC, há um fluxo específico.",
  },
  {
    question: "A ordem de serviço gera nota fiscal?",
    answer:
      "Não trate a OS como nota fiscal. O ClimaPro ainda não anuncia emissão fiscal oficial integrada ao fechamento.",
  },
  {
    question: "O sistema otimiza a rota?",
    answer:
      "Não. Ele abre o endereço cadastrado no Google Maps para ajudar na navegação, mas não faz roteirização automática.",
  },
];

export function ServiceOrderLandingPage() {
  const page = getPublicPage("/solucoes/ordem-servico-ar-condicionado");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Chamado, agenda e evidências"
        title="Ordem de serviço de ar-condicionado que acompanha o atendimento até a aprovação"
        description="Uma OS começa com a solicitação, mas o trabalho só fica documentado quando a equipe registra o que fez. No ClimaPro, o chamado pode ser agendado, atribuído a um técnico e finalizado com fotos, vídeos, nome de quem acompanhou e assinatura do cliente."
        secondary={{
          label: "Baixar modelo de OS",
          href: "/recursos/modelo-ordem-servico-ar-condicionado",
        }}
        notes={["Kanban por status", "Agenda ligada ao chamado", "Histórico por equipamento"]}
        visual={<RecordPreview kind="service-order" />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Do pedido à aprovação"
            title="Um único registro acompanha todo o atendimento"
            description="No produto, a ordem de serviço é tratada como chamado operacional. Ela reúne o contexto e as evidências da visita; não é nota fiscal nem laudo técnico."
            align="center"
          />
          <FlowSteps
            items={[
              {
                title: "Abra o chamado",
                description: "Informe cliente, equipamento, solicitação, prioridade e técnico responsável.",
              },
              {
                title: "Agende a visita",
                description: "Data e horário entram na agenda e o endereço pode ser aberto no Maps.",
              },
              {
                title: "Finalize em campo",
                description: "O técnico descreve a execução, inclui evidências e coleta a assinatura.",
              },
              {
                title: "Aprove na empresa",
                description: "O atendimento concluído fica aguardando a revisão da empresa.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Fechamento com contexto"
            title="Evidências suficientes para entender o que aconteceu"
            description="A equipe consegue retornar ao chamado e consultar quem atendeu, o equipamento envolvido e os registros coletados."
          />
          <FeatureGrid
            items={[
              {
                icon: ClipboardList,
                title: "Cliente e equipamento",
                description: "O chamado mantém o vínculo com o cadastro que deu origem à visita.",
              },
              {
                icon: CalendarCheck2,
                title: "Técnico e agenda",
                description: "Responsável, data e horário ajudam a coordenar a execução.",
              },
              {
                icon: Camera,
                title: "Fotos e vídeos",
                description: "O encerramento aceita até 10 fotos e até 2 vídeos no fluxo atual.",
              },
              {
                icon: UserCheck,
                title: "Acompanhante e assinatura",
                description: "Nome de quem acompanhou e assinatura do cliente entram no registro.",
              },
              {
                icon: MapPin,
                title: "Endereço no Maps",
                description: "Abra o destino cadastrado no Google Maps, sem promessa de otimização automática.",
              },
              {
                icon: FileClock,
                title: "Histórico consultável",
                description: "A empresa preserva a sequência de atendimentos do cliente e do equipamento.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">Um modelo para começar hoje</span>
            <h2>Prefere testar no papel antes de digitalizar?</h2>
            <p>
              Preparamos um modelo editável com dados do cliente, equipamento, diagnóstico,
              serviço, peças, valores, observações e assinaturas. Use sem cadastro e adapte ao
              seu processo.
            </p>
            <Link className="m-button m-button--light" to="/recursos/modelo-ordem-servico-ar-condicionado">
              Baixar modelo gratuito
              <ReceiptText aria-hidden="true" />
            </Link>
          </div>
          <div className="m-document-preview" aria-label="Prévia do modelo de ordem de serviço">
            <span>ORDEM DE SERVIÇO — Nº ______</span>
            <strong>Cliente e local do atendimento</strong>
            <i />
            <strong>Equipamento e solicitação</strong>
            <i />
            <i />
            <strong>Serviço executado e aceite</strong>
            <i />
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Sobre a ordem de serviço" title="Perguntas frequentes" />
          <FaqList items={osFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Documente o próximo chamado do começo ao fim"
          description="Crie uma conta gratuita ou baixe o modelo para testar os campos com sua equipe."
          secondary={{ label: "Conhecer o sistema PMOC", href: "/solucoes/sistema-pmoc" }}
        />
      </div>
    </MarketingLayout>
  );
}

const technicianFaq = [
  {
    question: "Dá para usar sozinho?",
    answer:
      "Sim. O plano Free configurado no produto prevê um técnico, um cliente e até cinco chamados por mês.",
  },
  {
    question: "Posso registrar foto e assinatura no celular?",
    answer:
      "A interface aceita esses registros pelo navegador. Como câmera, sistema e navegador variam, vale testar no dispositivo usado em campo antes de padronizar o processo.",
  },
  {
    question: "Posso controlar gastos?",
    answer:
      "Sim. O perfil técnico possui lançamento de gastos ligados à rotina de trabalho.",
  },
  {
    question: "Funciona sem internet?",
    answer:
      "Não há suporte offline verificado. Considere conexão ativa para abrir, atualizar e enviar os registros.",
  },
  {
    question: "O sistema me torna responsável técnico?",
    answer:
      "Não. Usar o software não concede atribuição profissional nem substitui o responsável técnico habilitado.",
  },
];

export function TechnicianLandingPage() {
  const page = getPublicPage("/para/tecnico-autonomo");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Para quem atende sozinho"
        title="Menos papel na visita, mais controle dos seus atendimentos"
        description="Para quem trabalha sozinho, uma visita esquecida vira perda de receita. O ClimaPro reúne seus chamados, agenda e registros para você chegar ao cliente com a ordem certa e sair com o serviço documentado."
        primary={{
          label: "Começar no plano gratuito",
          href: "/InitialChoice",
          external: true,
        }}
        secondary={{
          label: "Baixar modelo de OS",
          href: "/recursos/modelo-ordem-servico-ar-condicionado",
        }}
        notes={["1 técnico no plano Free", "Até 5 chamados por mês", "Uso pelo navegador"]}
        visual={<TechnicianPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Seu painel de trabalho"
            title="Chamados, PMOCs e agenda sem carregar uma pilha de papel"
            description="O painel técnico mostra o que está pendente e o que já foi finalizado, com acesso aos atendimentos atribuídos."
            align="center"
          />
          <FeatureGrid
            items={[
              {
                icon: Smartphone,
                title: "Meus chamados",
                description: "Veja os atendimentos atribuídos e atualize a execução pelo navegador do celular.",
              },
              {
                icon: CalendarCheck2,
                title: "Minha agenda",
                description: "Consulte data, horário e endereço das próximas visitas em um só lugar.",
              },
              {
                icon: CheckSquare2,
                title: "Meus PMOCs",
                description: "Acesse as manutenções previstas e preencha o checklist por equipamento.",
              },
              {
                icon: Camera,
                title: "Foto e assinatura",
                description: "Documente a finalização do chamado com evidências e aceite do cliente.",
              },
              {
                icon: CircleDollarSign,
                title: "Gastos do trabalho",
                description: "Lance gastos da rotina para manter um registro operacional básico.",
              },
              {
                icon: FileClock,
                title: "Pendentes e finalizados",
                description: "Separe o que ainda precisa de ação do trabalho que já foi entregue.",
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
              title="Registre o que você encontrou e o que entregou"
              description="No chamado, o encerramento pede contexto do serviço, evidências e aceite. No PMOC, o checklist previsto acompanha cada equipamento."
            />
            <ul className="m-check-list">
              <li><CheckSquare2 aria-hidden="true" /> Descrição do serviço executado</li>
              <li><CheckSquare2 aria-hidden="true" /> Fotos e vídeos quando necessários</li>
              <li><CheckSquare2 aria-hidden="true" /> Nome e assinatura de quem acompanhou</li>
              <li><CheckSquare2 aria-hidden="true" /> Registro enviado para revisão da empresa</li>
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
              A configuração atual do plano gratuito inclui até 5 chamados por mês, 1 técnico,
              1 cliente e agenda básica. Consulte os planos dentro do sistema quando precisar
              ampliar a operação.
            </p>
            <a className="m-button m-button--light" href="/InitialChoice">
              Criar conta gratuita
              <Users aria-hidden="true" />
            </a>
          </div>
          <div className="m-free-meter">
            <span>CAPACIDADE DO FREE</span>
            <div><strong>5</strong><small>chamados / mês</small></div>
            <div><strong>1</strong><small>técnico</small></div>
            <div><strong>1</strong><small>cliente</small></div>
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Quem trabalha sozinho pergunta" title="Dúvidas frequentes" />
          <FaqList items={technicianFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Leve seu próximo atendimento para o ClimaPro"
          description="Comece pelo plano gratuito ou use primeiro o modelo de OS para ajustar seu processo."
          primaryLabel="Começar no plano gratuito"
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
        <span>HOJE · 3 ATENDIMENTOS</span>
        <strong>Olá, Rafael</strong>
      </div>
      {[
        ["09:00", "Preventiva · Clínica Norte", "Finalizado"],
        ["14:30", "Corretiva · Ed. Horizonte", "Em andamento"],
        ["17:00", "PMOC · Loja Centro", "Próximo"],
      ].map(([time, title, status]) => (
        <div className="m-phone-preview__row" key={time}>
          <span>{time}</span>
          <div><strong>{title}</strong><small>{status}</small></div>
        </div>
      ))}
    </div>
  );
}
