import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  Printer,
} from "lucide-react";

export function Hero({
  eyebrow,
  title,
  description,
  primary = { label: "Criar conta gratuita", href: "/InitialChoice", external: true },
  secondary,
  visual,
  notes = [],
}) {
  const SecondaryTag = secondary?.external ? "a" : Link;
  const PrimaryTag = primary.external ? "a" : Link;

  return (
    <section className="m-hero">
      <div className="m-container m-hero__grid">
        <div className="m-hero__copy">
          <span className="m-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="m-hero__lead">{description}</p>
          <div className="m-hero__actions">
            <PrimaryTag className="m-button" href={primary.external ? primary.href : undefined} to={!primary.external ? primary.href : undefined}>
              {primary.label}
              <ArrowRight aria-hidden="true" />
            </PrimaryTag>
            {secondary ? (
              <SecondaryTag
                className="m-button m-button--secondary"
                href={secondary.external ? secondary.href : undefined}
                to={!secondary.external ? secondary.href : undefined}
              >
                {secondary.label}
              </SecondaryTag>
            ) : null}
          </div>
          {notes.length ? (
            <ul className="m-hero__notes" aria-label="Informa??es do acesso">
              {notes.map((note) => (
                <li key={note}>
                  <Check aria-hidden="true" />
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="m-hero__visual" aria-label="Exemplo visual do fluxo no ClimaPro">
          {visual}
        </div>
      </div>
    </section>
  );
}

export function RecordPreview({ kind = "pmoc" }) {
  const isPmoc = kind === "pmoc";
  const rows = isPmoc
    ? [
        ["Equipamento", "Split 36.000 BTU/h"],
        ["Ambiente", "Recep??o"],
        ["Pr?xima visita", "18 SET"],
      ]
    : [
        ["Chamado", "#CP-1048"],
        ["Equipamento", "Cassete 48.000 BTU/h"],
        ["Agenda", "Hoje ? 14:30"],
      ];

  return (
    <div className="m-record">
      <div className="m-record__top">
        <span className="m-record__code">{isPmoc ? "PMOC ? 2026" : "ORDEM DE SERVI?O"}</span>
        <span className="m-status">{isPmoc ? "Em execu??o" : "Aguardando aprova??o"}</span>
      </div>
      <div className="m-record__client">
        <span>CLIENTE</span>
        <strong>Edif?cio Horizonte</strong>
      </div>
      <dl className="m-record__rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="m-record__check">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>{isPmoc ? "Checklist registrado" : "Atendimento documentado"}</strong>
          <span>{isPmoc ? "Fotos e assinaturas inclu?das" : "Fotos, v?deo e assinatura do cliente"}</span>
        </div>
      </div>
      <div className="m-record__timeline" aria-hidden="true">
        <span className="is-complete" />
        <span className="is-complete" />
        <span className="is-current" />
        <span />
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={`m-section-heading ${align === "center" ? "is-centered" : ""}`}>
      {eyebrow ? <span className="m-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function FeatureGrid({ items, columns = 3 }) {
  return (
    <div className={`m-feature-grid m-feature-grid--${columns}`}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <article className="m-feature-card" key={item.title}>
            <div className="m-feature-card__index">
              {Icon ? <Icon aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.link ? (
              <Link className="m-inline-link" to={item.link.href}>
                {item.link.label}
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function FlowSteps({ items }) {
  return (
    <ol className="m-flow">
      {items.map((item, index) => (
        <li key={item.title}>
          <span className="m-flow__number">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({ items }) {
  return (
    <div className="m-faq">
      {items.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <div>
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({
  title,
  description,
  primaryLabel = "Criar conta gratuita",
  primaryHref = "/InitialChoice",
  secondary,
}) {
  return (
    <section className="m-cta-band">
      <div>
        <span className="m-eyebrow m-eyebrow--light">Pr?ximo passo</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="m-cta-band__actions">
        <a className="m-button m-button--light" href={primaryHref}>
          {primaryLabel}
          <ArrowRight aria-hidden="true" />
        </a>
        {secondary ? (
          <Link className="m-button m-button--ghost" to={secondary.href}>
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function LegalNote({ children }) {
  return (
    <aside className="m-legal-note">
      <CircleAlert aria-hidden="true" />
      <div>
        <strong>Nota importante</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}

export function ArticleMeta() {
  return (
    <p className="m-article-meta">
      Conte?do editorial ClimaPro ? Atualizado em 2 de agosto de 2026
    </p>
  );
}

export function DownloadActions({ editHref, printHref, editLabel = "Baixar arquivo edit?vel" }) {
  return (
    <div className="m-download-actions">
      <a className="m-button" href={editHref} download>
        <Download aria-hidden="true" />
        {editLabel}
      </a>
      <a className="m-button m-button--secondary" href={printHref} target="_blank" rel="noreferrer">
        <Printer aria-hidden="true" />
        Abrir vers?o para imprimir
      </a>
    </div>
  );
}

export function SourceLinks({ sources }) {
  return (
    <div className="m-sources">
      <h2>Fontes oficiais</h2>
      <p>
        Consulte a reda??o oficial e valide a aplica??o ao seu caso com o respons?vel
        t?cnico habilitado.
      </p>
      <ul>
        {sources.map((source) => (
          <li key={source.href}>
            <a href={source.href} target="_blank" rel="noreferrer">
              {source.label}
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
