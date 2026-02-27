
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, MapPin, User, Clock, Navigation, CheckCircle, XCircle, Trash2 } from "lucide-react"; // Added Trash2
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// A utility function for generating page URLs. In a full application,
// this would typically come from a routing library (e.g., Next.js useRouter, React Router).
const createPageUrl = (pageName) => {
  return `/${pageName.toLowerCase()}`;
};

export default function DetalhesEventoModal({ evento, onClose, onUpdate, clientes, tecnicos }) {
  const [criarChamado, setCriarChamado] = useState(false);
  const queryClient = useQueryClient();
  
  // Find client and technician based on IDs from provided arrays
  const cliente = clientes?.find(c => c.id === evento.cliente_id); // Added optional chaining
  const tecnico = tecnicos?.find(t => t.id === evento.tecnico_id); // Added optional chaining

  const tipoConfig = {
    chamado: { label: "Chamado", icon: "🔧", color: "bg-red-100 text-red-800" },
    pmoc: { label: "PMOC", icon: "🧊", color: "bg-blue-100 text-blue-800" },
    reuniao: { label: "Reunião", icon: "👥", color: "bg-purple-100 text-purple-800" },
    manual: { label: "Manual", icon: "🗓️", color: "bg-gray-100 text-gray-800" },
    outro: { label: "Outro", icon: "📋", color: "bg-gray-100 text-gray-800" } // Retained 'outro'
  };

  const statusConfig = {
    pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
    confirmado: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
    em_andamento: { label: "Em Andamento", color: "bg-indigo-100 text-indigo-800" },
    concluido: { label: "Concluído", color: "bg-green-100 text-green-800" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" }
  };

  // Determine the configuration for the current event's type and status
  const config = tipoConfig[evento.tipo] || tipoConfig.manual;
  const statusStyle = statusConfig[evento.status] || statusConfig.pendente;

  const updateStatusMutation = useMutation({
    mutationFn: async (novoStatus) => {
      return await base44.entities.AgendaEvento.update(evento.id, { status: novoStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agenda-eventos']);
      onClose();
      alert("✅ Status atualizado com sucesso!");
      if (onUpdate) onUpdate(); // Call onUpdate prop if provided
    }
  });

  const deleteEventoMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.AgendaEvento.delete(evento.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agenda-eventos']);
      onClose();
      alert("✅ Evento excluído da agenda com sucesso!");
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      console.error("Erro ao excluir evento:", error);
      alert("❌ Erro ao excluir evento. Tente novamente.");
    }
  });

  const handleAbrirGPS = () => {
    if (evento.latitude && evento.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${evento.latitude},${evento.longitude}`;
      window.open(url, '_blank');
    } else if (evento.endereco) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.endereco)}`;
      window.open(url, '_blank');
    }
  };

  const handleCriarChamadoVinculado = async () => {
    try {
      // Create a new Chamado (Service Call) entity
      const chamado = await base44.entities.Chamado.create({
        empresa_id: evento.empresa_id,
        cliente_id: evento.cliente_id,
        tecnico_id: evento.tecnico_id,
        titulo: evento.titulo,
        descricao: evento.descricao,
        local: evento.endereco,
        tipo_problema: "outro", // Default type for newly created calls from agenda
        prioridade: "media",   // Default priority
        status: "pendente",    // Initial status for the new call
        data_abertura: new Date().toISOString(),
        data_agendamento: evento.data_inicio,
        numero_chamado: `CH${Date.now()}` // Generate a simple unique call number
      });
      
      // Update the AgendaEvento to link it to the newly created Chamado
      // Also, change its type to 'chamado' and assign a specific color
      await base44.entities.AgendaEvento.update(evento.id, {
        chamado_id: chamado.id,
        tipo: 'chamado',
        cor: '#ef4444' // A red tone, typically used for calls
      });
      
      // Optionally, send an email notification to the technician
      if (tecnico?.email) {
        await base44.integrations.Core.SendEmail({
          to: tecnico.email,
          subject: "🔧 Novo Chamado Vinculado - ClimaPro",
          body: `Olá ${tecnico.nome},

Um chamado foi criado a partir de um evento da sua agenda:

📋 ${chamado.titulo}
📅 ${format(new Date(evento.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
📍 ${evento.endereco}
👤 Cliente: ${cliente?.nome || 'N/A'}

Atenciosamente,
ClimaPro`
        });
      }
      
      // Invalidate relevant queries to refresh data in the UI
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['agenda-eventos']);
      onClose(); // Close the modal
      alert("✅ Chamado criado e vinculado com sucesso!");
      if (onUpdate) onUpdate(); // Call onUpdate prop if provided
    } catch (error) {
      console.error("Erro ao criar chamado:", error);
      alert("❌ Erro ao criar chamado vinculado.");
    }
  };

  const handleExcluirEvento = () => {
    if (window.confirm("⚠️ Tem certeza que deseja excluir este evento da agenda?\n\nEsta ação não pode ser desfeita.")) {
      deleteEventoMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{config.icon}</span>
              <div>
                <CardTitle className="text-xl">{evento.titulo}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={config.color}>{config.label}</Badge>
                  <Badge className={statusStyle.color}>{statusStyle.label}</Badge>
                  {evento.origem === 'automatico' && (
                    <Badge className="bg-blue-100 text-blue-800">🤖 Automático</Badge>
                  )}
                  {evento.chamado_id && (
                    <Badge className="bg-green-100 text-green-800">🔗 Vinculado</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleExcluirEvento}
                disabled={deleteEventoMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Excluir evento"
              >
                {deleteEventoMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {evento.descricao && (
            <div>
              <Label className="font-semibold text-gray-700">Descrição:</Label>
              <p className="text-gray-600 mt-1">{evento.descricao}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Data e Hora:
              </Label>
              <p className="text-gray-600 mt-1">
                {format(new Date(evento.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {evento.data_fim && ` - ${format(new Date(evento.data_fim), 'HH:mm')}`}
              </p>
            </div>

            {cliente && (
              <div>
                <Label className="font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente:
                </Label>
                <p className="text-gray-600 mt-1">{cliente.nome}</p>
                {cliente.telefone && (
                  <p className="text-sm text-gray-500">{cliente.telefone}</p>
                )}
              </div>
            )}
          </div>

          {tecnico && (
            <div>
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Técnico Responsável:
              </Label>
              <p className="text-gray-600 mt-1">{tecnico.nome}</p>
              {tecnico.telefone && (
                <p className="text-sm text-gray-500">{tecnico.telefone}</p>
              )}
            </div>
          )}

          {evento.endereco && (
            <div>
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço:
              </Label>
              <p className="text-gray-600 mt-1">{evento.endereco}</p>
              {(evento.latitude && evento.longitude) || evento.endereco && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAbrirGPS}
                  className="mt-2"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Abrir no Google Maps
                </Button>
              )}
            </div>
          )}

          {evento.observacoes && (
            <div>
              <Label className="font-semibold text-gray-700">Observações:</Label>
              <p className="text-gray-600 mt-1 bg-gray-50 p-3 rounded">{evento.observacoes}</p>
            </div>
          )}

          {/* Botão para criar chamado se for evento manual e não tiver um chamado vinculado */}
          {evento.tipo === 'manual' && !evento.chamado_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900">🔧 Criar Chamado</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Transformar este evento em um chamado de serviço.
                  </p>
                </div>
                <Button
                  onClick={handleCriarChamadoVinculado}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Criar Chamado
                </Button>
              </div>
            </div>
          )}

          {/* Mostrar link para chamado se já estiver vinculado */}
          {evento.chamado_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900">🔗 Chamado Vinculado</p>
                  <p className="text-sm text-green-700 mt-1">
                    Este evento está vinculado ao chamado #{evento.chamado_id.slice(-6)}.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to the Chamados page using the helper function
                    window.location.href = createPageUrl("Chamados");
                  }}
                >
                  Ver Chamado
                </Button>
              </div>
            </div>
          )}

          {/* Existing status update buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {evento.status === 'pendente' && (
              <>
                <Button
                  onClick={() => updateStatusMutation.mutate('confirmado')}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Evento
                </Button>
                <Button
                  onClick={() => updateStatusMutation.mutate('cancelado')}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </>
            )}
            
            {evento.status === 'confirmado' && (
              <Button
                onClick={() => updateStatusMutation.mutate('em_andamento')}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={updateStatusMutation.isPending}
              >
                Iniciar Atendimento
              </Button>
            )}
            
            {evento.status === 'em_andamento' && (
              <Button
                onClick={() => updateStatusMutation.mutate('concluido')}
                className="bg-green-600 hover:bg-green-700"
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Concluído
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
