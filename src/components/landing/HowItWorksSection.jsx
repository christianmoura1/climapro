import React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ClipboardList,
  KanbanSquare,
  CalendarDays,
  CalendarCheck,
  DollarSign,
  FileText,
  CheckCircle,
  Snowflake
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Seção "como funciona o sistema": pin + scrub — a tela do produto à direita
// troca de etapa em sincronia com o scroll e com o texto à esquerda. Tudo em
// DOM/CSS (sem WebGL), leve e fluido.

function PainelChamado() {
  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">Novo Chamado</p>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">Alta prioridade</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Cliente</p>
          <div className="h-9 rounded-lg border border-border bg-muted/40 px-3 flex items-center text-sm text-foreground">Supermercado Central</div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Equipamento</p>
          <div className="h-9 rounded-lg border border-border bg-muted/40 px-3 flex items-center text-sm text-foreground">Split 36.000 BTUs — Açougue</div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Descrição</p>
          <div className="h-14 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Equipamento não está gelando…</div>
        </div>
      </div>
      <div className="h-10 rounded-full bg-blue-600 text-white text-sm font-medium flex items-center justify-center shadow-sm">
        Abrir Chamado
      </div>
    </div>
  );
}

function PainelKanban() {
  const colunas = [
    { titulo: "Pendente", cor: "bg-orange-400", cards: ["Split não gela — Sup. Central", "Ruído no evaporador — Farmácia Vida"] },
    { titulo: "Em Andamento", cor: "bg-blue-500", cards: ["Troca de filtros — Hotel Costa", "Vazamento — Padaria Doce Pão"] },
    { titulo: "Finalizado", cor: "bg-emerald-500", cards: ["PMOC mensal — Clínica Bem Estar"] }
  ];
  return (
    <div className="p-5 sm:p-6 grid grid-cols-3 gap-3">
      {colunas.map((col) => (
        <div key={col.titulo} className="rounded-xl bg-muted/40 border border-border p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${col.cor}`} />
            <p className="text-xs font-semibold text-foreground truncate">{col.titulo}</p>
          </div>
          {col.cards.map((c) => (
            <div key={c} className="rounded-lg bg-card border border-border p-2 text-[11px] leading-snug text-muted-foreground shadow-sm">
              {c}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PainelAgenda() {
  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const eventos = {
    Seg: [{ t: "09:00 Sup. Central", c: "bg-blue-100 text-blue-700 border-blue-200" }],
    Ter: [{ t: "08:30 Hotel Costa", c: "bg-purple-100 text-purple-700 border-purple-200" }, { t: "14:00 Farmácia Vida", c: "bg-blue-100 text-blue-700 border-blue-200" }],
    Qua: [{ t: "10:00 PMOC Clínica", c: "bg-emerald-100 text-emerald-700 border-emerald-200" }],
    Qui: [{ t: "09:30 Padaria D. Pão", c: "bg-orange-100 text-orange-700 border-orange-200" }],
    Sex: [{ t: "13:00 PMOC Escola", c: "bg-emerald-100 text-emerald-700 border-emerald-200" }]
  };
  return (
    <div className="p-5 sm:p-6">
      <p className="font-semibold text-foreground mb-3">Agenda da Semana — Técnico Carlos</p>
      <div className="grid grid-cols-5 gap-2">
        {dias.map((d) => (
          <div key={d} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground text-center">{d}</p>
            <div className="rounded-lg bg-muted/40 border border-border min-h-[110px] p-1 space-y-1">
              {(eventos[d] || []).map((e) => (
                <div key={e.t} className={`rounded-md border px-1.5 py-1 text-[10px] font-medium leading-tight ${e.c}`}>
                  {e.t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PainelPMOC() {
  const linhas = [
    { equip: "Split 12.000 — Recepção", data: "05/07", ok: true },
    { equip: "Split 24.000 — Sala 2", data: "05/07", ok: true },
    { equip: "Cassete 36.000 — Auditório", data: "12/07", ok: true },
    { equip: "Split 12.000 — Diretoria", data: "26/07", ok: false }
  ];
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-foreground">PMOC — Clínica Bem Estar</p>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Em dia</span>
      </div>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.equip} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle className={`w-4 h-4 shrink-0 ${l.ok ? "text-emerald-500" : "text-muted-foreground/40"}`} />
              <p className="text-xs text-foreground truncate">{l.equip}</p>
            </div>
            <p className={`text-[11px] font-medium shrink-0 ml-2 ${l.ok ? "text-muted-foreground" : "text-blue-600"}`}>
              {l.ok ? l.data : `agendado ${l.data}`}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Lembretes automáticos enviados por e-mail ao cliente.</p>
    </div>
  );
}

function PainelFinanceiro() {
  const barras = [45, 62, 55, 78, 70, 92];
  return (
    <div className="p-5 sm:p-6">
      <p className="font-semibold text-foreground mb-3">Financeiro — Julho</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">Receitas</p>
          <p className="text-lg font-bold text-emerald-600">R$ 24.8k</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">Despesas</p>
          <p className="text-lg font-bold text-orange-600">R$ 9.3k</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">Lucro</p>
          <p className="text-lg font-bold text-blue-600">R$ 15.5k</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50/60 to-purple-50/60 h-24 flex items-end gap-2 px-4 pb-3">
        {barras.map((h, i) => (
          <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function PainelNota() {
  return (
    <div className="p-5 sm:p-6">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <p className="font-semibold text-foreground text-sm">NFS-e nº 000482</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Emitida</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Tomador</span><span className="text-foreground font-medium">Supermercado Central LTDA</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="text-foreground font-medium">Manutenção corretiva — Split 36.000</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Emissão</span><span className="text-foreground font-medium">19/07/2026</span></div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-muted-foreground">Valor</span>
            <span className="text-foreground font-bold text-sm">R$ 850,00</span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Emitida direto do fechamento do chamado, sem redigitar nada.</p>
    </div>
  );
}

const STEPS = [
  {
    key: "chamado",
    icon: ClipboardList,
    cor: "bg-blue-600",
    title: "Abra o chamado em segundos",
    desc: "Registre a solicitação do cliente com equipamento, prioridade e fotos — pelo escritório ou direto do campo.",
    Panel: PainelChamado
  },
  {
    key: "kanban",
    icon: KanbanSquare,
    cor: "bg-orange-500",
    title: "Acompanhe tudo no Kanban",
    desc: "Cada chamado flui por status visual: pendente, em andamento, finalizado. Nada se perde no WhatsApp.",
    Panel: PainelKanban
  },
  {
    key: "agenda",
    icon: CalendarDays,
    cor: "bg-purple-600",
    title: "Despache o técnico certo",
    desc: "Agenda por técnico com visão diária, semanal e mensal — sem conflito de horário e sem ligação de última hora.",
    Panel: PainelAgenda
  },
  {
    key: "pmoc",
    icon: CalendarCheck,
    cor: "bg-emerald-600",
    title: "PMOC no piloto automático",
    desc: "Cronogramas de manutenção preventiva gerados por equipamento, com lembretes automáticos por e-mail.",
    Panel: PainelPMOC
  },
  {
    key: "financeiro",
    icon: DollarSign,
    cor: "bg-teal-600",
    title: "Feche o financeiro sem planilha",
    desc: "Receitas, despesas e lucro por período e por técnico, calculados a partir dos próprios chamados.",
    Panel: PainelFinanceiro
  },
  {
    key: "nota",
    icon: FileText,
    cor: "bg-pink-600",
    title: "Emita a nota na hora",
    desc: "NFS-e gerada direto do fechamento do serviço, com os dados do chamado — sem redigitar nada.",
    Panel: PainelNota
  }
];

export default function HowItWorksSection() {
  const sectionRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeIndexRef = React.useRef(0);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 3.5}`,
        pin: true,
        invalidateOnRefresh: true,
        scrub: 1,
        onUpdate: (self) => {
          const newIndex = Math.min(
            STEPS.length - 1,
            Math.max(0, Math.round(self.progress * (STEPS.length - 1)))
          );
          if (newIndex !== activeIndexRef.current) {
            activeIndexRef.current = newIndex;
            setActiveIndex(newIndex);
          }
        }
      });
    });
    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-background to-muted/40">
      <div className="absolute inset-0 grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,440px)_1fr] lg:items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Texto sincronizado */}
        <div className="relative z-10 pt-20 lg:pt-0 lg:pr-10">
          <p className="text-sm font-semibold text-blue-600 mb-3 tracking-wide uppercase">Como funciona</p>
          <div className="relative h-[190px] lg:h-[230px]">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className="absolute inset-0 transition-all duration-500 ease-out"
                style={{
                  opacity: activeIndex === i ? 1 : 0,
                  transform: `translateY(${activeIndex === i ? 0 : 12}px)`
                }}
              >
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${step.cor} text-white mb-4 shadow-sm`}>
                  <step.icon className="w-5 h-5" />
                </span>
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-4">
            {STEPS.map((step, i) => (
              <span
                key={step.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? "w-8 bg-blue-600" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Janela do produto */}
        <div className="relative flex items-center justify-center py-6 lg:py-0">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl shadow-blue-900/10 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Snowflake className="w-3 h-3 text-blue-600" /> ClimaPro
              </span>
            </div>
            <div className="relative min-h-[330px] sm:min-h-[350px]">
              {STEPS.map((step, i) => (
                <div
                  key={step.key}
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    opacity: activeIndex === i ? 1 : 0,
                    transform: `translateY(${activeIndex === i ? 0 : 16}px) scale(${activeIndex === i ? 1 : 0.98})`,
                    pointerEvents: "none"
                  }}
                >
                  <step.Panel />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
