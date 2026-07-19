import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, User, Calendar, Edit, CheckCircle, Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

const statusConfig = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  aguardando_pecas: { color: "bg-purple-100 text-purple-800", label: "Aguardando Peças" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-red-100 text-red-800", label: "Cancelado" }
};

export default function ChamadosList({ chamados, isLoading, tecnicos, onEdit }) {
  const [agendandoChamado, setAgendandoChamado] = useState(null);
  const [dataAgendamento, setDataAgendamento] = useState("");
  const queryClient = useQueryClient();

  const agendarChamadoMutation = useMutation({
    mutationFn: async ({ chamadoId, dataAgendamento }) => {
      const chamado = chamados.find(c => c.id === chamadoId);
      
      // 1. Atualizar o chamado com a data de agendamento
      await base44.entities.Chamado.update(chamadoId, {
        data_agendamento: dataAgendamento,
        status: chamado.status === 'pendente' ? 'em_andamento' : chamado.status
      });

      // 2. Criar evento na agenda
      const dataInicio = new Date(dataAgendamento);
      const dataFim = new Date(dataInicio.getTime() + 2 * 60 * 60 * 1000); // +2 horas

      const clientes = await base44.entities.Cliente.list();
      const cliente = clientes.find(c => c.id === chamado.cliente_id);

      await base44.entities.AgendaEvento.create({
        empresa_id: chamado.empresa_id,
        chamado_id: chamadoId,
        cliente_id: chamado.cliente_id,
        tecnico_id: chamado.tecnico_id,
        titulo: `🔧 ${chamado.titulo}`,
        descricao: chamado.descricao,
        tipo: 'chamado',
        origem: 'manual',
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        endereco: chamado.local || cliente?.endereco,
        latitude: cliente?.latitude,
        longitude: cliente?.longitude,
        status: 'confirmado',
        cor: '#ef4444'
      });

      // 3. Notificar técnico se designado
      if (chamado.tecnico_id) {
        const tecnicos = await base44.entities.Tecnico.list();
        const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
        
        if (tecnico?.email) {
          await base44.integrations.Core.SendEmail({
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['agenda-eventos']);
      setAgendandoChamado(null);
      setDataAgendamento("");
      toast({ description: "✅ Chamado agendado e adicionado à agenda!", variant: "success" });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando chamados...</p>
        </CardContent>
      </Card>
    );
  }

  if (chamados.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum chamado encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {chamados.map((chamado) => {
        const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
        const status = statusConfig[chamado.status];

        return (
          <Card key={chamado.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {chamado.titulo}
                    </h3>
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                    {chamado.prioridade === 'urgente' && (
                      <Badge className="bg-red-600 text-white">
                        🚨 Urgente
                      </Badge>
                    )}
                    {chamado.data_lembrete_proxima_manutencao && (
                      <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {format(new Date(chamado.data_lembrete_proxima_manutencao + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mb-3">{chamado.descricao}</p>

                  <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Aberto: {chamado.created_date ? format(new Date(chamado.created_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                      </span>
                    </div>

                    {chamado.local && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{chamado.local}</span>
                      </div>
                    )}

                    {tecnico && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Técnico: {tecnico.nome}</span>
                      </div>
                    )}

                    {chamado.data_agendamento && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Agendado: {format(new Date(chamado.data_agendamento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Botão de Agendar */}
                  {!chamado.data_agendamento && chamado.status !== 'finalizado' && chamado.status !== 'cancelado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAgendandoChamado(chamado.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Agendar
                    </Button>
                  )}

                  {chamado.status === 'finalizado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600"
                      disabled
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Concluído
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(chamado)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>

              {/* Modal de Agendamento Inline */}
              {agendandoChamado === chamado.id && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label>Data e Hora do Agendamento</Label>
                      <Input
                        type="datetime-local"
                        value={dataAgendamento}
                        onChange={(e) => setDataAgendamento(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <Button
                      onClick={() => agendarChamadoMutation.mutate({
                        chamadoId: chamado.id,
                        dataAgendamento
                      })}
                      disabled={!dataAgendamento || agendarChamadoMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {agendarChamadoMutation.isPending ? 'Agendando...' : 'Confirmar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAgendandoChamado(null);
                        setDataAgendamento("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    📅 Ao confirmar, o chamado será adicionado automaticamente à agenda
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}