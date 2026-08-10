import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Calendar } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { notificarPorEmail } from "@/lib/notificacoes";

export default function AgendarChamadoModal({ chamado, tecnicos, cliente, onClose }) {
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(chamado.tecnico_id || "");
  const queryClient = useQueryClient();

  const agendarMutation = useMutation({
    mutationFn: async () => {
      // 1. Atualizar chamado com data e técnico
      await base44.entities.Chamado.update(chamado.id, {
        data_agendamento: dataAgendamento,
        tecnico_id: tecnicoSelecionado,
        status: chamado.status === 'pendente' ? 'em_andamento' : chamado.status
      });

      // 2. Criar evento na agenda
      const dataInicio = new Date(dataAgendamento);
      const dataFim = new Date(dataInicio.getTime() + 2 * 60 * 60 * 1000); // +2 horas

      await base44.entities.AgendaEvento.create({
        empresa_id: chamado.empresa_id,
        chamado_id: chamado.id,
        cliente_id: chamado.cliente_id,
        tecnico_id: tecnicoSelecionado,
        titulo: `🔧 ${chamado.titulo}`,
        descricao: chamado.descricao,
        tipo: 'chamado',
        origem: 'manual',
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        endereco: chamado.local || cliente?.endereco,
        latitude: cliente?.latitude,
        longitude: cliente?.longitude,
        status: 'pendente',
        cor: '#ef4444'
      });

      // 3. Notificar técnico
      const tecnico = tecnicos.find(t => t.id === tecnicoSelecionado);
      if (tecnico?.email) {
        await notificarPorEmail({
          to: tecnico.email,
          subject: "📅 Chamado Agendado - ClimaPro",
          body: `Olá ${tecnico.nome},

Um chamado foi agendado para você:

📋 ${chamado.titulo}
📅 Data: ${format(dataInicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
📍 Local: ${chamado.local || cliente?.endereco}
👤 Cliente: ${cliente?.nome}

O evento foi adicionado à sua agenda.

Atenciosamente,
ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['agenda-eventos']);
      toast({ description: "✅ Chamado agendado com sucesso!", variant: "success" });
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao agendar:", error);
      toast({ description: "❌ Erro ao agendar chamado. Tente novamente.", variant: "destructive" });
    }
  });

  const handleAgendar = () => {
    if (!dataAgendamento) {
      toast({ description: "⚠️ Por favor, selecione uma data e hora.", variant: "warning" });
      return;
    }
    if (!tecnicoSelecionado) {
      toast({ description: "⚠️ Por favor, selecione um técnico.", variant: "warning" });
      return;
    }
    agendarMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Agendar Chamado
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="font-semibold text-foreground mb-1">{chamado.titulo}</p>
            <p className="text-sm text-muted-foreground">{chamado.descricao}</p>
            {cliente && (
              <p className="text-sm text-muted-foreground mt-1">
                👤 Cliente: {cliente.nome}
              </p>
            )}
          </div>

          <div>
            <Label>Data e Hora do Agendamento *</Label>
            <Input
              type="datetime-local"
              value={dataAgendamento}
              onChange={(e) => setDataAgendamento(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Técnico Responsável *</Label>
            <select
              value={tecnicoSelecionado}
              onChange={(e) => setTecnicoSelecionado(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Selecione um técnico</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nome} - {tecnico.especialidade}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              📅 <strong>O que acontecerá:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
              <li>Chamado será agendado para a data selecionada</li>
              <li>Técnico será notificado por email</li>
              <li>Evento será criado automaticamente na agenda</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleAgendar}
              disabled={agendarMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {agendarMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}