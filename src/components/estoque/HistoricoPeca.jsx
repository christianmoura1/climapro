import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, ArrowDownCircle, ArrowUpCircle, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TIPO_INFO = {
  entrada: { rotulo: 'Entrada', icone: ArrowDownCircle, cor: 'text-green-600', sinal: '+' },
  saida: { rotulo: 'Saída', icone: ArrowUpCircle, cor: 'text-red-600', sinal: '−' },
  ajuste: { rotulo: 'Ajuste', icone: ClipboardCheck, cor: 'text-blue-600', sinal: '=' },
};

export default function HistoricoPeca({ peca, movimentacoes, chamados = [], tecnicos = [], onExcluir, onClose, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="hist-title">
      <div className="w-full max-w-2xl rounded-t-2xl bg-background shadow-xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 pb-3 border-b">
          <div>
            <h2 id="hist-title" className="text-lg font-semibold text-foreground">Histórico de movimentações</h2>
            <p className="text-sm text-muted-foreground">
              {peca.nome} · saldo atual {Number(peca.saldo_atual)} {peca.unidade}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : movimentacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada para esta peça ainda.
            </p>
          ) : (
            <div className="divide-y">
              {movimentacoes.map((mov) => {
                const info = TIPO_INFO[mov.tipo] || TIPO_INFO.ajuste;
                const Icone = info.icone;
                const chamado = chamados.find((c) => c.id === mov.chamado_id);
                const tecnico = tecnicos.find((t) => t.id === mov.tecnico_id);
                return (
                  <div key={mov.id} className="py-3 flex items-start gap-3">
                    <Icone className={`w-5 h-5 shrink-0 mt-0.5 ${info.cor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {info.sinal} {Number(mov.quantidade)} {peca.unidade}
                        </span>
                        <Badge variant="outline" className="text-xs">{info.rotulo}</Badge>
                        {mov.custo_unitario != null && (
                          <span className="text-xs text-muted-foreground">a {moeda(mov.custo_unitario)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mov.data_movimentacao
                          ? format(new Date(mov.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '—'}
                        {chamado && ` · ${chamado.numero_chamado}`}
                        {tecnico && ` · ${tecnico.nome}`}
                      </p>
                      {mov.observacao && (
                        <p className="text-sm text-muted-foreground mt-1">{mov.observacao}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 shrink-0"
                      onClick={() => onExcluir(mov)}
                      aria-label="Excluir movimentação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            Excluir uma entrada ou saída devolve a quantidade ao saldo. Ajuste de inventário não é revertido
            automaticamente, porque o saldo anterior não fica guardado — registre um ajuste novo.
          </p>
        </div>
      </div>
    </div>
  );
}
