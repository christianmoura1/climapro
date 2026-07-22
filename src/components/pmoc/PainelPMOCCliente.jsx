import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlayCircle, BookOpen, Cpu, CalendarRange } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  statusManutencao,
  STATUS_MANUTENCAO_CONFIG,
  ancoraParaEscolha,
} from "@/lib/pmocChecklist";
import CronogramaAnualGrid from "./CronogramaAnualGrid";

// Painel dinâmico: mostra TODOS os equipamentos ativos no PMOC de um cliente
// (podem ser 1 ou 50) com o cronograma anual completo direto na página — os
// 12 meses pré-preenchidos pela escada (mensal/trimestral/semestral/anual) e
// editáveis aqui mesmo, sem precisar abrir o modal do Plano Anual (que fica
// só para gerar o documento PDF e sincronizar a Agenda).
export default function PainelPMOCCliente({ cliente, equipamentos, onExecutarRodada, onGerarCaderno, onVerPlanoAnual }) {
  const queryClient = useQueryClient();
  const ano = new Date().getFullYear();

  const updateEquipamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipamentos']);
    },
    onError: (error) => {
      console.error("Erro ao atualizar equipamento:", error);
      toast({ description: `❌ Erro ao salvar: ${error.message || 'tente novamente.'}`, variant: "destructive" });
    }
  });

  if (!cliente) return null;

  const handleAncorar = (equipamento, mesIndex0, periodicidade) => {
    updateEquipamentoMutation.mutate({
      id: equipamento.id,
      data: {
        periodicidade_pmoc: periodicidade,
        ciclo_ancora_pmoc: ancoraParaEscolha(ano, mesIndex0, periodicidade),
      },
    });
  };

  const grupos = equipamentos.reduce((acc, eq) => {
    const chave = eq.estabelecimento_nome || "Sem estabelecimento";
    if (!acc[chave]) acc[chave] = [];
    acc[chave].push(eq);
    return acc;
  }, {});

  const contagem = equipamentos.reduce(
    (acc, eq) => {
      const status = statusManutencao(eq.proxima_manutencao, eq.ultima_manutencao);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { em_dia: 0, vence_em_breve: 0, atrasado: 0, nunca_executado: 0 }
  );

  const renderInfoEquipamento = (eq) => {
    const status = statusManutencao(eq.proxima_manutencao, eq.ultima_manutencao);
    return (
      <div className="min-w-[140px]">
        <p className="font-medium text-foreground">{eq.numero_equipamento || '—'}</p>
        <p className="text-xs text-muted-foreground">{eq.marca} {eq.modelo}</p>
        <Badge variant="outline" className={`mt-1 text-[10px] ${STATUS_MANUTENCAO_CONFIG[status].cor}`}>
          {STATUS_MANUTENCAO_CONFIG[status].label}
        </Badge>
        {eq.ultima_manutencao && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Última: {format(new Date(eq.ultima_manutencao), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              PMOC — {cliente.nome}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {equipamentos.length} equipamento(s) no plano de manutenção — cronograma anual de {ano}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onVerPlanoAnual(cliente)} disabled={equipamentos.length === 0}>
              <CalendarRange className="w-4 h-4 mr-2" />
              Baixar Plano Anual (PDF)
            </Button>
            <Button variant="outline" onClick={() => onGerarCaderno(cliente)} disabled={equipamentos.length === 0}>
              <BookOpen className="w-4 h-4 mr-2" />
              Gerar Caderno de Manutenção
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => onExecutarRodada(cliente)}
              disabled={equipamentos.length === 0}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Executar Rodada Mensal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {equipamentos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum equipamento deste cliente está com PMOC ativo. Edite um equipamento e ligue o
            toggle "Incluir no PMOC" para incluí-lo aqui.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 p-4 border-b bg-muted/30">
              {Object.entries(contagem)
                .filter(([, qtd]) => qtd > 0)
                .map(([status, qtd]) => (
                  <Badge key={status} variant="outline" className={STATUS_MANUTENCAO_CONFIG[status].cor}>
                    {qtd} {STATUS_MANUTENCAO_CONFIG[status].label.toLowerCase()}
                  </Badge>
                ))}
            </div>

            <div className="p-4 space-y-6">
              {Object.entries(grupos).map(([estabelecimento, itens]) => (
                <div key={estabelecimento}>
                  <p className="text-sm font-semibold text-indigo-700 mb-3">📍 {estabelecimento}</p>
                  <CronogramaAnualGrid
                    equipamentos={itens}
                    ano={ano}
                    onAncorar={handleAncorar}
                    salvando={updateEquipamentoMutation.isPending}
                    renderInfoEquipamento={renderInfoEquipamento}
                  />
                </div>
              ))}

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 inline-block border border-purple-300" /> Ciclo profundo</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block border" /> Checagem mensal</span>
                <span>Clique num mês para alterar o plano — o calendário se reposiciona sozinho a partir dali.</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
