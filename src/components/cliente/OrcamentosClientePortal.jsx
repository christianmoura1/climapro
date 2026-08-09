import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ExternalLink, FileCheck2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusConfig = {
  enviado: { label: "Aguardando sua resposta", className: "bg-blue-100 text-blue-800 border-blue-200" },
  aprovado: { label: "Aprovado", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  recusado: { label: "Recusado", className: "bg-red-100 text-red-800 border-red-200" },
  expirado: { label: "Prazo encerrado", className: "bg-amber-100 text-amber-800 border-amber-200" },
};
function statusEfetivo(item) {
  const hoje = new Date().toISOString().slice(0, 10);
  return item.status === "enviado" && item.validade_ate && item.validade_ate < hoje ? "expirado" : item.status;
}
export default function OrcamentosClientePortal({ orcamentos = [], isLoading = false }) {
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando orçamentos...</p>;
  if (!orcamentos.length) return (
    <div className="py-10 text-center">
      <FileCheck2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="font-medium">Nenhum orçamento disponível</p>
      <p className="mt-1 text-sm text-muted-foreground">As propostas enviadas pela empresa aparecerão aqui.</p>
    </div>
  );
  return <div className="grid gap-4 md:grid-cols-2">{orcamentos.map((item) => {
    const status = statusEfetivo(item);
    const cfg = statusConfig[status] || statusConfig.enviado;
    const responder = status === "enviado";
    return <article key={item.id} className="rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{item.numero_orcamento || "Proposta"}</p>
          <h3 className="mt-1 text-lg font-semibold">{item.titulo}</h3></div>
        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
      </div>
      {item.descricao && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.descricao}</p>}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div><p className="text-xs text-muted-foreground">Valor da proposta</p><p className="text-2xl font-bold">{moeda(item.valor_total)}</p>
          {item.validade_ate && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Válido até {format(new Date(`${item.validade_ate}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}</p>}</div>
        <Button asChild variant={responder ? "default" : "outline"} className={responder ? "bg-blue-600 hover:bg-blue-700" : ""}>
          <a href={`/orcamento/${item.token_publico}`} target="_blank" rel="noreferrer">
            {responder ? <FileText className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}{responder ? "Ver e responder" : "Ver orçamento"}
          </a>
        </Button>
      </div>
    </article>;
  })}</div>;
}
