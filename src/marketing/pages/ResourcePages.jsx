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

const osFields = [
  ["Identificação", "Número, data, horário, prestadora, técnico, cliente e local."],
  ["Equipamento", "Tipo, marca, modelo, série, capacidade e ambiente atendido."],
  ["Solicitação", "Defeito relatado, sintomas e condição informada pelo cliente."],
  ["Execução", "Diagnóstico, serviço realizado, peças, materiais e observações."],
  ["Evidências", "Espaço para fotos, medições aplicáveis e ação recomendada."],
  ["Aceite", "Nome e assinatura de técnico e cliente, além das condições comerciais."],
];

const osFaq = [
  {
    question: "O modelo serve para instalação?",
    answer:
      "Sim. Adapte a solicitação, os materiais, os testes e o aceite ao escopo da instalação.",
  },
  {
    question: "Posso editar o arquivo?",
    answer:
      "Sim. A versão .doc abre em editores compatíveis com Word. Também há uma versão HTML pronta para imprimir.",
  },
  {
    question: "O modelo substitui um laudo técnico?",
    answer:
      "Não. Ele documenta uma ordem de serviço e não substitui laudo, ART, TRT ou análise técnica.",
  },
  {
    question: "Serve para PMOC?",
    answer:
      "A OS ajuda a registrar uma visita. PMOC envolve plano, execução, controle e responsabilidades próprios.",
  },
  {
    question: "Preciso coletar assinatura?",
    answer:
      "O modelo oferece o campo. A decisão operacional e jurídica deve considerar o contrato e a orientação profissional da empresa.",
  },
];

export function ServiceOrderTemplatePage() {
  const page = getPublicPage("/recursos/modelo-ordem-servico-ar-condicionado");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Download sem cadastro"
        title="Modelo de ordem de serviço para ar-condicionado, pronto para preencher"
        description="Use um arquivo editável para registrar cliente, equipamento, solicitação, diagnóstico, serviço, peças, valores, evidências e aceite. O modelo é uma base de trabalho: adapte os campos ao seu contrato e ao tipo de atendimento."
        primary={{
          label: "Baixar modelo editável (.doc)",
          href: "/downloads/modelo-ordem-servico-ar-condicionado.doc",
          external: true,
        }}
        secondary={{
          label: "Abrir versão para imprimir",
          href: "/downloads/modelo-ordem-servico-ar-condicionado.html",
          external: true,
        }}
        notes={["Sem formulário", "Arquivo editável", "Exemplo fictício incluído"]}
        visual={<OrderTemplatePreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container m-reading-width">
          <ArticleMeta />
          <SectionHeading
            eyebrow="Entrega imediata"
            title="Baixe, edite e teste com sua próxima visita"
            description="O arquivo .doc é compatível com editores que abrem documentos do Word. A versão HTML pode ser preenchida à mão depois de impressa ou salva como PDF pelo navegador."
          />
          <DownloadActions
            editHref="/downloads/modelo-ordem-servico-ar-condicionado.doc"
            printHref="/downloads/modelo-ordem-servico-ar-condicionado.html"
            editLabel="Baixar modelo editável (.doc)"
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Campos do modelo"
            title="O que registrar antes, durante e depois da visita"
            description="Os campos foram organizados para que outra pessoa consiga entender o atendimento sem depender da memória de quem executou."
          />
          <div className="m-field-table" role="table" aria-label="Campos do modelo de ordem de serviço">
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
            <h2>Uma OS útil conta a sequência do atendimento</h2>
          </div>
          <ol className="m-compact-steps">
            <li><strong>Antes:</strong> confirme cliente, local, equipamento, solicitação, data e responsável.</li>
            <li><strong>Durante:</strong> registre diagnóstico, ações, peças, medições aplicáveis e evidências.</li>
            <li><strong>Depois:</strong> descreva pendências, valores, condições e o aceite coletado.</li>
          </ol>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <SectionHeading
              eyebrow="OS ou PMOC?"
              title="O documento depende da finalidade"
              description="A ordem de serviço narra um atendimento. O PMOC organiza um plano continuado de manutenção, operação e controle. Uma visita do PMOC pode gerar registros operacionais, mas a OS isolada não substitui o plano."
            />
            <Link className="m-inline-link" to="/recursos/guia-pmoc">
              Entender a rotina do PMOC
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <LegalNote>
            Este modelo não vale automaticamente como contrato, laudo ou garantia de
            pagamento. Revise as condições comerciais, jurídicas e técnicas do seu processo.
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
          title="Transforme a OS em histórico de atendimento"
          description="Depois de testar os campos, leve chamados, agenda e registros para um fluxo digital."
          secondary={{ label: "Conhecer o fluxo de chamados", href: "/solucoes/ordem-servico-ar-condicionado" }}
        />
      </div>
    </MarketingLayout>
  );
}

