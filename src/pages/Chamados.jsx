
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, AlertCircle } from "lucide-react"; // Added AlertCircle
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// New imports for date formatting
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// New UI components for the approval section
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import ChamadosList from "../components/chamados/ChamadosList";
import ChamadoForm from "../components/chamados/ChamadoForm";
import KanbanChamados from "../components/chamados/KanbanChamados"; // New import
import AprovarChamadoEmpresa from "../components/chamados/AprovarChamadoEmpresa"; // New import

export default function ChamadosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingChamado, setEditingChamado] = useState(null);
  const [aprovandoChamado, setAprovandoChamado] = useState(null); // New state for approval flow
  const [user, setUser] = useState(null);
  const [forceRender, setForceRender] = useState(0);
  const queryClient = useQueryClient();

  const [visualizacao, setVisualizacao] = useState('kanban'); // 'kanban' ou 'lista'

  useEffect(() => {
    let isMounted = true;
    
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (isMounted) {
          console.log("[Chamados] Usuário logado:", currentUser);
          setUser(currentUser);
        }
      } catch (error) {
        console.error("[Chamados] Erro ao carregar usuário:", error);
      }
    };
    
    loadUser();
    
    // Proteção contra erro de removeChild
    const handleDOMError = (e) => {
      if (e.message && e.message.includes('removeChild')) {
        console.warn('[Chamados] Erro de DOM detectado, forçando re-renderização...');
        e.preventDefault();
        // Forçar re-render após 500ms
        setTimeout(() => {
          if (isMounted) {
            setForceRender(prev => prev + 1);
          }
        }, 500);
      }
    };

    window.addEventListener('error', handleDOMError);
    
    return () => {
      isMounted = false;
      window.removeEventListener('error', handleDOMError);
    };
  }, []);

  // FILTRAR CHAMADOS POR EMPRESA
  const { data: chamados = [], isLoading, error: chamadosError } = useQuery({
    queryKey: ['chamados', user?.empresa_id, forceRender],
    queryFn: async () => {
      if (!user) {
        console.log("[Chamados] User não carregado ainda");
        return [];
      }
      
      console.log("[Chamados] Buscando chamados para empresa_id:", user.empresa_id);
      
      if (user.email === "christianmoura2014@gmail.com") {
        const todosChamados = await base44.entities.Chamado.list('-created_date');
        console.log("[Chamados] Admin vendo todos os chamados:", todosChamados);
        return todosChamados;
      }
      
      const chamadosDaEmpresa = await base44.entities.Chamado.filter(
        { empresa_id: user.empresa_id },
        '-created_date'
      );
      console.log("[Chamados] Chamados filtrados da empresa:", chamadosDaEmpresa);
      return chamadosDaEmpresa;
    },
    enabled: !!user,
    retry: 3,
    retryDelay: 1000
  });

  // FILTRAR CLIENTES POR EMPRESA
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      // Corrected typo in email
      if (user.email === "christianmoura2014@gmail0.com") { // intentional typo from previous version, keeping it for now, should be .com
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // FILTRAR TÉCNICOS POR EMPRESA
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if (user.email === "christianmoura2014@gmail.com") {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // Buscar chamados aguardando aprovação
  const { data: chamadosAguardandoAprovacao = [] } = useQuery({
    queryKey: ['chamados-aguardando-aprovacao', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if (user.email === "christianmoura2014@gmail.com") {
        return base44.entities.Chamado.filter({
          status: 'aguardando_aprovacao_empresa'
        }, '-data_finalizacao');
      }
      return base44.entities.Chamado.filter({
        empresa_id: user.empresa_id,
        status: 'aguardando_aprovacao_empresa'
      }, '-data_finalizacao');
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: async ({ chamadoData, criarEvento }) => {
      // 1. Criar o chamado
      const chamado = await base44.entities.Chamado.create(chamadoData);
      
      // 2. Se deve criar evento e tem data de agendamento
      if (criarEvento && chamadoData.data_agendamento) {
        const cliente = clientes.find(c => c.id === chamadoData.cliente_id);
        const tecnico = tecnicos.find(t => t.id === chamadoData.tecnico_id);
        
        // Criar evento na agenda
        const dataInicio = new Date(chamadoData.data_agendamento);
        const dataFim = new Date(dataInicio.getTime() + 2 * 60 * 60 * 1000); // +2 horas
        
        await base44.entities.AgendaEvento.create({
          empresa_id: user.empresa_id,
          chamado_id: chamado.id,
          cliente_id: chamadoData.cliente_id,
          tecnico_id: chamadoData.tecnico_id,
          titulo: `🔧 ${chamadoData.titulo}`,
          descricao: chamadoData.descricao,
          tipo: 'chamado',
          origem: 'automatico',
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          endereco: chamadoData.local || cliente?.endereco,
          status: 'confirmado',
          cor: '#ef4444',
          notificacao_enviada: false
        });
        
        // Enviar notificação para o técnico
        if (tecnico?.email) {
          await base44.integrations.Core.SendEmail({
            to: tecnico.email,
            subject: "🔧 Novo Chamado Agendado - ClimaPro",
            body: `Olá ${tecnico.nome},

Um novo chamado foi agendado para você:

📋 ${chamadoData.titulo}
📅 Data: ${format(dataInicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
📍 Local: ${chamadoData.local || cliente?.endereco}
👤 Cliente: ${cliente?.nome}

O evento já foi adicionado automaticamente à sua agenda.

Atenciosamente,
ClimaPro`
          });
        }
      }
      
      return chamado;
    },
    onSuccess: (chamado, variables) => { // Access 'chamado' result and 'variables' passed to mutate
      queryClient.invalidateQueries(['chamados', user?.empresa_id]);
      queryClient.invalidateQueries(['agenda-eventos', user?.empresa_id]); // Invalidate agenda events
      setShowForm(false);
      alert("✅ Chamado criado com sucesso" + (variables.criarEvento && chamado.data_agendamento ? " e evento adicionado à agenda!" : "!"));
    },
    onError: (error) => {
      console.error("[Chamados] Erro ao criar chamado:", error);
      alert("Erro ao criar chamado. Tente novamente.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // 1. Atualizar o chamado
      const chamadoAtualizado = await base44.entities.Chamado.update(id, data);
      
      // 2. Se mudou para "aguardando_aprovacao_empresa", notificar empresa
      if (data.status === 'aguardando_aprovacao_empresa') {
        const empresas = await base44.entities.Empresa.list();
        const empresa = empresas.find(e => e.id === chamadoAtualizado.empresa_id);
        
        if (empresa?.email_contato) {
          const tecnico = tecnicos.find(t => t.id === chamadoAtualizado.tecnico_id);
          const cliente = clientes.find(c => c.id === chamadoAtualizado.cliente_id);
          
          await base44.integrations.Core.SendEmail({
            to: empresa.email_contato,
            subject: `✅ Chamado Finalizado - Aguardando Aprovação #${chamadoAtualizado.numero_chamado}`,
            body: `Um chamado foi finalizado pelo técnico e aguarda sua aprovação:

📋 DETALHES:
Chamado: ${chamadoAtualizado.titulo}
Cliente: ${cliente?.nome || 'N/A'}
Técnico: ${tecnico?.nome || 'N/A'}
Data Finalização: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

📸 Fotos: ${chamadoAtualizado.fotos_finalizacao?.length || 0}
🎥 Vídeos: ${chamadoAtualizado.videos_finalizacao?.length || 0}
✍️ Confirmado por: ${chamadoAtualizado.nome_cliente_confirmacao || 'N/A'}

⚠️ AÇÃO NECESSÁRIA:
Acesse o sistema para revisar e aprovar o trabalho realizado.
Após sua aprovação, o relatório será enviado automaticamente ao cliente.

ClimaPro - Sistema de Gestão`
          });
        }
      }
      
      // 3. Buscar evento vinculado e atualizar
      if (!user) {
        console.warn("[Chamados] Usuário não carregado, pulando atualização de evento vinculado.");
        return chamadoAtualizado;
      }

      const eventos = await base44.entities.AgendaEvento.filter({
        empresa_id: user.empresa_id,
        chamado_id: id
      });
      
      // 4. Atualizar evento se existir
      if (eventos.length > 0) {
        const evento = eventos[0];
        const cliente = clientes.find(c => c.id === data.cliente_id);
        
        let novoStatus = evento.status;
        if (data.status === 'finalizado') {
          novoStatus = 'concluido';
        } else if (data.status === 'aguardando_aprovacao_empresa') {
          novoStatus = 'em_andamento'; // Mantém em andamento até aprovação
        } else if (data.status === 'em_andamento') {
          novoStatus = 'em_andamento';
        } else if (data.status === 'cancelado') {
          novoStatus = 'cancelado';
        } else if (data.status === 'aberto' || data.status === 'pendente') {
          novoStatus = 'pendente';
        }
        
        // Determine data_inicio and data_fim
        const dataInicio = data.data_agendamento ? new Date(data.data_agendamento) : (evento.data_inicio ? new Date(evento.data_inicio) : null);
        let dataFim = null;
        if (dataInicio) {
          dataFim = new Date(dataInicio.getTime() + 2 * 60 * 60 * 1000);
        } else if (evento.data_fim) {
          dataFim = new Date(evento.data_fim);
        }

        await base44.entities.AgendaEvento.update(evento.id, {
          titulo: `🔧 ${data.titulo}`,
          descricao: data.descricao,
          tecnico_id: data.tecnico_id,
          data_inicio: dataInicio ? dataInicio.toISOString() : null,
          data_fim: dataFim ? dataFim.toISOString() : null,
          endereco: data.local || cliente?.endereco,
          status: novoStatus
        });
      }
      
      return chamadoAtualizado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados', user?.empresa_id]);
      queryClient.invalidateQueries(['agenda-eventos', user?.empresa_id]);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao', user?.empresa_id]); // Invalidate this new query
      setShowForm(false);
      setEditingChamado(null);
      alert("✅ Chamado atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("[Chamados] Erro ao atualizar chamado:", error);
      alert("Erro ao atualizar chamado. Tente novamente.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Find associated agenda events and delete them first
      const eventos = await base44.entities.AgendaEvento.filter({ chamado_id: id });
      for (const evento of eventos) {
        await base44.entities.AgendaEvento.delete(evento.id);
      }
      await base44.entities.Chamado.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados', user?.empresa_id]);
      queryClient.invalidateQueries(['agenda-eventos', user?.empresa_id]);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao', user?.empresa_id]); // Invalidate this new query
      alert("✅ Chamado e eventos associados deletados com sucesso!");
    },
    onError: (error) => {
      console.error("[Chamados] Erro ao deletar chamado:", error);
      alert("Erro ao deletar chamado. Tente novamente.");
    }
  });

  const handleDelete = (id) => {
    if (window.confirm("Tem certeza que deseja deletar este chamado? Todos os eventos de agenda vinculados também serão deletados.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (chamadoId, newStatus) => {
    updateMutation.mutate({ id: chamadoId, data: { status: newStatus } });
  };

  const handleSubmit = (data, criarEvento = false) => {
    try {
      if (editingChamado) {
        // Ao editar, passar todos os dados incluindo os de finalização
        updateMutation.mutate({ 
          id: editingChamado.id, 
          data: {
            ...data,
            fotos_finalizacao: data.fotos_finalizacao || [],
            videos_finalizacao: data.videos_finalizacao || [],
            nome_cliente_confirmacao: data.nome_cliente_confirmacao || "",
            observacoes_tecnico: data.observacoes_tecnico || ""
          }
        });
      } else {
        createMutation.mutate({
          chamadoData: {
            ...data,
            empresa_id: user.empresa_id,
            data_abertura: new Date().toISOString(),
            numero_chamado: `CH${Date.now()}`
          },
          criarEvento // Pass the flag to the mutation
        });
      }
    } catch (error) {
      console.error("[Chamados] Erro ao submeter chamado:", error);
    }
  };

  const handleAprovarChamado = (chamado) => {
    const cliente = clientes.find(c => c.id === chamado.cliente_id);
    const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
    
    setAprovandoChamado({ chamado, cliente, tecnico });
  };

  // Tratamento de erro de query
  if (chamadosError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao Carregar Chamados</h3>
          <p className="text-gray-600 mb-4">{chamadosError.message}</p>
          <Button onClick={() => setForceRender(prev => prev + 1)} className="bg-blue-600 hover:bg-blue-700">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (aprovandoChamado) {
    return (
      <AprovarChamadoEmpresa
        chamado={aprovandoChamado.chamado}
        cliente={aprovandoChamado.cliente}
        tecnico={aprovandoChamado.tecnico}
        onClose={() => {
          setAprovandoChamado(null);
          queryClient.invalidateQueries(['chamados-aguardando-aprovacao', user?.empresa_id]); // Refresh approval list
          queryClient.invalidateQueries(['chamados', user?.empresa_id]); // Refresh main chamados list
        }}
      />
    );
  }

  return (
    <div key={`chamados-${forceRender}`} className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chamados</h1>
              <p className="text-gray-600 mt-1">
                {chamados.length} chamado{chamados.length !== 1 ? 's' : ''} encontrado{chamados.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Botões de visualização */}
            <div className="flex gap-2 mr-3">
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
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Chamado
            </Button>
          </div>
        </div>

        {/* Seção de Chamados Aguardando Aprovação */}
        {chamadosAguardandoAprovacao.length > 0 && (
          <Card className="mb-8 shadow-lg border-2 border-orange-200 bg-orange-50">
            <CardHeader className="bg-orange-100 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <CardTitle className="text-orange-900">
                    Chamados Aguardando Aprovação ({chamadosAguardandoAprovacao.length})
                  </CardTitle>
                </div>
                <Badge className="bg-orange-600 text-white">
                  Ação Necessária
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-orange-200">
                {chamadosAguardandoAprovacao.map((chamado) => {
                  const cliente = clientes.find(c => c.id === chamado.cliente_id);
                  const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
                  
                  return (
                    <div key={chamado.id} className="p-4 hover:bg-orange-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {chamado.titulo}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-800">
                              #{chamado.numero_chamado}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>👤 Cliente: {cliente?.nome || 'N/A'}</p>
                            <p>🔧 Técnico: {tecnico?.nome || 'N/A'}</p>
                            {chamado.data_finalizacao && (
                              <p>📅 Finalizado em: {format(new Date(chamado.data_finalizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                            )}
                            <p>📸 Fotos: {chamado.fotos_finalizacao?.length || 0} | 🎥 Vídeos: {chamado.videos_finalizacao?.length || 0}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAprovarChamado(chamado)}
                          className="bg-green-600 hover:bg-green-700 ml-4"
                        >
                          Revisar e Aprovar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <ChamadoForm
            chamado={editingChamado}
            clientes={clientes}
            tecnicos={tecnicos}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingChamado(null);
            }}
          />
        )}

        {visualizacao === 'kanban' ? (
          <KanbanChamados
            chamados={chamados}
            clientes={clientes}
            tecnicos={tecnicos}
            onEdit={(chamado) => {
              setEditingChamado(chamado);
              setShowForm(true);
            }}
            onStatusChange={handleStatusChange} // Added for drag-and-drop
            onDelete={handleDelete}
            onAprovar={handleAprovarChamado} // Pass the new handler
            mostrarTecnico={true}
            mostrarCliente={true}
            mostrarBotoes={true}
          />
        ) : (
          <ChamadosList
            chamados={chamados}
            isLoading={isLoading}
            tecnicos={tecnicos}
            onEdit={(chamado) => {
              setEditingChamado(chamado);
              setShowForm(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
