import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Search, X, ClipboardList } from "lucide-react";
import { createPageUrl } from "@/utils";
// New imports for date formatting
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// New UI components for the approval section
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import ChamadosList from "../components/chamados/ChamadosList";
import ChamadoForm from "../components/chamados/ChamadoForm";
import KanbanChamados from "../components/chamados/KanbanChamados"; // New import
import AprovarChamadoEmpresa from "../components/chamados/AprovarChamadoEmpresa"; // New import
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, FilterEmptyState, InlineLoading, PageHeader, PageShell } from "@/components/ui/page-shell";
export default function ChamadosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingChamado, setEditingChamado] = useState(null);
  const [prefillChamado, setPrefillChamado] = useState(null);
  const [aprovandoChamado, setAprovandoChamado] = useState(null); // New state for approval flow
  const [user, setUser] = useState(null);
  const [forceRender, setForceRender] = useState(0);
  const queryClient = useQueryClient();

  const [visualizacao, setVisualizacao] = useState('kanban'); // 'kanban' ou 'lista'
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const editOpenedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (isMounted) {
          console.log("[Chamados] Usuário logado:", currentUser);
          setUser(currentUser);
          setIsAdmin(currentUser.role === 'admin');
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

  // FILTRAR CHAMADOS POR EMPRESA - mesma lógica do Dashboard
  const { data: chamados = [], isLoading, error: chamadosError, refetch: refetchChamados } = useQuery({
    queryKey: ['chamados', user?.empresa_id, user?.role, forceRender],
    queryFn: async () => {
      if (!user) return [];
      const adminUser = (user.role === 'admin' && !user.empresa_id);
      if (adminUser) {
        return base44.entities.Chamado.list('-created_date', 1000);
      }
      return base44.entities.Chamado.filter(
        { empresa_id: user.empresa_id },
        '-created_date',
        1000
      );
    },
    enabled: !!user
  });

  // FILTRAR CLIENTES POR EMPRESA (sem duplicatas)
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      try {
        const adminUser = (user.role === 'admin' && !user.empresa_id);
        let lista = adminUser
          ? await base44.entities.Cliente.list('-created_date', 500)
          : await base44.entities.Cliente.filter({ empresa_id: user.empresa_id }, '-created_date', 500);

        // Remover importados problemáticos
        lista = lista.filter(c => !c.id?.startsWith('6a11c234'));

        // Remover duplicatas por empresa_id + nome (mantém o mais antigo)
        const vistos = new Set();
        const deduplicados = [];
        // Ordenar do mais antigo para o mais novo para manter o original
        const ordenados = [...lista].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (const c of ordenados) {
          const chave = `${c.empresa_id}|${c.nome?.toLowerCase().trim()}`;
          if (!vistos.has(chave)) {
            vistos.add(chave);
            deduplicados.push(c);
          }
        }
        return deduplicados;
      } catch (err) {
        console.error("[DEBUG] Erro ao listar clientes:", err);
        return [];
      }
    },
    enabled: !!user
  });

  // FILTRAR TÉCNICOS POR EMPRESA
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.email],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await base44.entities.Tecnico.list('-created_date', 100);
      } catch (err) {
        console.error("[DEBUG] Erro ao listar técnicos:", err);
        return [];
      }
    },
    enabled: !!user
  });

  // Buscar chamados aguardando aprovação
  const { data: chamadosAguardandoAprovacao = [] } = useQuery({
    queryKey: ['chamados-aguardando-aprovacao', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
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
      toast({ description: "✅ Chamado criado com sucesso" + (variables.criarEvento && chamado.data_agendamento ? " e evento adicionado à agenda!" : "!"), variant: "success" });
    },
    onError: (error) => {
      console.error("[Chamados] Erro ao criar chamado:", error);
      toast({ description: "Erro ao criar chamado. Tente novamente.", variant: "destructive" });
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
      toast({ description: "✅ Chamado atualizado com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("[Chamados] Erro ao atualizar chamado:", error);
      toast({ description: "Erro ao atualizar chamado. Tente novamente.", variant: "destructive" });
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
      toast({ description: "✅ Chamado e eventos associados deletados com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("[Chamados] Erro ao deletar chamado:", error);
      toast({ description: "Erro ao deletar chamado. Tente novamente.", variant: "destructive" });
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

  // Abrir edição automática via sessionStorage (vindo do histórico de clientes)
  useEffect(() => {
    if (!chamados.length || editOpenedRef.current) return;
    const editId = sessionStorage.getItem('edit_chamado_id');
    if (editId) {
      const chamado = chamados.find(c => c.id === editId);
      if (chamado) {
        editOpenedRef.current = true;
        sessionStorage.removeItem('edit_chamado_id');
        setEditingChamado(chamado);
        setShowForm(true);
      }
    }
  }, [chamados]);

  // Abrir formulário com dados pré-preenchidos (vindo de manutenções vencidas)
  useEffect(() => {
    if (!user || editOpenedRef.current) return;
    const prefillData = sessionStorage.getItem('prefill_chamado');
    if (prefillData) {
      editOpenedRef.current = true;
      sessionStorage.removeItem('prefill_chamado');
      try {
        const parsed = JSON.parse(prefillData);
        setPrefillChamado(parsed);
        setShowForm(true);
      } catch (e) {
        setShowForm(true);
      }
    }
  }, [user]);

  // Filtrar chamados por pesquisa e status
  const chamadosFiltrados = chamados.filter(chamado => {
    const cliente = clientes.find(c => c.id === chamado.cliente_id);
    const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);

    const matchSearch = searchTerm === "" || 
      chamado.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tecnico?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.numero_chamado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.data_agendamento?.includes(searchTerm) ||
      chamado.data_abertura?.includes(searchTerm);

    const statusMap = {
      "pendente": ["pendente"],
      "em_andamento": ["em_andamento"],
      "aguardando": ["aguardando_aprovacao_empresa", "aguardando_pecas"],
      "finalizado": ["finalizado"],
      "todos": null
    };

    const matchStatus = filtroStatus === "todos" || 
      (statusMap[filtroStatus] && statusMap[filtroStatus].includes(chamado.status));

    return matchSearch && matchStatus;
  });

  const handleAprovarChamado = (chamado) => {
    const cliente = clientes.find(c => c.id === chamado.cliente_id);
    const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
    
    setAprovandoChamado({ chamado, cliente, tecnico });
  };

  // Tratamento de erro de query
  if (chamadosError) {
    return (
      <PageShell>
        <PageHeader title="Chamados" description="Acompanhe cada atendimento do pedido à conclusão" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar os chamados"
          description="Os registros continuam salvos. Verifique a conexão e tente novamente."
          onRetry={refetchChamados}
        />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageLoading />
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Chamados" description="Acompanhe cada atendimento do pedido à conclusão" backTo={createPageUrl("Dashboard")} />
        <InlineLoading label="Carregando chamados" cards={4} />
      </PageShell>
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
    <PageShell key={`chamados-${forceRender}`}>
        <PageHeader
          title="Chamados"
          eyebrow="Operação técnica"
          description={`${chamados.length} chamado${chamados.length !== 1 ? 's' : ''} · ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`}
          backTo={createPageUrl("Dashboard")}
          actions={
            <>
              <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-initial" role="group" aria-label="Visualização dos chamados">
                <Button
                  variant={visualizacao === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('kanban')}
                  aria-pressed={visualizacao === 'kanban'}
                >
                  Kanban
                </Button>
                <Button
                  variant={visualizacao === 'lista' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('lista')}
                  aria-pressed={visualizacao === 'lista'}
                >
                  Lista
                </Button>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Chamado
              </Button>
            </>
          }
        />

        {/* Barra de Pesquisa e Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <label htmlFor="busca-chamados" className="sr-only">Buscar chamados</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="busca-chamados"
              placeholder="Buscar por cliente, técnico, título ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} aria-label="Limpar busca" className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {[
              { key: "todos", label: "Todos" },
              { key: "pendente", label: "Pendente" },
              { key: "em_andamento", label: "Em Andamento" },
              { key: "aguardando", label: "Aguardando Aprovação" },
              { key: "finalizado", label: "Concluído" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFiltroStatus(key)}
                aria-pressed={filtroStatus === key}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                  filtroStatus === key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
                {key !== "todos" && (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({chamados.filter(c => {
                      const statusMap = { pendente: ["pendente"], em_andamento: ["em_andamento"], aguardando: ["aguardando_aprovacao_empresa", "aguardando_pecas"], finalizado: ["finalizado"] };
                      return statusMap[key]?.includes(c.status);
                    }).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Seção de Chamados Aguardando Aprovação */}
        {chamadosAguardandoAprovacao.length > 0 && (
          <Card className="mb-8 shadow-lg border-2 border-orange-200 bg-orange-50">
            <CardHeader className="bg-orange-100 border-b border-orange-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {chamado.titulo}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-800">
                              #{chamado.numero_chamado}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
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
                          className="w-full bg-green-600 hover:bg-green-700 sm:ml-4 sm:w-auto"
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
            chamado={editingChamado || prefillChamado}
            clientes={clientes}
            tecnicos={tecnicos}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingChamado(null);
              setPrefillChamado(null);
            }}
          />
        )}

        {chamados.length === 0 ? (
          <Card className="shadow-sm">
            <EmptyState
              icon={ClipboardList}
              title="Nenhum chamado cadastrado"
              description="Crie o primeiro chamado para iniciar o acompanhamento do atendimento."
              action={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Novo chamado</Button>}
            />
          </Card>
        ) : chamadosFiltrados.length === 0 ? (
          <Card className="shadow-sm"><FilterEmptyState onClear={() => { setSearchTerm(""); setFiltroStatus("todos"); }} /></Card>
        ) : visualizacao === 'kanban' ? (
          <KanbanChamados
            chamados={chamadosFiltrados}
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
            chamados={chamadosFiltrados}
            isLoading={isLoading}
            tecnicos={tecnicos}
            onEdit={(chamado) => {
              setEditingChamado(chamado);
              setShowForm(true);
            }}
          />
        )}
    </PageShell>
  );
}