const checklistGroups = [
  {
    title: "Identificação e segurança",
    items: [
      "Confirmar cliente, ambiente e identificação do equipamento.",
      "Registrar condição visual antes de qualquer intervenção.",
      "Verificar se a atividade prevista exige isolamento, autorização ou profissional específico.",
    ],
  },
  {
    title: "Inspeção visual",
    items: [
      "Observar filtros, serpentinas, dreno e bandeja conforme acesso permitido.",
      "Registrar fixação, ruído, vibração e sinais visíveis de vazamento.",
      "Observar condições elétricas visíveis sem executar intervenção fora do escopo.",
    ],
  },
  {
    title: "Funcionamento",
    items: [
      "Executar o teste previsto pela empresa e pelo fabricante.",
      "Registrar temperatura e outras medições somente quando aplicáveis e com instrumento adequado.",
      "Anotar não conformidades, ação recomendada e necessidade de retorno.",
    ],
  },
  {
    title: "Fechamento",
    items: [
      "Tirar fotos do antes, do depois e das não conformidades relevantes.",
      "Descrever o que foi inspecionado, limpo, ajustado ou apenas recomendado.",
      "Identificar técnico, data, horário e responsável que acompanhou a visita.",
    ],
  },
];

const checklistFaq = [
  {
    question: "Com que frequência fazer a manutenção?",
    answer:
      "Depende do equipamento, do uso, do fabricante, do ambiente, do projeto, do contrato e das obrigações aplicáveis. Defina a periodicidade com o responsável técnico.",
  },
  {
    question: "Esse checklist serve para qualquer aparelho?",
    answer:
      "Ele é uma base de campo. Adapte os itens ao tipo de equipamento, ao manual do fabricante, ao escopo e às condições do local.",
  },
  {
    question: "Posso usar este checklist como PMOC?",
    answer:
      "Não sozinho. Ele apoia uma visita preventiva, mas não substitui o plano, os controles e a revisão técnica do PMOC.",
  },
  {
    question: "O que vale a pena registrar?",
    answer:
      "Identificação, itens executados, não conformidades, medições aplicáveis, evidências, ações recomendadas e responsáveis.",
  },
];

export function PreventiveChecklistPage() {
  const page = getPublicPage("/recursos/checklist-manutencao-preventiva-ar-condicionado");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Base adaptável para a visita"
        title="Checklist de manutenção preventiva de ar-condicionado para usar na visita"
        description="Planeje a inspeção, registre observações e deixe claro o que foi executado. Esta lista é uma referência genérica: adapte ao equipamento, ao fabricante, ao contrato e à orientação do responsável técnico."
        primary={{
          label: "Baixar checklist (.csv)",
          href: "/downloads/checklist-manutencao-preventiva-ar-condicionado.csv",
          external: true,
        }}
        secondary={{
          label: "Abrir versão para imprimir",
          href: "/downloads/checklist-manutencao-preventiva-ar-condicionado.html",
          external: true,
        }}
        notes={["Sem cadastro", "Itens adaptáveis", "Versão imprimível"]}
        visual={<ChecklistPreview />}
      />

      <section className="m-section m-section--paper">
        <div className="m-container">
          <ArticleMeta />
          <SectionHeading
            eyebrow="Checklist completo"
            title="Marque, observe e registre a ação recomendada"
            description="Diferencie inspeção de intervenção. Encontrar uma condição não significa que qualquer pessoa deva corrigi-la sem autorização, ferramenta ou habilitação."
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
              title="Foto, medição e observação precisam de contexto"
              description="Uma foto sem identificação ou uma medição sem condição de teste pode gerar mais dúvida do que clareza. Relacione cada evidência ao equipamento, ao item observado e à ação recomendada."
            />
            <ul className="m-check-list">
              <li><CheckSquare2 aria-hidden="true" /> Equipamento e ambiente identificados</li>
              <li><CheckSquare2 aria-hidden="true" /> Condição encontrada descrita</li>
              <li><CheckSquare2 aria-hidden="true" /> Intervenção ou recomendação diferenciadas</li>
              <li><CheckSquare2 aria-hidden="true" /> Responsável e data registrados</li>
            </ul>
          </div>
          <LegalNote>
            Não prescrevemos periodicidade, produto químico, correção elétrica, recarga de
            fluido ou valor de medição universal. Siga fabricante, projeto, regras aplicáveis
            e profissional habilitado.
          </LegalNote>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container m-split m-split--center">
          <div>
            <span className="m-eyebrow m-eyebrow--light">Do checklist ao PMOC</span>
            <h2>Use a lista na visita; use o sistema para preservar a sequência</h2>
            <p>
              No ClimaPro, os itens da execução ficam ligados ao equipamento, com evidências,
              assinaturas e histórico. O plano e a revisão técnica continuam fazendo parte do
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
          <SectionHeading eyebrow="Uso responsável" title="Perguntas frequentes" />
          <FaqList items={checklistFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Leve o checklist para uma rotina organizada"
          description="Baixe a versão de campo ou veja como o ClimaPro liga execução, equipamento e histórico."
          secondary={{ label: "Ler o guia PMOC", href: "/recursos/guia-pmoc" }}
        />
      </div>
    </MarketingLayout>
  );
}

