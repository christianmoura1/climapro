import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, CalendarClock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { MESES_ABREV } from "./CronogramaAnualGrid";
import { dataVisitaDoMes, formatarISO } from "@/lib/pmocDataVisita";

const MESES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Remarcar a visita. Duas coisas diferentes cabem aqui, e misturá-las é o que
// costuma dar errado:
//
// - mudar o dia fixo do cliente, que vale de aqui em diante (a empresa decidiu
//   que aquele cliente é sempre dia 5);
// - remarcar um mês só, porque naquele mês deu feriado ou o cliente pediu.
//
// O botão que o usuário aperta diz qual das duas ele quer.
export default function AgendarVisitaPMOC({ cliente, ano, mes0, agendamento, empresaId, onClose }) {
  const queryClient = useQueryClient();
  const padrao = dataVisitaDoMes(cliente, ano, mes0, {});
  const atual = agendamento?.data_visita ? agendamento.data_visita : formatarISO(padrao.data);

  const [data, setData] = useState(atual);
  const [observacao, setObservacao] = useState(agendamento?.observacao || '');

  const invalidar = () => {
    queryClient.invalidateQueries(['pmoc-agendamentos']);
    queryClient.invalidateQueries(['clientes']);
    queryClient.invalidateQueries(['agenda-eventos']);
  };

  const remarcarMesMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresaId,
        cliente_id: cliente.id,
        mes_referencia: `${ano}-${String(mes0 + 1).padStart(2, '0')}-01`,
        data_visita: data,
        observacao: observacao.trim() || null,
      };
      if (agendamento?.id) return base44.entities.PmocAgendamento.update(agendamento.id, payload);
      return base44.entities.PmocAgendamento.create(payload);
    },
    onSuccess: () => {
      invalidar();
      toast({ description: `📅 Visita de ${MESES_EXTENSO[mes0]} remarcada para ${format(new Date(`${data}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}.` });
      onClose();
    },
    onError: (error) => {
      console.error('Erro ao remarcar visita:', error);
      toast({ description: '❌ Não foi possível remarcar. Tente novamente.', variant: 'destructive' });
    },
  });

  // Mudar o dia fixo só faz sentido se a data escolhida continuar dentro do
  // mês: "todo dia 5" não se extrai de uma data em outro mês.
  const diaEscolhido = Number(data.slice(8, 10));
  const mesmoMes = data.slice(0, 7) === `${ano}-${String(mes0 + 1).padStart(2, '0')}`;

  const definirDiaFixoMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Cliente.update(cliente.id, { dia_execucao_pmoc: diaEscolhido });
      // Uma exceção antiga para este mês continuaria mandando; some com ela,
      // senão o usuário muda o dia fixo e a tela não obedece.
      if (agendamento?.id) await base44.entities.PmocAgendamento.delete(agendamento.id);
    },
    onSuccess: () => {
      invalidar();
      toast({ description: `📅 As visitas de ${cliente.nome} passam a cair no dia ${diaEscolhido} de cada mês.` });
      onClose();
    },
    onError: (error) => {
      console.error('Erro ao definir o dia fixo:', error);
      toast({ description: '❌ Não foi possível salvar o dia fixo. Tente novamente.', variant: 'destructive' });
    },
  });

  const voltarAoPadraoMutation = useMutation({
    mutationFn: () => base44.entities.PmocAgendamento.delete(agendamento.id),
    onSuccess: () => {
      invalidar();
      toast({ description: `📅 ${MESES_EXTENSO[mes0]} voltou para a data padrão do cliente.` });
      onClose();
    },
    onError: (error) => {
      console.error('Erro ao desfazer remarcação:', error);
      toast({ description: '❌ Não foi possível desfazer. Tente novamente.', variant: 'destructive' });
    },
  });

  const salvando = remarcarMesMutation.isPending || definirDiaFixoMutation.isPending || voltarAoPadraoMutation.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="agendar-visita-title">
      <Card className="max-h-[100dvh] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-2xl sm:rounded-xl">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-start justify-between gap-3">
            <CardTitle id="agendar-visita-title" className="flex items-start gap-2 text-lg">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
              Data da visita — {MESES_ABREV[mes0]}/{ano}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-muted-foreground">
            {cliente.nome} — hoje esta visita está marcada para{' '}
            <strong>{format(new Date(`${atual}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</strong>
            {agendamento ? ' (mês remarcado).' : '.'}
          </p>

          <div>
            <Label htmlFor="data-visita">Nova data</Label>
            <Input
              id="data-visita"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="obs-visita">Motivo (opcional)</Label>
            <Textarea
              id="obs-visita"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Feriado, cliente pediu para adiar, equipe em outra obra..."
              rows={2}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Só aparece para a empresa e o técnico.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              className="min-h-12 w-full whitespace-normal bg-purple-600 hover:bg-purple-700"
              onClick={() => remarcarMesMutation.mutate()}
              disabled={salvando || !data}
            >
              Remarcar só {MESES_EXTENSO[mes0]}
            </Button>
            <Button
              variant="outline"
              className="min-h-12 w-full whitespace-normal"
              onClick={() => definirDiaFixoMutation.mutate()}
              disabled={salvando || !data || !mesmoMes}
              title={mesmoMes ? undefined : 'Escolha uma data dentro do próprio mês para virar o dia fixo'}
            >
              Passar todas as visitas para o dia {mesmoMes ? diaEscolhido : '—'}
            </Button>
            {agendamento && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => voltarAoPadraoMutation.mutate()}
                disabled={salvando}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Voltar à data padrão do cliente
              </Button>
            )}
          </div>

          {!mesmoMes && (
            <p className="text-xs text-amber-700">
              A data escolhida está fora de {MESES_EXTENSO[mes0]}. Dá para remarcar este mês assim
              mesmo, mas ela não serve como dia fixo dos outros meses.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
