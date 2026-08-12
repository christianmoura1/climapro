import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Phone, Mail, Cpu, Key } from "lucide-react";
import { createPageUrl } from "@/utils";

import ClienteForm from "../components/clientes/ClienteForm";
import ClienteDetalhes from "../components/clientes/ClienteDetalhes";
import HistoricoChamadosEquipamento from "../components/equipamentos/HistoricoChamadosEquipamento";
import ChamadoForm from "../components/chamados/ChamadoForm";
import VisualizarChamadoCliente from "../components/cliente/VisualizarChamadoCliente";
import { PageLoading } from "@/components/ui/page-loading";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/use-toast";
import { ErrorState, FilterEmptyState, InlineLoading, PageHeader, PageShell } from "@/components/ui/page-shell";
import { mensagemDeLimite } from "@/lib/limitesPlano";
import { useEmpresa } from "@/hooks/useEmpresa";

// O payload do cliente era montado campo a campo, e isso já engoliu coluna
// nova em silêncio duas vezes (senha_acesso_publico_hash e depois
// dia_execucao_pmoc): a tela salvava, ninguém via erro, o campo simplesmente
// não ia. Agora vai tudo que o formulário devolve, menos o que não é coluna
// (senha_portal, que vai para a Edge Function) e o que nunca se atualiza pela
// tela (id, chaves e carimbos de tempo).
const NAO_VAO_PARA_O_BANCO = new Set([
  'senha_portal',
  'id',
  'empresa_id',
  'created_at',
  'updated_at',
  'created_date',
  'updated_date',
  'created_by',
]);

function camposDoCliente(clienteData) {
  const payload = {};
  for (const [campo, valor] of Object.entries(clienteData)) {
    if (NAO_VAO_PARA_O_BANCO.has(campo)) continue;
    payload[campo] = valor;
  }
  payload.estabelecimentos = clienteData.estabelecimentos || [];
  payload.dia_execucao_pmoc = clienteData.dia_execucao_pmoc ?? null;
  return payload;
}