const guideFaq = [
  {
    question: "PMOC é obrigatório para toda instalação?",
    answer:
      "A Lei nº 13.589/2018 fala em edifícios de uso público e coletivo com ambientes climatizados artificialmente. O caso concreto e ambientes com regras específicas precisam de avaliação profissional.",
  },
  {
    question: "A Lei nº 13.589/2018 cria uma regra de 60.000 BTU/há",
    answer:
      "Esse corte não aparece no texto da Lei nº 13.589/2018. Não use o número como resposta automática; valide os critérios aplicáveis com o responsável técnico e o órgão competente.",
  },
  {
    question: "Quem assina o PMOC?",
    answer:
      "A resposta depende das atribuições profissionais e do escopo. Consulte o profissional habilitado responsável pelo caso.",
  },
  {
    question: "Usar um software deixa a empresa regular?",
    answer:
      "Não. O software ajuda a organizar dados e registros. A regularidade depende de condições reais, execução, documentos e responsabilidades.",
  },
  {
    question: "Por quanto tempo guardar os registros?",
    answer:
      "Não há um prazo universal apresentado neste guia. Valide a obrigação aplicável, o contrato e a orientação técnica ou jurídica.",
  },
];

export function PmocGuidePage() {
  const page = getPublicPage("/recursos/guia-pmoc");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Fontes oficiais e aplicação prática"
        title="Guia PMOC: como organizar plano, manutenção e registros"
        description="PMOC é a sigla de Plano de Manutenção, Operação e Controle. Ele organiza a manutenção dos sistemas de climatização e os registros da rotina. A necessidade e o conteúdo dependem do ambiente, da instalação e das regras aplicáveis."
        primary={{
          label: "Ver sistema PMOC",
          href: "/solucoes/sistema-pmoc",
          external: false,
        }}
        secondary={{
          label: "Baixar checklist",
          href: "/recursos/checklist-manutencao-preventiva-ar-condicionado",
        }}
        notes={["Conteúdo informativo", "Links para fontes oficiais", "Sem regra simplificada de BTU/h"]}
        visual={<GuidePreview />}
      />

      <article>
        <section className="m-section m-section--paper">
          <div className="m-container m-article">
            <ArticleMeta />
            <h2>O que significa PMOC</h2>
            <p>
              O plano reúne como a manutenção, a operação e o controle serão organizados. Na
              prática, isso envolve identificar a instalação e os equipamentos, planejar as
              atividades, executar o que foi definido e manter registros que permitam
              acompanhar a rotina.
            </p>
            <p>
              Um arquivo criado uma vez e esquecido não resolve a operação. O valor do PMOC
              aparece quando o plano orienta as visitas e cada execução retorna como histórico
              verificável.
            </p>

            <h2>Quando a Lei nº 13.589/2018 se aplica</h2>
            <p>
              O artigo 1º estabelece que edifícios de uso público e coletivo que possuem
              ambientes de ar interior climatizado artificialmente devem dispor de PMOC dos
              respectivos sistemas. O texto também trata de ambientes climatizados de uso
              restrito em relação aos regulamentos específicos.
            </p>
            <p>
              Isso não autoriza respostas automáticas para qualquer instalação. Uso do
              edifício, sistema, escopo e regras complementares precisam ser avaliados no caso
              concreto. A conhecida afirmação de que a lei só valeria acima de 60.000 BTU/h
              não está no texto da Lei nº 13.589/2018.
            </p>

            <h2>O que a manutenção precisa considerar</h2>
            <p>
              O artigo 3º remete a parâmetros de qualidade do ar interior e às referências
              aplicáveis. A Portaria GM/MS nº 3.523/1998 traz regulamento técnico e anexos; a
              RE Anvisa nº 9/2003 apresenta padrões referenciais de qualidade do ar interior.
              Normas técnicas e exigências específicas devem ser consultadas legalmente e
              interpretadas pelo responsável habilitado.
            </p>

            <h2>Plano anual, execução e registros</h2>
            <div className="m-article-steps">
              <div><span>01</span><strong>Inventariar</strong><p>Clientes, ambientes, sistemas e equipamentos.</p></div>
              <div><span>02</span><strong>Planejar</strong><p>Atividades, periodicidades, responsáveis e datas.</p></div>
              <div><span>03</span><strong>Executar</strong><p>Checklist, observações, medições aplicáveis e evidências.</p></div>
              <div><span>04</span><strong>Revisar</strong><p>Conteúdo técnico, não conformidades e documentos.</p></div>
              <div><span>05</span><strong>Preservar</strong><p>Histórico, versões e acesso para consulta.</p></div>
            </div>

            <h2>O papel do responsável técnico</h2>
            <p>
              O software não decide a atribuição profissional, não produz conformidade por si
              só e não substitui análise, laudo, ART, TRT ou outros documentos aplicáveis. O
              responsável habilitado precisa revisar o escopo e o conteúdo conforme suas
              atribuições e as exigências do caso.
            </p>

            <h2>O que um sistema ajuda a controlar</h2>
            <p>
              Uma ferramenta pode ligar equipamento, cronograma, checklist, evidência,
              assinatura coletada, revisão e histórico. Ela reduz a dispersão da informação;
              a qualidade do dado e a responsabilidade sobre o trabalho permanecem com as
              pessoas e empresas envolvidas.
            </p>

            <LegalNote>
              Este guia é educacional e não substitui aconselhamento jurídico ou técnico.
              Consulte as fontes oficiais abaixo e valide o caso com profissional habilitado.
            </LegalNote>
            <SourceLinks sources={officialSources} />
          </div>
        </section>
      </article>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <SectionHeading eyebrow="Dúvidas iniciais" title="Perguntas frequentes sobre PMOC" />
          <FaqList items={guideFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Transforme o plano em rotina acompanhável"
          description="Veja como o ClimaPro conecta cronograma anual, execução por equipamento e histórico."
          primaryLabel="Organizar um PMOC"
          secondary={{ label: "Baixar checklist de preventiva", href: "/recursos/checklist-manutencao-preventiva-ar-condicionado" }}
        />
      </div>
    </MarketingLayout>
  );
}

