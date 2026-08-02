import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckSquare2,
  ClipboardCheck,
  FileDown,
  FilePenLine,
  ListChecks,
  Printer,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import MarketingLayout from "@/marketing/components/MarketingLayout";
import {
  ArticleMeta,
  CtaBand,
  DownloadActions,
  FaqList,
  FeatureGrid,
  Hero,
  LegalNote,
  SectionHeading,
  SourceLinks,
} from "@/marketing/components/MarketingElements";
import PriceCalculator from "@/marketing/components/PriceCalculator";
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

const osFields = [
  ["Identifica??o", "N?mero, data, hor?rio, prestadora, t?cnico, cliente e local."],
  ["Equipamento", "Tipo, marca, modelo, s?rie, capacidade e ambiente atendido."],
  ["Solicita??o", "Defeito relatado, sintomas e condi??o informada pelo cliente."],
  ["Execu??o", "Diagn?stico, servi?o realizado, pe?as, materiais e observa??es."],
  ["Evid?ncias", "Espa?o para fotos, medi??es aplic?veis e a??o recomendada."],
  ["Aceite", "Nome e assinatura de t?cnico e cliente, al?m das condi??es comerciais."],
];

const osFaq = [
  {
    question: "O modelo serve para instala??o?",
    answer:
      "Sim. Adapte a solicita??o, os materiais, os testes e o aceite ao escopo da instala??o.",
  },
  {
    question: "Posso editar o arquivo?",
    answer:
      "Sim. A vers?o .doc abre em editores compat?veis com Word. Tamb?m h? uma vers?o HTML pronta para imprimir.",
  },
  {
    question: "O modelo substitui um laudo t?cnico?",
    answer:
      "N?o. Ele documenta uma ordem de servi?o e n?o substitui laudo, ART, TRT ou an?lise t?cnica.",
  },
  {
    question: "Serve para PMOC?",
    answer:
      "A OS ajuda a registrar uma visita. PMOC envolve plano, execu??o, controle e responsabilidades pr?prios.",
  },
  {
    question: "Preciso coletar assinatura?",
    answer:
      "O modelo oferece o campo. A decis?o operacional e jur?dica deve considerar o contrato e a orienta??o profissional da empresa.",
  },
];

