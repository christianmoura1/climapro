import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlayCircle, BookOpen, Cpu, CalendarRange, CalendarClock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  statusManutencao,
  STATUS_MANUTENCAO_CONFIG,
  ancoraParaEscolha,
} from "@/lib/pmocChecklist";
import {
  chaveMes,
  indexarAgendamentos,
  proximaVisita,
  visitasDoAno,
  diaVisitaDoCliente,
  temDiaDefinido,
} from "@/lib/pmocDataVisita";
import CronogramaAnualGrid from "./CronogramaAnualGrid";
import AgendarVisitaPMOC from "./AgendarVisitaPMOC";

// Painel dinâmico: mostra TODOS os equipamentos ativos no PMOC de um cliente
// (podem ser 1 ou 50) com o cronograma anual completo direto na página — os
// 12 meses pré-preenchidos pela escada (mensal/trimestral/semestral/anual) e
// editáveis aqui mesmo, sem precisar abrir o modal do Plano Anual (que fica
// só para gerar o documento PDF e sincronizar a Agenda).
export default function PainelPMOCCliente({ cliente, equipamentos, empresaId, onExecutarRodada, onGerarCaderno, onVerPlanoAnual }) {
  const queryClient = useQueryClient();
  const ano = new Date().getFullYear();
  const [remarcandoMes, setRemarcandoMes] = React.useState(null);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['pmoc-agendamentos', cliente?.id],
    queryFn: () => base44.entities.PmocAgendamento.filter({ cliente_id: cliente.id }),
    enabled: !!cliente?.id,
  });

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

  const indiceAgendamentos = indexarAgendamentos(agendamentos);
  const visitas = visitasDoAno(cliente, ano, indiceAgendamentos);
  const proxima = proximaVisita(cliente, indiceAgendamentos);

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
      <div className="min-w-[166px]">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              PMOC — {cliente.nome}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {equipamentos.length} equipamento(s) no plano de manutenção — cronograma anual de {ano}
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
            <Button variant="outline" className="w-full whitespace-normal" onClick={() => onVerPlanoAnual(cliente)} disabled={equipamentos.length === 0}>
              <CalendarRange className="w-4 h-4 mr-2" />
              Abrir plano anual
            </Button>
            <Button variant="outline" className="w-full whitespace-normal" onClick={() => onGerarCaderno(cliente)} disabled={equipamentos.length === 0}>
              <BookOpen className="w-4 h-4 mr-2" />
              Abrir caderno
            </Button>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => onExecutarRodada(cliente)}
              disabled={equipamentos.length === 0}
              aria-label={`Executar PMOC de ${cliente.nome}`}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Executar PMOC
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
            <div className="flex flex-col gap-2 border-b bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-indigo-950">
                    Próxima visita: {proxima ? format(proxima.data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'a definir'}
                    {proxima?.remarcada ? ' (remarcada)' : ''}
                  </p>
                  <p className="text-xs text-indigo-900/80">
                    {temDiaDefinido(cliente)
                      ? `Visitas no dia ${diaVisitaDoCliente(cliente)} de cada mês.`
                      : `Visitas no dia ${diaVisitaDoCliente(cliente)} de cada mês, herdado da data de cadastro do cliente.`}
                    {' '}Clique no dia sob o mês para remarcar.
                  </p>
                  {proxima?.observacao && (
                    <p className="mt-1 text-xs text-amber-800">Motivo: {proxima.observacao}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 bg-card"
                onClick={() => setRemarcandoMes(
                  proxima
                    ? { ano: proxima.ano, mes0: proxima.mes0 }
                    : { ano, mes0: new Date().getMonth() }
                )}
              >
                Alterar data
              </Button>
            </div>

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
                    visitas={visitas}
                    onAlterarData={(mes0) => setRemarcandoMes({ ano, mes0 })}
                  />
                </div>
              ))}

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 inline-block border border-purple-300" /> Ciclo profundo</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block border" /> Checagem mensal</span>
                <span>Alterar um mês cria uma nova âncora e recalcula o calendário anual.</span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {remarcandoMes && (
        <AgendarVisitaPMOC
          cliente={cliente}
          ano={remarcandoMes.ano}
          mes0={remarcandoMes.mes0}
          agendamento={indiceAgendamentos[chaveMes(remarcandoMes.ano, remarcandoMes.mes0)] || null}
          empresaId={empresaId}
          onClose={() => setRemarcandoMes(null)}
        />
      )}
    </Card>
  );
}
