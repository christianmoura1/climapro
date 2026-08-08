import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Edit, Trash2, ArrowUpDown, History, AlertTriangle } from "lucide-react";
import { CATEGORIAS_PECA } from "./PecaForm";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function estoqueBaixo(peca) {
  return Number(peca.saldo_atual) <= Number(peca.estoque_minimo || 0);
}

export default function PecasList({ pecas, isLoading, onMovimentar, onEdit, onDelete, onHistorico }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm border-none rounded-xl">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (pecas.length === 0) {
    return (
      <Card className="shadow-sm border-none rounded-xl">
        <EmptyState
          icon={Package}
          title="Nenhuma peça cadastrada"
          description='Clique em "Nova Peça" para começar a controlar o que entra e sai do estoque.'
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pecas.map((peca) => {
        const baixo = estoqueBaixo(peca);
        return (
          <Card key={peca.id} className={`shadow-lg border-none ${peca.ativo ? '' : 'opacity-60'}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <Badge variant="outline">{CATEGORIAS_PECA[peca.categoria] || peca.categoria}</Badge>
                    {baixo && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Repor
                      </Badge>
                    )}
                    {!peca.ativo && <Badge variant="outline">Inativo</Badge>}
                  </div>
                  <h3 className="font-semibold text-foreground truncate">{peca.nome}</h3>
                  {peca.codigo && <p className="text-xs text-muted-foreground">Cód. {peca.codigo}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-2xl font-bold leading-none ${baixo ? 'text-amber-600' : 'text-foreground'}`}>
                    {Number(peca.saldo_atual)}
                  </p>
                  <p className="text-xs text-muted-foreground">{peca.unidade}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5 mb-4">
                <p>Custo médio {moeda(peca.custo_medio)}
                  {peca.preco_venda ? ` · venda ${moeda(peca.preco_venda)}` : ''}
                </p>
                <p>
                  Mínimo {Number(peca.estoque_minimo)} {peca.unidade}
                  {peca.localizacao ? ` · ${peca.localizacao}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onMovimentar(peca)}>
                  <ArrowUpDown className="w-4 h-4 mr-1.5" />
                  Movimentar
                </Button>
                <Button size="sm" variant="outline" onClick={() => onHistorico(peca)} aria-label={`Histórico de ${peca.nome}`}>
                  <History className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(peca)} aria-label={`Editar ${peca.nome}`}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onDelete(peca)}
                  aria-label={`Excluir ${peca.nome}`}
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