export function ServiceOrderTemplatePage() {
  const page = getPublicPage("/recursos/modelo-ordem-servico-ar-condicionado");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Download sem cadastro"
        title="Modelo de ordem de servi?o para ar-condicionado, pronto para preencher"
        description="Use um arquivo edit?vel para registrar cliente, equipamento, solicita??o, diagn?stico, servi?o, pe?as, valores, evid?ncias e aceite. O modelo ? uma base de trabalho: adapte os campos ao seu contrato e ao tipo de atendimento."
        primary={{
          label: "Baixar modelo edit?vel (.doc)",
          href: "/downloads/modelo-ordem-servico-ar-condicionado.doc",
          external: true,
        }}
        secondary={{
          label: "Abrir vers?o para imprimir",
          href: "/downloads/modelo-ordem-servico-ar-condicionado.html",
          external: true,
        }}
        notes={["Sem formul?rio", "Arquivo edit?vel", "Exemplo fict?cio inclu?do"]}
        visual={<OrderTemplatePreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container m-reading-width">
          <ArticleMeta />
          <SectionHeading
            eyebrow="Entrega imediata"
            title="Baixe, edite e teste com sua pr?xima visita"
            description="O arquivo .doc ? compat?vel com editores que abrem documentos do Word. A vers?o HTML pode ser preenchida ? m?o depois de impressa ou salva como PDF pelo navegador."
          />
          <DownloadActions
            editHref="/downloads/modelo-ordem-servico-ar-condicionado.doc"
            printHref="/downloads/modelo-ordem-servico-ar-condicionado.html"
            editLabel="Baixar modelo edit?vel (.doc)"
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Campos do modelo"
            title="O que registrar antes, durante e depois da visita"
            description="Os campos foram organizados para que outra pessoa consiga entender o atendimento sem depender da mem?ria de quem executou."
          />
          <div className="m-field-table" role="table" aria-label="Campos do modelo de ordem de servi?o">
            {osFields.map(([label, description], index) => (
              <div role="row" key={label}>
                <span role="cell">{String(index + 1).padStart(2, "0")}</span>
                <strong role="cell">{label}</strong>
                <p role="cell">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">Antes, durante e depois</span>
            <h2>Uma OS ?til conta a sequ?ncia do atendimento</h2>
          </div>
          <ol className="m-compact-steps">
            <li><strong>Antes:</strong> confirme cliente, local, equipamento, solicita??o, data e respons?vel.</li>
            <li><strong>Durante:</strong> registre diagn?stico, a??es, pe?as, medi??es aplic?veis e evid?ncias.</li>
            <li><strong>Depois:</strong> descreva pend?ncias, valores, condi??es e o aceite coletado.</li>
          </ol>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="OS ou PMOC?"
              title="O documento depende da finalidade"
              description="A ordem de servi?o narra um atendimento. O PMOC organiza um plano continuado de manuten??o, opera??o e controle. Uma visita do PMOC pode gerar registros operacionais, mas a OS isolada n?o substitui o plano."
            />
            <Link className="m-inline-link" to="/recursos/guia-pmoc">
              Entender a rotina do PMOC
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <LegalNote>
            Este modelo n?o vale automaticamente como contrato, laudo ou garantia de
            pagamento. Revise as condi??es comerciais, jur?dicas e t?cnicas do seu processo.
          </LegalNote>
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Sobre o modelo" title="Perguntas frequentes" />
          <FaqList items={osFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Transforme a OS em hist?rico de atendimento"
          description="Depois de testar os campos, leve chamados, agenda e registros para um fluxo digital."
          secondary={{ label: "Conhecer o fluxo de chamados", href: "/solucoes/ordem-servico-ar-condicionado" }}
        />
      </div>
    </MarketingLayout>
  );
}

const checklistGroups = [
  {
    title: "Identifica??o e seguran?a",
    items: [
      "Confirmar cliente, ambiente e identifica??o do equipamento.",
      "Registrar condi??o visual antes de qualquer interven??o.",
      "Verificar se a atividade prevista exige isolamento, autoriza??o ou profissional espec?fico.",
    ],
  },
  {
    title: "Inspe??o visual",
    items: [
      "Observar filtros, serpentinas, dreno e bandeja conforme acesso permitido.",
      "Registrar fixa??o, ru?do, vibra??o e sinais vis?veis de vazamento.",
      "Observar condi??es el?tricas vis?veis sem executar interven??o fora do escopo.",
    ],
  },
  {
    title: "Funcionamento",
    items: [
      "Executar o teste previsto pela empresa e pelo fabricante.",
      "Registrar temperatura e outras medi??es somente quando aplic?veis e com instrumento adequado.",
      "Anotar n?o conformidades, a??o recomendada e necessidade de retorno.",
    ],
  },
  {
    title: "Fechamento",
    items: [
      "Tirar fotos do antes, do depois e das n?o conformidades relevantes.",
      "Descrever o que foi inspecionado, limpo, ajustado ou apenas recomendado.",
      "Identificar t?cnico, data, hor?rio e respons?vel que acompanhou a visita.",
    ],
  },
];

const checklistFaq = [
  {
    question: "Com que frequ?ncia fazer a manuten??o?",
    answer:
      "Depende do equipamento, do uso, do fabricante, do ambiente, do projeto, do contrato e das obriga??es aplic?veis. Defina a periodicidade com o respons?vel t?cnico.",
  },
  {
    question: "Esse checklist serve para qualquer aparelho?",
    answer:
      "Ele ? uma base de campo. Adapte os itens ao tipo de equipamento, ao manual do fabricante, ao escopo e ?s condi??es do local.",
  },
  {
    question: "Posso usar este checklist como PMOC?",
    answer:
      "N?o sozinho. Ele apoia uma visita preventiva, mas n?o substitui o plano, os controles e a revis?o t?cnica do PMOC.",
  },
  {
    question: "O que vale a pena registrar?",
    answer:
      "Identifica??o, itens executados, n?o conformidades, medi??es aplic?veis, evid?ncias, a??es recomendadas e respons?veis.",
  },
];

export function PreventiveChecklistPage() {
  const page = getPublicPage("/recursos/checklist-manutencao-preventiva-ar-condicionado");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Base adapt?vel para a visita"
        title="Checklist de manuten??o preventiva de ar-condicionado para usar na visita"
        description="Planeje a inspe??o, registre observa??es e deixe claro o que foi executado. Esta lista ? uma refer?ncia gen?rica: adapte ao equipamento, ao fabricante, ao contrato e ? orienta??o do respons?vel t?cnico."
        primary={{
          label: "Baixar checklist (.csv)",
          href: "/downloads/checklist-manutencao-preventiva-ar-condicionado.csv",
          external: true,
        }}
        secondary={{
          label: "Abrir vers?o para imprimir",
          href: "/downloads/checklist-manutencao-preventiva-ar-condicionado.html",
          external: true,
        }}
        notes={["Sem cadastro", "Itens adapt?veis", "Vers?o imprim?vel"]}
        visual={<ChecklistPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <ArticleMeta />
          <SectionHeading
            eyebrow="Checklist completo"
            title="Marque, observe e registre a a??o recomendada"
            description="Diferencie inspe??o de interven??o. Encontrar uma condi??o n?o significa que qualquer pessoa deva corrigi-la sem autoriza??o, ferramenta ou habilita??o."
          />
          <div className="m-checklist-groups">
            {checklistGroups.map((group) => (
              <section key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>
                      <span aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <DownloadActions
            editHref="/downloads/checklist-manutencao-preventiva-ar-condicionado.csv"
            printHref="/downloads/checklist-manutencao-preventiva-ar-condicionado.html"
            editLabel="Baixar checklist (.csv)"
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="Campos de apoio"
              title="Foto, medi??o e observa??o precisam de contexto"
              description="Uma foto sem identifica??o ou uma medi??o sem condi??o de teste pode gerar mais d?vida do que clareza. Relacione cada evid?ncia ao equipamento, ao item observado e ? a??o recomendada."
            />
            <ul className="m-check-list">
              <li><CheckSquare2 aria-hidden="true" /> Equipamento e ambiente identificados</li>
              <li><CheckSquare2 aria-hidden="true" /> Condi??o encontrada descrita</li>
              <li><CheckSquare2 aria-hidden="true" /> Interven??o ou recomenda??o diferenciadas</li>
              <li><CheckSquare2 aria-hidden="true" /> Respons?vel e data registrados</li>
            </ul>
          </div>
          <LegalNote>
            N?o prescrevemos periodicidade, produto qu?mico, corre??o el?trica, recarga de
            fluido ou valor de medi??o universal. Siga fabricante, projeto, regras aplic?veis
            e profissional habilitado.
          </LegalNote>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">Do checklist ao PMOC</span>
            <h2>Use a lista na visita; use o sistema para preservar a sequ?ncia</h2>
            <p>
              No ClimaPro, os itens da execu??o ficam ligados ao equipamento, com evid?ncias,
              assinaturas e hist?rico. O plano e a revis?o t?cnica continuam fazendo parte do
              processo.
            </p>
          </div>
          <Link className="m-button m-button--light" to="/solucoes/sistema-pmoc">
            Ver sistema PMOC
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Uso respons?vel" title="Perguntas frequentes" />
          <FaqList items={checklistFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Leve o checklist para uma rotina organizada"
          description="Baixe a vers?o de campo ou veja como o ClimaPro liga execu??o, equipamento e hist?rico."
          secondary={{ label: "Ler o guia PMOC", href: "/recursos/guia-pmoc" }}
        />
      </div>
    </MarketingLayout>
  );
}

const guideFaq = [
  {
    question: "PMOC ? obrigat?rio para toda instala??o?",
    answer:
      "A Lei n? 13.589/2018 fala em edif?cios de uso p?blico e coletivo com ambientes climatizados artificialmente. O caso concreto e ambientes com regras espec?ficas precisam de avalia??o profissional.",
  },
  {
    question: "A Lei n? 13.589/2018 cria uma regra de 60.000 BTU/h?",
    answer:
      "Esse corte n?o aparece no texto da Lei n? 13.589/2018. N?o use o n?mero como resposta autom?tica; valide os crit?rios aplic?veis com o respons?vel t?cnico e o ?rg?o competente.",
  },
  {
    question: "Quem assina o PMOC?",
    answer:
      "A resposta depende das atribui??es profissionais e do escopo. Consulte o profissional habilitado respons?vel pelo caso.",
  },
  {
    question: "Usar um software deixa a empresa regular?",
    answer:
      "N?o. O software ajuda a organizar dados e registros. A regularidade depende de condi??es reais, execu??o, documentos e responsabilidades.",
  },
  {
    question: "Por quanto tempo guardar os registros?",
    answer:
      "N?o h? um prazo universal apresentado neste guia. Valide a obriga??o aplic?vel, o contrato e a orienta??o t?cnica ou jur?dica.",
  },
];

export function PmocGuidePage() {
  const page = getPublicPage("/recursos/guia-pmoc");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Fontes oficiais e aplica??o pr?tica"
        title="Guia PMOC: como organizar plano, manuten??o e registros"
        description="PMOC ? a sigla de Plano de Manuten??o, Opera??o e Controle. Ele organiza a manuten??o dos sistemas de climatiza??o e os registros da rotina. A necessidade e o conte?do dependem do ambiente, da instala??o e das regras aplic?veis."
        primary={{
          label: "Ver sistema PMOC",
          href: "/solucoes/sistema-pmoc",
          external: false,
        }}
        secondary={{
          label: "Baixar checklist",
          href: "/recursos/checklist-manutencao-preventiva-ar-condicionado",
        }}
        notes={["Conte?do informativo", "Links para fontes oficiais", "Sem regra simplificada de BTU/h"]}
        visual={<GuidePreview />}
      />

      <article>
        <section className="m-section m-section--paper">
          <div className="m-container m-article">
            <ArticleMeta />
            <h2>O que significa PMOC</h2>
            <p>
              O plano re?ne como a manuten??o, a opera??o e o controle ser?o organizados. Na
              pr?tica, isso envolve identificar a instala??o e os equipamentos, planejar as
              atividades, executar o que foi definido e manter registros que permitam
              acompanhar a rotina.
            </p>
            <p>
              Um arquivo criado uma vez e esquecido n?o resolve a opera??o. O valor do PMOC
              aparece quando o plano orienta as visitas e cada execu??o retorna como hist?rico
              verific?vel.
            </p>

            <h2>Quando a Lei n? 13.589/2018 se aplica</h2>
            <p>
              O artigo 1? estabelece que edif?cios de uso p?blico e coletivo que possuem
              ambientes de ar interior climatizado artificialmente devem dispor de PMOC dos
              respectivos sistemas. O texto tamb?m trata de ambientes climatizados de uso
              restrito em rela??o aos regulamentos espec?ficos.
            </p>
            <p>
              Isso n?o autoriza respostas autom?ticas para qualquer instala??o. Uso do
              edif?cio, sistema, escopo e regras complementares precisam ser avaliados no caso
              concreto. A conhecida afirma??o de que a lei s? valeria acima de 60.000 BTU/h
              n?o est? no texto da Lei n? 13.589/2018.
            </p>

            <h2>O que a manuten??o precisa considerar</h2>
            <p>
              O artigo 3? remete a par?metros de qualidade do ar interior e ?s refer?ncias
              aplic?veis. A Portaria GM/MS n? 3.523/1998 traz regulamento t?cnico e anexos; a
              RE Anvisa n? 9/2003 apresenta padr?es referenciais de qualidade do ar interior.
              Normas t?cnicas e exig?ncias espec?ficas devem ser consultadas legalmente e
              interpretadas pelo respons?vel habilitado.
            </p>

            <h2>Plano anual, execu??o e registros</h2>
            <div className="m-article-steps">
              <div><span>01</span><strong>Inventariar</strong><p>Clientes, ambientes, sistemas e equipamentos.</p></div>
              <div><span>02</span><strong>Planejar</strong><p>Atividades, periodicidades, respons?veis e datas.</p></div>
              <div><span>03</span><strong>Executar</strong><p>Checklist, observa??es, medi??es aplic?veis e evid?ncias.</p></div>
              <div><span>04</span><strong>Revisar</strong><p>Conte?do t?cnico, n?o conformidades e documentos.</p></div>
              <div><span>05</span><strong>Preservar</strong><p>Hist?rico, vers?es e acesso para consulta.</p></div>
            </div>

            <h2>O papel do respons?vel t?cnico</h2>
            <p>
              O software n?o decide a atribui??o profissional, n?o produz conformidade por si
              s? e n?o substitui an?lise, laudo, ART, TRT ou outros documentos aplic?veis. O
              respons?vel habilitado precisa revisar o escopo e o conte?do conforme suas
              atribui??es e as exig?ncias do caso.
            </p>

            <h2>O que um sistema ajuda a controlar</h2>
            <p>
              Uma ferramenta pode ligar equipamento, cronograma, checklist, evid?ncia,
              assinatura coletada, revis?o e hist?rico. Ela reduz a dispers?o da informa??o;
              a qualidade do dado e a responsabilidade sobre o trabalho permanecem com as
              pessoas e empresas envolvidas.
            </p>

            <LegalNote>
              Este guia ? educacional e n?o substitui aconselhamento jur?dico ou t?cnico.
              Consulte as fontes oficiais abaixo e valide o caso com profissional habilitado.
            </LegalNote>
            <SourceLinks sources={officialSources} />
          </div>
        </section>
      </article>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="D?vidas iniciais" title="Perguntas frequentes sobre PMOC" />
          <FaqList items={guideFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Transforme o plano em rotina acompanh?vel"
          description="Veja como o ClimaPro conecta cronograma anual, execu??o por equipamento e hist?rico."
          primaryLabel="Organizar um PMOC"
          secondary={{ label: "Baixar checklist de preventiva", href: "/recursos/checklist-manutencao-preventiva-ar-condicionado" }}
        />
      </div>
    </MarketingLayout>
  );
}

const calculatorFaq = [
  {
    question: "A calculadora mostra o pre?o de mercado?",
    answer:
      "N?o. Ela transforma os seus custos e a margem informada em uma refer?ncia pr?pria. Pesquisa comercial e posicionamento ainda fazem parte da decis?o.",
  },
  {
    question: "Por que a margem ? dividida, e n?o apenas somada?",
    answer:
      "Porque margem sobre o pre?o ? diferente de acr?scimo sobre o custo. A f?rmula usada ? pre?o = custo total ? (1 ? margem).",
  },
  {
    question: "Devo incluir pe?as e an?lises?",
    answer:
      "Inclua nos insumos apenas o que pertence ao escopo estimado. Pe?as, an?lises, impostos, responsabilidade t?cnica e riscos podem exigir linhas separadas na proposta.",
  },
  {
    question: "O valor por equipamento ? uma mensalidade?",
    answer:
      "N?o. ? apenas o pre?o anual dividido pela quantidade informada. O resultado mensal tamb?m ? uma refer?ncia de rateio, n?o uma recomenda??o de cobran?a.",
  },
];

export function PmocCalculatorPage() {
  const page = getPublicPage("/recursos/calculadora-preco-pmoc");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Custo direto + indiretos + margem"
        title="Calculadora de pre?o de PMOC com f?rmula aberta"
        description="Informe a frequ?ncia das visitas, o tempo de equipe, o deslocamento, os insumos, os custos indiretos e a margem desejada. A ferramenta estima um pre?o anual de refer?ncia sem esconder como chegou ao resultado."
        primary={{
          label: "Usar a calculadora",
          href: "#calculadora",
          external: true,
        }}
        secondary={{
          label: "Ler o guia PMOC",
          href: "/recursos/guia-pmoc",
        }}
        notes={["Uso gratuito", "Sem envio de dados", "Resultado recalculado no navegador"]}
        visual={<CalculatorPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <ArticleMeta />
          <PriceCalculator />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="F?rmula usada"
              title="O resultado pode ser conferido linha por linha"
              description="Primeiro somamos m?o de obra, deslocamento e insumos. Depois aplicamos os custos indiretos. Por fim, dividimos pelo complemento da margem desejada."
            />
          </div>
          <div className="m-formula">
            <span>1</span><code>direto = m?o de obra + deslocamento + insumos</code>
            <span>2</span><code>custo = direto ? (1 + indiretos)</code>
            <span>3</span><code>pre?o = custo ? (1 ? margem)</code>
          </div>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container">
          <SectionHeading
            eyebrow="Antes de enviar a proposta"
            title="A conta n?o conhece todo o seu escopo"
            description="Use o valor como ponto de partida e fa?a uma revis?o comercial e t?cnica."
          />
          <FeatureGrid
            columns={4}
            items={[
              {
                icon: Wrench,
                title: "Pe?as e corretivas",
                description: "Defina se est?o inclu?das, limitadas ou cobradas separadamente.",
              },
              {
                icon: ShieldCheck,
                title: "Responsabilidade t?cnica",
                description: "Considere os custos e documentos aplic?veis ao contrato real.",
              },
              {
                icon: FilePenLine,
                title: "Impostos e condi??es",
                description: "Inclua tributa??o, prazo, reajuste e forma de pagamento.",
              },
              {
                icon: ClipboardCheck,
                title: "Risco e sazonalidade",
                description: "Avalie acesso, urg?ncia, dist?ncia, demanda e conting?ncias.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <LegalNote>
            A calculadora n?o substitui or?amento, contador, respons?vel t?cnico ou an?lise do
            contrato. Nenhum dado digitado ? enviado ao ClimaPro; o c?lculo ocorre no
            navegador.
          </LegalNote>
          <SectionHeading eyebrow="Sobre o c?lculo" title="Perguntas frequentes" />
          <FaqList items={calculatorFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Depois do pre?o, organize a execu??o"
          description="Use o ClimaPro para ligar cronograma, equipamentos, visitas e hist?rico do contrato."
          primaryLabel="Criar conta gratuita"
          secondary={{ label: "Conhecer o sistema PMOC", href: "/solucoes/sistema-pmoc" }}
        />
      </div>
    </MarketingLayout>
  );
}

function OrderTemplatePreview() {
  return (
    <div className="m-document-preview m-document-preview--hero" aria-label="Pr?via do arquivo de ordem de servi?o">
      <span>MODELO EDIT?VEL ? OS N? ______</span>
      <strong>Prestadora e cliente</strong><i />
      <strong>Equipamento e solicita??o</strong><i /><i />
      <strong>Diagn?stico e execu??o</strong><i /><i />
      <div><FileDown aria-hidden="true" /> .DOC + vers?o para imprimir</div>
    </div>
  );
}

function ChecklistPreview() {
  return (
    <div className="m-checklist-preview" aria-label="Pr?via do checklist">
      <span>PREVENTIVA ? CAMPO</span>
      <strong>Equipamento: __________________</strong>
      {["Identifica??o confirmada", "Condi??o visual registrada", "Dreno e filtros observados", "Teste previsto executado", "Evid?ncias anexadas"].map((item, index) => (
        <div key={item}><span>{index < 2 ? "?" : ""}</span>{item}</div>
      ))}
      <small>Observa??o / a??o recomendada</small>
      <i />
    </div>
  );
}

function GuidePreview() {
  return (
    <div className="m-guide-preview" aria-label="Estrutura do guia PMOC">
      <span>GUIA PMOC ? 2026</span>
      <div><strong>01</strong><p>Enquadramento</p></div>
      <div><strong>02</strong><p>Plano anual</p></div>
      <div><strong>03</strong><p>Execu??o</p></div>
      <div><strong>04</strong><p>Revis?o t?cnica</p></div>
      <div><strong>05</strong><p>Hist?rico</p></div>
    </div>
  );
}

function CalculatorPreview() {
  return (
    <div className="m-calc-preview" aria-label="Pr?via da calculadora">
      <span>ESTIMATIVA ANUAL</span>
      <div><small>M?o de obra</small><strong>R$ 1.080</strong></div>
      <div><small>Deslocamento</small><strong>R$ 144</strong></div>
      <div><small>Insumos</small><strong>R$ 480</strong></div>
      <i />
      <div className="is-total"><small>Pre?o de refer?ncia</small><strong>R$ 2.612,80</strong></div>
    </div>
  );
}
