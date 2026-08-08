import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Edit, Trash2, Link2, Send, Wrench, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const STATUS_ORCAMENTO = {
  rascunho: { label: "Rascunho", cor: "bg-muted text-muted-foreground border-border" },
  enviado: { label: "Aguardando cliente", cor: "bg-blue-100 text-blue-800 border-blue-200" },
  aprovado: { label: "Aprovado", cor: "bg-green-100 text-green-800 border-green-200" },
  recusado: { label: "Recusado", cor: "bg-red-100 text-red-800 border-red-200" },
  expirado: { label: "Vencido", cor: "bg-amber-100 text-amber-800 border-amber-200" },
  cancelado: { label: "Cancelado", cor: "bg-muted text-muted-foreground border-border" },
};

// Um orçamento 'enviado' cuja validade já passou aparece como vencido mesmo
// antes de alguém abrir o link (que é onde a Edge Function grava o status).
export function statusEfetivo(orcamento) {
  const hoje = new Date().toISOString().split('T')[0];
  if (orcamento.status === 'enviado' && orcamento.validade_ate && orcamento.validade_ate < hoje) {
    return 'expirado';
  }
  return orcamento.status;
}

export default function OrcamentosList({
  orcamentos,
  clientes,
  isLoading,
  onEdit,
  onDelete,
  onEnviar,
  onCopiarLink,
  onGerarChamado,
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-sm border-none rounded-xl">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orcamentos.length === 0) {
    return (
      <Card className="shadow-sm border-none rounded-xl">
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento ainda"
          description='Clique em "Novo Orçamento" para montar uma proposta e enviar o link ao cliente aprovar.'
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {orcamentos.map((orcamento) => {
        const cliente = clientes?.find((c) => c.id === orcamento.cliente_id);
        const status = statusEfetivo(orcamento);
        const cfg = STATUS_ORCAMENTO[status] || STATUS_ORCAMENTO.rascunho;
        const editavel = status === 'rascunho';
        const enviavel = status === 'rascunho' || status === 'expirado';

        return (
          <Card key={orcamento.id} className="shadow-lg border-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline">{orcamento.numero_orcamento}</Badge>
                    <Badge variant="outline" className={cfg.cor}>{cfg.label}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground truncate">{orcamento.titulo}</h3>
                  <p className="text-sm text-muted-foreground truncate">{cliente?.nome || 'Cliente removido'}</p>
                </div>
                <p className="text-lg font-bold text-green-700 whitespace-nowrap">{moeda(orcamento.valor_total)}</p>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5 mb-4">
                {orcamento.validade_ate && (
                  <p>Válido até {format(new Date(`${orcamento.validade_ate}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
                {orcamento.data_resposta && (
                  <p>
                    Respondido por {orcamento.nome_aprovador || 'cliente'} em{' '}
                    {format(new Date(orcamento.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {orcamento.motivo_recusa && <p>Motivo: {orcamento.motivo_recusa}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {enviavel && (
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onEnviar(orcamento)}>
                    <Send className="w-4 h-4 mr-1.5" />
                    Enviar ao cliente
                  </Button>
                )}

                {status !== 'rascunho' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onCopiarLink(orcamento)}>
                      <Link2 className="w-4 h-4 mr-1.5" />
                      Copiar link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/orcamento/${orcamento.token_publico}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {status === 'aprovado' && !orcamento.chamado_gerado_id && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onGerarChamado(orcamento)}>
                    <Wrench className="w-4 h-4 mr-1.5" />
                    Gerar chamado
                  </Button>
                )}

                {status === 'aprovado' && orcamento.chamado_gerado_id && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 self-center">
                    Chamado já criado
                  </Badge>
                )}

                {editavel && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(orcamento)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onDelete(orcamento)}
                  aria-label={`Excluir orçamento ${orcamento.numero_orcamento}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