export default function ClientesPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState("todos");
  const [viewingCliente, setViewingCliente] = useState(null); // Changed from selectedCliente
  const [editingCliente, setEditingCliente] = useState(null);
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null); // New state for viewing equipment history
  const [visualizandoChamado, setVisualizandoChamado] = useState(null); // State for viewing finalized chamado
  const [editingChamado, setEditingChamado] = useState(null); // New state for editing a Chamado
  const [refreshKey, setRefreshKey] = useState(0); // Key to force ClienteDetalhes refresh
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const empresaId = user?.data?.empresa_id || user?.empresa_id;
  const { atingiuLimite } = useEmpresa();

  const { data: clientes = [], isLoading, error: clientesError, refetch: refetchClientes } = useQuery({
    queryKey: ['clientes', empresaId],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: empresaId });
    },
    enabled: !!user
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos', empresaId],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
        return base44.entities.Equipamento.list();
      }
      return base44.entities.Equipamento.filter({ empresa_id: empresaId });
    },
    enabled: !!user
  });

  // Buscar tecnicos
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      return base44.entities.Tecnico.filter({ empresa_id: empresaId });
    },
    enabled: !!empresaId
  });

  // Buscar empresa para PDF
  const { data: empresa } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const empresas = await base44.entities.Empresa.list();
      return empresas.find(e => e.id === empresaId);
    },
    enabled: !!empresaId
  });

  // Buscar chamados do equipamento visualizado
  const { data: chamadosEquipamento = [] } = useQuery({
    queryKey: ['chamados-equipamento', visualizandoEquipamento?.id],
    queryFn: async () => {
      if (!visualizandoEquipamento) return [];
      return base44.entities.Chamado.filter({
        equipamento_id: visualizandoEquipamento.id
      }, '-data_finalizacao');
    },
    enabled: !!visualizandoEquipamento
  });

  const createMutation = useMutation({
    mutationFn: async (clienteData) => {
      if (!empresaId) {
        throw new Error("Erro: Usuário não está vinculado a nenhuma empresa.");
      }

      const cliente = await base44.entities.Cliente.create({
        ...camposDoCliente(clienteData),
        empresa_id: empresaId,
      });

      if (clienteData.tem_acesso_portal && clienteData.senha_portal) {
        try {
          await base44.integrations.Core.GerenciarAcessoCliente({
            cliente_id: cliente.id,
            password: clienteData.senha_portal
          });
        } catch (error) {
          await base44.entities.Cliente.delete(cliente.id).catch(() => undefined);
          throw new Error(`Não foi possível criar o acesso do cliente: ${error.message}`);
        }
      }

      return { cliente, temAcessoPortal: clienteData.tem_acesso_portal };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clientes']);
      setShowForm(false);
      setEditingCliente(null);
      toast({
        description: data.temAcessoPortal
          ? `Cliente cadastrado com acesso ao sistema. Login: ${data.cliente.email}`
          : "Cliente cadastrado com sucesso!",
        variant: data.temAcessoPortal ? "success" : "default"
      });
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      toast({
        description: mensagemDeLimite(error) || error.message || "Erro ao criar cliente. Verifique os dados e tente novamente.",
        variant: "default",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, clienteData }) => {
      const cliente = await base44.entities.Cliente.update(id, camposDoCliente(clienteData));
      if (clienteData.tem_acesso_portal && clienteData.senha_portal) {
        await base44.integrations.Core.GerenciarAcessoCliente({
          cliente_id: id,
          password: clienteData.senha_portal
        });
      }
      return { cliente, senhaAtualizada: !!clienteData.senha_portal };
    },
    onSuccess: ({ senhaAtualizada }) => {
      queryClient.invalidateQueries(['clientes']);
      setShowForm(false);
      setEditingCliente(null);
      toast({
        description: senhaAtualizada
          ? "Cliente e senha de acesso atualizados com sucesso!"
          : "Cliente atualizado com sucesso!",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar cliente:", error);
      toast({ description: "Erro ao atualizar cliente. Tente novamente.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (clienteId) => {
      // Verificar se há equipamentos vinculados
      const equipamentosDoCliente = equipamentos.filter(e => e.cliente_id === clienteId);
      
      if (equipamentosDoCliente.length > 0) {
        throw new Error(`Não é possível excluir este cliente pois ele possui ${equipamentosDoCliente.length} equipamento(s) cadastrado(s). Exclua os equipamentos primeiro.`);
      }

      // Verificar se há chamados vinculados
      const chamadosResult = await base44.entities.Chamado.filter({ cliente_id: clienteId });
      
      if (chamadosResult.length > 0) {
        throw new Error(`Não é possível excluir este cliente pois ele possui ${chamadosResult.length} chamado(s) cadastrado(s).`);
      }

      // Se passou nas verificações, excluir
      return base44.entities.Cliente.delete(clienteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      toast({ description: "Cliente excluído com sucesso!", variant: "default" });
    },
    onError: (error) => {
      console.error("Erro ao excluir cliente:", error);
      toast({ description: error.message || "Erro ao excluir cliente.", variant: "default" });
    }
  });

  const updateChamadoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Chamado.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados-equipamento']);
      setEditingChamado(null);
      toast({ description: "✅ Chamado atualizado com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao atualizar chamado:", error);
      toast({ description: "❌ Erro ao atualizar chamado", variant: "destructive" });
    }
  });

  const deleteChamadoMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Chamado.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados-equipamento']);
      setRefreshKey(k => k + 1);
      toast({ description: "✅ Chamado excluído com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao excluir chamado:", error);
      toast({ description: "❌ Erro ao excluir chamado", variant: "destructive" });
    }
  });

  const handleSubmit = (clienteData) => {
    if (!empresaId) {
      toast({ description: "Erro: Usuário não está vinculado a nenhuma empresa.", variant: "destructive" });
      return;
    }

    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, clienteData });
      return;
    }

    // O gatilho no banco é quem realmente barra; isso aqui é só para o usuário
    // não preencher a ficha inteira e levar o "não" no fim.
    if (atingiuLimite('limite_clientes', clientes.length)) {
      toast({
        description: `Seu plano permite ${empresa?.limite_clientes} cliente(s) e você já cadastrou ${clientes.length}. `
          + 'O plano Basic, por R$ 29,90/mês, deixa ilimitado.',
        variant: 'default',
      });
      return;
    }

    createMutation.mutate(clienteData);
  };

  const handleDelete = (clienteId) => { // Modified to accept ID
    const clientToDelete = clientes.find(c => c.id === clienteId);
    if (clientToDelete && confirm(`Tem certeza que deseja excluir o cliente "${clientToDelete.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(clienteId);
    } else if (!clientToDelete) {
      toast({ description: "Cliente não encontrado para exclusão.", variant: "default" });
    }
  };

  const handleVisualizarEquipamento = (equipamento) => {
    setVisualizandoEquipamento(equipamento);
  };

  const handleVisualizarChamado = (chamado) => {
    const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
    setVisualizandoChamado({ chamado, tecnico });
  };

  const handleEditarChamado = (chamado) => {
    setEditingChamado(chamado);
  };

  const handleDeletarChamado = (chamado) => {
    if (window.confirm(`Tem certeza que deseja excluir o chamado #${chamado.numero_chamado}?`)) {
      deleteChamadoMutation.mutate(chamado.id);
    }
  };

  const handleSubmitChamado = (data) => {
    if (editingChamado) {
      updateChamadoMutation.mutate({
        id: editingChamado.id,
        data
      });
    }
  };

  const filteredClientes = clientes.filter(cliente => {
    // Remove registros com IDs da importação problemática (prefixo 6a11c234)
    if (cliente.id?.startsWith('6a11c234')) return false;
    // Sempre filtra por empresa_id (para todos os usuários não-admin-global)
    if (!(user.role === 'admin' && !user.empresa_id)) {
      if (!empresaId || cliente.empresa_id !== empresaId) return false;
    }
    // Filtra por nome ou telefone
    if (accessFilter === 'com_acesso' && !cliente.tem_acesso_portal) return false;
    if (accessFilter === 'sem_acesso' && cliente.tem_acesso_portal) return false;
    if (!searchTerm) return true;
    return cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefone?.includes(searchTerm);
  });

  if (!user) {
    return (
      <PageLoading />
    );
  }

  if (clientesError) {
    return (
      <PageShell>
        <PageHeader title="Clientes" description="Cadastros, equipamentos e acessos ao portal" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar os clientes"
          description="Os cadastros continuam salvos. Verifique a conexão e tente novamente."
          onRetry={refetchClientes}
        />
      </PageShell>
    );
  }

  // Se está editando um chamado, mostrar formulário
  if (editingChamado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ChamadoForm
            chamado={editingChamado}
            clientes={clientes}
            tecnicos={tecnicos}
            onSubmit={handleSubmitChamado}
            onCancel={() => setEditingChamado(null)}
          />
        </div>
      </div>
    );
  }

  // Se está visualizando histórico de equipamento
  if (visualizandoEquipamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <HistoricoChamadosEquipamento
            equipamento={visualizandoEquipamento}
            chamados={chamadosEquipamento}
            clientes={clientes}
            tecnicos={tecnicos}
            empresa={empresa}
            onVoltar={() => setVisualizandoEquipamento(null)}
            onEditarChamado={handleEditarChamado}
            onDeletarChamado={handleDeletarChamado}
          />
        </div>
      </div>
    );
  }

  // Se está visualizando um chamado finalizado
  if (visualizandoChamado) {
    return (
      <VisualizarChamadoCliente
        chamado={visualizandoChamado.chamado}
        tecnico={visualizandoChamado.tecnico}
        empresa={empresa}
        onClose={() => setVisualizandoChamado(null)}
      />
    );
  }

  // Se está visualizando detalhes do cliente
  if (viewingCliente) {
    const equipamentosCliente = equipamentos.filter(e => e.cliente_id === viewingCliente.id);
    
    return (
      <ClienteDetalhes
        key={refreshKey}
        cliente={viewingCliente}
        equipamentos={equipamentosCliente}
        onVoltar={() => setViewingCliente(null)}
        onEditarCliente={(cliente) => {
          setEditingCliente(cliente);
          setShowForm(true);
          setViewingCliente(null); // Close details when going to edit form
        }}
        onDeletarCliente={(cliente) => {
          setViewingCliente(null);
          handleDelete(cliente.id || cliente);
        }}
        onVisualizarEquipamento={handleVisualizarEquipamento}
        onVisualizarChamado={handleVisualizarChamado}
        onDeletarChamado={handleDeletarChamado}
      />
    );
  }

  return (
    <PageShell>
        <PageHeader
          title="Clientes"
          eyebrow="Relacionamento"
          description={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} · equipamentos e acessos ao portal`}
          backTo={createPageUrl("Dashboard")}
          actions={
            <Button
              onClick={() => {
                setEditingCliente(null);
                setShowForm(!showForm);
              }}
              className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Cliente
            </Button>
          }
        />

        {showForm && (
          <ClienteForm
            cliente={editingCliente} // Pass the client being edited to the form
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingCliente(null); // Clear editing client when form is cancelled
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <div className="mb-4 overflow-x-auto" role="tablist" aria-label="Filtrar clientes por acesso">
          <div className="inline-flex min-w-max rounded-lg border bg-card p-1 shadow-sm">
            {[
              { id: "todos", label: "Todos os clientes", count: clientes.length },
              { id: "com_acesso", label: "Com acesso", count: clientes.filter((cliente) => cliente.tem_acesso_portal).length },
              { id: "sem_acesso", label: "Sem acesso", count: clientes.filter((cliente) => !cliente.tem_acesso_portal).length }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={accessFilter === tab.id}
                onClick={() => setAccessFilter(tab.id)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 ${
                  accessFilter === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  accessFilter === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <label htmlFor="busca-clientes" className="sr-only">Buscar clientes</label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              id="busca-clientes"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <InlineLoading label="Carregando clientes" cards={3} />
        ) : clientes.length > 0 && filteredClientes.length === 0 ? (
          <Card className="shadow-sm"><FilterEmptyState onClear={() => { setSearchTerm(""); setAccessFilter("todos"); }} /></Card>
        ) : filteredClientes.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhum cliente cadastrado"
            description="Cadastre o primeiro cliente para começar a abrir chamados e PMOCs para ele."
            action={
              <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
                Cadastrar Primeiro Cliente
              </Button>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes.map((cliente) => {
              const clienteEquipamentos = equipamentos.filter(e => e.cliente_id === cliente.id);
              
              return (
                <Card 
                  key={cliente.id} 
                  className="overflow-hidden border-none shadow-lg transition-shadow hover:shadow-xl"
                >
                  <CardContent className="p-6">
                  <button type="button" onClick={() => setViewingCliente(cliente)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`Abrir detalhes de ${cliente.nome}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {cliente.nome}
                          </h3>
                          {cliente.tem_acesso_portal && (
                            <Badge className="bg-blue-100 text-blue-800 ml-2">
                              <Key className="w-3 h-3 mr-1" />
                              Portal
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{cliente.telefone}</span>
                          </div>
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{cliente.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium mt-2">
                            <Cpu className="w-4 h-4" />
                            <span>{clienteEquipamentos.length} equipamento(s)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </PageShell>
  );
}