const calculatorFaq = [
  {
    question: "A calculadora mostra o preço de mercado?",
    answer:
      "Não. Ela transforma os seus custos e a margem informada em uma referência própria. Pesquisa comercial e posicionamento ainda fazem parte da decisão.",
  },
  {
    question: "Por que a margem é dividida, e não apenas somada?",
    answer:
      "Porque margem sobre o preço é diferente de acréscimo sobre o custo. A fórmula usada é preço = custo total ÷ (1 − margem).",
  },
  {
    question: "Devo incluir peças e análises?",
    answer:
      "Inclua nos insumos apenas o que pertence ao escopo estimado. Peças, análises, impostos, responsabilidade técnica e riscos podem exigir linhas separadas na proposta.",
  },
  {
    question: "O valor por equipamento é uma mensalidade?",
    answer:
      "Não. É apenas o preço anual dividido pela quantidade informada. O resultado mensal também é uma referência de rateio, não uma recomendação de cobrança.",
  },
];

export function PmocCalculatorPage() {
  const page = getPublicPage("/recursos/calculadora-preco-pmoc");

  return (
    <MarketingLayout page={page}>
      <Hero
        eyebrow="Custo direto + indiretos + margem"
        title="Calculadora de preço de PMOC com fórmula aberta"
        description="Informe a frequência das visitas, o tempo de equipe, o deslocamento, os insumos, os custos indiretos e a margem desejada. A ferramenta estima um preço anual de referência sem esconder como chegou ao resultado."
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
              eyebrow="Fórmula usada"
              title="O resultado pode ser conferido linha por linha"
              description="Primeiro somamos mão de obra, deslocamento e insumos. Depois aplicamos os custos indiretos. Por fim, dividimos pelo complemento da margem desejada."
            />
          </div>
          <div className="m-formula">
            <span>1</span><code>direto = mão de obra + deslocamento + insumos</code>
            <span>2</span><code>custo = direto × (1 + indiretos)</code>
            <span>3</span><code>preço = custo ÷ (1 − margem)</code>
          </div>
        </div>
      </section>

      <section className="m-section m-section--ink">
        <div className="m-container">
          <SectionHeading
            eyebrow="Antes de enviar a proposta"
            title="A conta não conhece todo o seu escopo"
            description="Use o valor como ponto de partida e faça uma revisão comercial e técnica."
          />
          <FeatureGrid
            columns={4}
            items={[
              {
                icon: Wrench,
                title: "Peças e corretivas",
                description: "Defina se estão incluídas, limitadas ou cobradas separadamente.",
              },
              {
                icon: ShieldCheck,
                title: "Responsabilidade técnica",
                description: "Considere os custos e documentos aplicáveis ao contrato real.",
              },
              {
                icon: FilePenLine,
                title: "Impostos e condições",
                description: "Inclua tributação, prazo, reajuste e forma de pagamento.",
              },
              {
                icon: ClipboardCheck,
                title: "Risco e sazonalidade",
                description: "Avalie acesso, urgência, distância, demanda e contingências.",
              },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container m-reading-width">
          <LegalNote>
            A calculadora não substitui orçamento, contador, responsável técnico ou análise do
            contrato. Nenhum dado digitado é enviado ao ClimaPro; o cálculo ocorre no
            navegador.
          </LegalNote>
          <SectionHeading eyebrow="Sobre o cálculo" title="Perguntas frequentes" />
          <FaqList items={calculatorFaq} />
        </div>
      </section>

      <div className="m-container m-cta-wrap">
        <CtaBand
          title="Depois do preço, organize a execução"
          description="Use o ClimaPro para ligar cronograma, equipamentos, visitas e histórico do contrato."
          primaryLabel="Criar conta gratuita"
          secondary={{ label: "Conhecer o sistema PMOC", href: "/solucoes/sistema-pmoc" }}
        />
      </div>
    </MarketingLayout>
  );
}

function OrderTemplatePreview() {
  return (
    <div className="m-document-preview m-document-preview--hero" aria-label="Prévia do arquivo de ordem de serviço">
      <span>MODELO EDITÁVEL · OS Nº ______</span>
      <strong>Prestadora e cliente</strong><i />
      <strong>Equipamento e solicitação</strong><i /><i />
      <strong>Diagnóstico e execução</strong><i /><i />
      <div><FileDown aria-hidden="true" /> .DOC + versão para imprimir</div>
    </div>
  );
}

function ChecklistPreview() {
  return (
    <div className="m-checklist-preview" aria-label="Prévia do checklist">
      <span>PREVENTIVA · CAMPO</span>
      <strong>Equipamento: __________________</strong>
      {["Identificação confirmada", "Condição visual registrada", "Dreno e filtros observados", "Teste previsto executado", "Evidências anexadas"].map((item, index) => (
        <div key={item}><span>{index < 2 ? "✓" : ""}</span>{item}</div>
      ))}
      <small>Observação / ação recomendada</small>
      <i />
    </div>
  );
}

function GuidePreview() {
  return (
    <div className="m-guide-preview" aria-label="Estrutura do guia PMOC">
      <span>GUIA PMOC · 2026</span>
      <div><strong>01</strong><p>Enquadramento</p></div>
      <div><strong>02</strong><p>Plano anual</p></div>
      <div><strong>03</strong><p>Execução</p></div>
      <div><strong>04</strong><p>Revisão técnica</p></div>
      <div><strong>05</strong><p>Histórico</p></div>
    </div>
  );
}

function CalculatorPreview() {
  return (
    <div className="m-calc-preview" aria-label="Prévia da calculadora">
      <span>ESTIMATIVA ANUAL</span>
      <div><small>Mão de obra</small><strong>R$ 1.080</strong></div>
      <div><small>Deslocamento</small><strong>R$ 144</strong></div>
      <div><small>Insumos</small><strong>R$ 480</strong></div>
      <i />
      <div className="is-total"><small>Preço de referência</small><strong>R$ 2.612,80</strong></div>
    </div>
  );
}
