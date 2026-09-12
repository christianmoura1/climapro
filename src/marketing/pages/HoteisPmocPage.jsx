import React from "react";
import { AlertTriangle, CalendarCheck2, ClipboardCheck, FileText, QrCode, ShieldCheck } from "lucide-react";
import MarketingLayout from "@/marketing/components/MarketingLayout";
import { FaqList, FeatureGrid, LegalNote, SectionHeading, SourceLinks } from "@/marketing/components/MarketingElements";
import FormularioLead from "@/marketing/components/FormularioLead";
import { getPublicPage } from "@/marketing/site-config";

const fontesOficiais = [
  { label: "Lei nº 13.589/2018 — Presidência da República", href: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13589.htm" },
  { label: "Portaria GM/MS nº 3.523/1998 — Biblioteca Virtual em Saúde", href: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/1998/anexo/anexo_prt3523_28_08_1998.pdf" },
  { label: "RE Anvisa nº 9/2003 — Biblioteca Virtual em Saúde", href: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2003/rdc0009_16_01_2003.html" },
];

// Página do CLIENTE FINAL, não da empresa de climatização.
//
// As outras páginas do site vendem o sistema para quem executa a manutenção.
// Um gerente de hotel que cai naquelas não entende que aquilo é para ele.
// Aqui o texto fala do risco dele com a vigilância sanitária, e o ClimaPro
// aparece como o que ele ganha junto: portal para acompanhar, não planilha.
//
// O enquadramento é de encaminhamento para empresa credenciada, e não de
// prestação de serviço pelo ClimaPro. Isso mantém a coerência com o resto do
// site, que diz em toda página que o ClimaPro é software.
export default function HoteisPmocPage() {
  const page = getPublicPage("/pmoc-para-hoteis");

  return (
    <MarketingLayout page={page}>
      <section className="m-hero">
        <div className="m-container m-hero__grid">
          <div className="m-hero__copy">
            <span className="m-eyebrow">Para hotéis, condomínios e redes</span>
            <h1>Seu hotel está em dia com o PMOC?</h1>
            <p className="m-hero__lead">
              A Lei 13.589/2018 exige Plano de Manutenção, Operação e Controle em edificação de uso
              público e coletivo com ar-condicionado. Quem fiscaliza é a vigilância sanitária, e o
              que ela pede não é o aparelho limpo: é o registro de que a manutenção aconteceu, visita
              por visita.
            </p>
            <div className="m-hero__actions">
              <a className="m-button" href="#contato">Quero o levantamento gratuito</a>
            </div>
            <ul className="m-hero__notes">
              <li>Levantamento de duas horas, sem custo e sem compromisso</li>
              <li>Empresa credenciada da sua região executa</li>
              <li>Você acompanha cada visita por um portal, não por planilha</li>
            </ul>
          </div>
          <div className="m-hero__visual">
            <div className="m-record">
              <div className="m-record__top">
                <span className="m-record__code">PMOC · 2026</span>
                <span className="m-status">Em dia</span>
              </div>
              <div className="m-record__client">
                <span>CLIENTE</span>
                <strong>Hotel Praia Norte</strong>
              </div>
              <dl className="m-record__rows">
                <div><dt>Quarto 412</dt><dd>Split 12.000 BTU/h</dd></div>
                <div><dt>Última visita</dt><dd>04 SET</dd></div>
                <div><dt>Próxima visita</dt><dd>04 OUT</dd></div>
              </dl>
              <div className="m-record__check">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>Checklist assinado</strong>
                  <span>18 itens, com foto antes e depois</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="O problema"
            title="Na maioria dos hotéis, o PMOC existe no papel e para por aí"
            description="O documento foi feito uma vez, na entrega da obra ou numa fiscalização antiga, e desde então ninguém registrou nada. O ar-condicionado até recebe manutenção, mas não sobra prova de quando, em qual máquina e o que foi feito. Na hora da fiscalização, é isso que falta."
          />
          <FeatureGrid
            items={[
              { icon: AlertTriangle, title: "Documento desatualizado", description: "PMOC de três anos atrás, sem registro de execução nenhum depois disso." },
              { icon: FileText, title: "Sem histórico por aparelho", description: "Ninguém sabe dizer quando o split do 412 foi limpo pela última vez." },
              { icon: ClipboardCheck, title: "Manutenção sem comprovação", description: "O serviço até acontece, mas não gera checklist, foto nem assinatura." },
            ]}
          />
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container">
          <SectionHeading
            eyebrow="Como funciona"
            title="Começa por um levantamento gratuito do seu parque"
            description="Vamos até o hotel, percorremos os andares e registramos cada evaporadora: onde está, marca, modelo e situação. Leva cerca de duas horas. Você recebe um documento com o que existe hoje, o que está sem registro e o que a lei pede no seu caso. Se estiver tudo certo, a gente diz isso e vai embora."
          />
          <FeatureGrid
            columns={4}
            items={[
              { icon: ClipboardCheck, title: "1. Levantamento", description: "Cadastramos o parque inteiro e mostramos a situação real da documentação." },
              { icon: FileText, title: "2. Proposta", description: "Preço por aparelho, periodicidade e o que entra em cada visita, sem letra miúda." },
              { icon: CalendarCheck2, title: "3. Execução", description: "Empresa credenciada da região faz as visitas na data combinada, com checklist e foto." },
              { icon: ShieldCheck, title: "4. Comprovação", description: "Caderno de manutenção sempre atualizado, pronto para mostrar à fiscalização." },
            ]}
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="O que muda no dia a dia"
            title="QR code na máquina e portal aberto para a sua equipe"
            description="Cada evaporadora recebe uma etiqueta. A camareira encontra o aparelho do 412 pingando, aponta a câmera do celular e abre o chamado ali mesmo, sem ligar para a manutenção e sem login. Você acompanha tudo pelo portal: a data da próxima visita de cada máquina, o checklist assinado da última e as fotos."
          />
          <FeatureGrid
            items={[
              { icon: QrCode, title: "Chamado em dez segundos", description: "Qualquer pessoa do hotel escaneia e reporta o problema, com foto do que está acontecendo." },
              { icon: CalendarCheck2, title: "Agenda visível", description: "Você sabe a data da próxima visita antes de ela acontecer, sem precisar cobrar." },
              { icon: ShieldCheck, title: "Prova pronta", description: "Caderno de manutenção com checklist, fotos e assinatura de cada execução." },
            ]}
          />
        </div>
      </section>

      <section className="m-section m-section--paper">
        <div className="m-container">
          <FormularioLead
            origem="/pmoc-para-hoteis"
            titulo="Agende o levantamento gratuito"
            descricao="Preencha e retornamos em até um dia útil para marcar a visita. Atendemos Vitória, Vila Velha, Serra, Cariacica e Guarapari."
          />
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading eyebrow="Dúvidas" title="Perguntas que sempre aparecem" />
          <FaqList
            items={[
              { question: "O PMOC é obrigatório para hotel?", answer: "A Lei nº 13.589/2018 trata de edificações de uso público e coletivo com ambientes climatizados artificialmente, o que alcança hotéis. O enquadramento exato do seu prédio e as exigências aplicáveis devem ser confirmados por um responsável técnico habilitado." },
              { question: "Quem executa a manutenção?", answer: "Uma empresa de climatização credenciada da sua região, com responsável técnico habilitado. O ClimaPro é o sistema onde o plano, a execução e as evidências ficam registrados e onde você acompanha tudo." },
              { question: "O levantamento custa alguma coisa?", answer: "Não. É uma visita de cerca de duas horas para mapear os equipamentos e a situação da documentação. Você fica com o diagnóstico mesmo que não contrate." },
              { question: "Já temos uma empresa que faz a manutenção. Serve?", answer: "Serve. Em muitos casos o serviço já é feito e o que falta é o registro. Podemos avaliar o que existe hoje e organizar a comprovação junto com quem já atende o hotel." },
              { question: "Quanto tempo leva para regularizar?", answer: "Depende do tamanho do parque e do que já existe de documentação. Depois do levantamento conseguimos dar um prazo em cima do seu caso, não um número genérico." },
              { question: "Vocês atendem fora da Grande Vitória?", answer: "Deixe seu contato com a cidade. A rede de empresas credenciadas cresce por região e retornamos dizendo se conseguimos atender aí." },
            ]}
          />
          <LegalNote>
            Esta página é informativa e não substitui avaliação técnica. A definição das atividades,
            das periodicidades e da responsabilidade técnica cabe a profissional habilitado, conforme
            a legislação aplicável ao seu estabelecimento.
          </LegalNote>
          <SourceLinks sources={fontesOficiais} />
        </div>
      </section>
    </MarketingLayout>
  );
}
