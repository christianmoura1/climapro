
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MapPin, CheckCircle, Navigation, Phone, User, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

import FinalizarChamadoModal from "./FinalizarChamadoModal";
import DetalhesChamadoTecnico from "./DetalhesChamadoTecnico";
import KanbanChamados from "../chamados/KanbanChamados"; // New import

const statusConfig = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" }
};

// Função CORRIGIDA para converter UTC para horário de Brasília
const formatarDataBrasil = (dataISO) => {
  if (!dataISO) return 'N/A';
  
  const dataUTC = new Date(dataISO);
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const partes = formatter.formatToParts(dataUTC);
  const valores = {};
  partes.forEach(parte => {
    valores[parte.type] = parte.value;
  });
  
  return `${valores.day}/${valores.month}/${valores.year} às ${valores.hour}:${valores.minute}`;
};

export default function MeusChamados({ chamados, clientes, user, tecnico }) {
  const queryClient = useQueryClient();
  const [chamadoFinalizando, setChamadoFinalizando] = useState(null);
  const [chamadoDetalhes, setChamadoDetalhes] = useState(null);
  const [visualizacao, setVisualizacao] = useState('kanban'); // New state for view toggle

  const finalizarChamadoMutation = useMutation({
    mutationFn: async ({ chamadoId, dadosFinalizacao }) => {
      const updateData = {
        status: 'aguardando_aprovacao_empresa', // Alterado de 'finalizado' para 'aguardando_aprovacao_empresa'
        data_finalizacao: new Date().toISOString(),
        fotos_finalizacao: dadosFinalizacao.fotos_finalizacao || [],
        videos_finalizacao: dadosFinalizacao.videos_finalizacao || [],
        nome_cliente_confirmacao: dadosFinalizacao.nome_cliente_confirmacao,
        assinatura_cliente: dadosFinalizacao.assinatura_cliente,
        observacoes_tecnico: dadosFinalizacao.observacoes_finalizacao
      };
      
      await base44.entities.Chamado.update(chamadoId, updateData);
      
      // Registrar log
      await base44.entities.LogAcao.create({
        empresa_id: user.empresa_id,
        user_id: user.id,
        user_email: user.email,
        tipo_usuario: 'tecnico',
        acao: `Finalizou o chamado com ${dadosFinalizacao.fotos_finalizacao?.length || 0} foto(s) e ${dadosFinalizacao.videos_finalizacao?.length || 0} vídeo(s). Cliente confirmou: ${dadosFinalizacao.nome_cliente_confirmacao}. Aguardando aprovação da empresa.`,
        entidade_afetada: 'Chamado',
        entidade_id: chamadoId,
        data_hora: new Date().toISOString()
      });

      // Enviar notificação para a EMPRESA (não para o cliente)
      try {
        const empresas = await base44.entities.Empresa.list();
        const empresa = empresas.find(e => e.id === user.empresa_id);
        const chamado = chamados.find(c => c.id === chamadoId);
        
        if (empresa?.email_contato) {
          await base44.integrations.Core.SendEmail({
            to: empresa.email_contato,
            subject: `✅ Chamado Finalizado - Aguardando Aprovação #${chamado.numero_chamado}`,
            body: `O técnico ${tecnico.nome} finalizou um chamado que aguarda sua aprovação:

📋 DETALHES:

Chamado: ${chamado.titulo}
Técnico: ${tecnico.nome}
Cliente Confirmou: ${dadosFinalizacao.nome_cliente_confirmacao}
Data/Hora Finalização: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

📸 Fotos anexadas: ${dadosFinalizacao.fotos_finalizacao?.length || 0}
🎥 Vídeos anexados: ${dadosFinalizacao.videos_finalizacao?.length || 0}

Observações: ${dadosFinalizacao.observacoes_finalizacao || 'Nenhuma'}

⚠️ AÇÃO NECESSÁRIA:
Acesse o sistema para revisar e aprovar antes de enviar ao cliente.

ClimaPro - Sistema de Gestão`
          });
        }
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meus-chamados']);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao']);
      setChamadoFinalizando(null);
      alert("✅ Chamado enviado para aprovação da empresa!\n\nA empresa irá revisar antes de enviar ao cliente.");
    },
    onError: (error) => {
      console.error("Erro ao finalizar chamado:", error);
      alert("❌ Erro ao finalizar chamado. Tente novamente.");
    }
  });

  const updateChamadoStatusMutation = useMutation({
    mutationFn: async ({ chamadoId, newStatus }) => {
      await base44.entities.Chamado.update(chamadoId, { status: newStatus });

      await base44.entities.LogAcao.create({
        empresa_id: user.empresa_id,
        user_id: user.id,
        user_email: user.email,
        tipo_usuario: 'tecnico',
        acao: `Atualizou o status do chamado ${chamadoId} para '${newStatus}' via Kanban.`,
        entidade_afetada: 'Chamado',
        entidade_id: chamadoId,
        data_hora: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meus-chamados']);
      // Optionally show a toast or alert here
    },
    onError: (error) => {
      console.error("Erro ao atualizar status do chamado:", error);
      alert("❌ Erro ao atualizar status do chamado. Tente novamente.");
    },
  });

  if (chamadoDetalhes) {
    return (
      <DetalhesChamadoTecnico
        chamado={chamadoDetalhes}
        cliente={clientes.find(c => c.id === chamadoDetalhes.cliente_id)}
        onVoltar={() => setChamadoDetalhes(null)}
        onFinalizar={() => {
          setChamadoFinalizando(chamadoDetalhes);
          setChamadoDetalhes(null);
        }}
      />
    );
  }

  return (
    <>
      <Card className="shadow-lg border-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Meus Chamados ({chamados.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={visualizacao === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVisualizacao('kanban')}
              >
                📊 Kanban
              </Button>
              <Button
                variant={visualizacao === 'lista' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVisualizacao('lista')}
              >
                📋 Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {chamados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhum chamado atribuído no momento</p>
            </div>
          ) : visualizacao === 'kanban' ? (
            <KanbanChamados
              chamados={chamados}
              clientes={clientes}
              tecnicos={[]} // As per outline, assuming all technicians are not needed for this component
              onView={(chamado) => setChamadoDetalhes(chamado)}
              onEdit={null} // Edit not handled directly from Kanban in this view
              onDelete={null} // Delete not handled directly from Kanban in this view
              onStatusChange={({ chamadoId, newStatus }) => updateChamadoStatusMutation.mutate({ chamadoId, newStatus })}
              onFecharChamado={(chamado) => setChamadoFinalizando(chamado)} // New prop for closing
              mostrarTecnico={false}
              mostrarCliente={true}
              mostrarBotoes={true} // Assuming buttons for actions like "View Details" or "Close"
              mostrarBotaoFechar={true} // New prop to show the close button
            />
          ) : (
            <div className="divide-y">
              {chamados.map((chamado) => {
                const cliente = clientes.find(c => c.id === chamado.cliente_id);
                const podeFechar = chamado.status === 'em_andamento' || chamado.status === 'pendente';
                
                return (
                  <div key={chamado.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{chamado.titulo}</h4>
                          <Badge className={statusConfig[chamado.status]?.color}>
                            {statusConfig[chamado.status]?.label}
                          </Badge>
                        </div>
                        
                        {cliente && (
                          <div className="space-y-1 mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{cliente.nome}</span>
                            </div>
                            {cliente.telefone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                <a href={`tel:${cliente.telefone}`} className="hover:text-blue-600">
                                  {cliente.telefone}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-600 mb-2">{chamado.descricao}</p>
                        
                        {chamado.local && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{chamado.local}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            Aberto: {formatarDataBrasil(chamado.created_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {cliente?.latitude && cliente?.longitude && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.latitude},${cliente.longitude}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Navegar
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setChamadoDetalhes(chamado)}
                      >
                        Ver Detalhes
                      </Button>

                      {podeFechar && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setChamadoFinalizando(chamado)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Fechar Chamado
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {chamadoFinalizando && (
        <FinalizarChamadoModal
          chamado={chamadoFinalizando}
          onClose={() => setChamadoFinalizando(null)}
          onConfirm={(dadosFinalizacao) => {
            finalizarChamadoMutation.mutate({
              chamadoId: chamadoFinalizando.id,
              dadosFinalizacao
            });
          }}
          isLoading={finalizarChamadoMutation.isPending}
        />
      )}
    </>
  );
}
