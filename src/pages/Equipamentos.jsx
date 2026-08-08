import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Printer } from "lucide-react";
import { createPageUrl } from "@/utils";

import EquipamentoForm from "../components/equipamentos/EquipamentoForm";
import EquipamentosList from "../components/equipamentos/EquipamentosList";
import HistoricoChamadosEquipamento from "../components/equipamentos/HistoricoChamadosEquipamento";
import QRCodeEquipamentoModal from "../components/equipamentos/QRCodeEquipamentoModal";
import ImprimirQRCodesEquipamentos from "../components/equipamentos/ImprimirQRCodesEquipamentos";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorState, FilterEmptyState, PageHeader, PageShell } from "@/components/ui/page-shell";

export default function EquipamentosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null);
  const [gerandoQrPara, setGerandoQrPara] = useState(null);
  const [imprimindoTodosQr, setImprimindoTodosQr] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: equipamentos = [], isLoading, error: equipamentosError, refetch: refetchEquipamentos } = useQuery({
    queryKey: ['equipamentos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
        return base44.entities.Equipamento.list('-created_date');
      }
      return base44.entities.Equipamento.filter(
        { empresa_id: user.empresa_id },
        '-created_date'
      );
    },
    enabled: !!user
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // Buscar técnicos para o histórico de chamados
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
        // For admin, fetch all technicians (or a subset if needed)
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // Buscar chamados vinculados ao equipamento visualizado
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

  // Buscar empresa para PDF
  const { data: empresa } = useQuery({
    queryKey: ['empresa', user?.empresa_id],
    queryFn: async () => {
      if (!user?.empresa_id) return null;
      // In base44, fetching a single entity by ID is usually:
      // return base44.entities.Empresa.get(user.empresa_id);
      // If list() is the only way, then filter it.
      const empresas = await base44.entities.Empresa.list();
      return empresas.find(e => e.id === user.empresa_id);
    },
    enabled: !!user?.empresa_id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipamentos']);
      setShowForm(false);
      toast({ description: "✅ Equipamento cadastrado com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao cadastrar equipamento:", error);
      toast({ description: `❌ Erro ao salvar: ${error.message || 'tente novamente.'}`, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipamentos']);
      setShowForm(false);
      setEditingEquipamento(null);
      toast({ description: "✅ Equipamento atualizado com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao atualizar equipamento:", error);
      toast({ description: `❌ Erro ao salvar: ${error.message || 'tente novamente.'}`, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (equipamentoId) => {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const chamadosResult = await base44.entities.Chamado.filter({ 
        empresa_id: user.empresa_id 
      });
      
      const pmocsResult = await base44.entities.PMOC.filter({ 
        empresa_id: user.empresa_id 
      });
      
      const chamadosVinculados = chamadosResult.filter(c => 
        c.equipamento_id === equipamentoId || 
        (Array.isArray(c.equipamentos_ids) && c.equipamentos_ids.includes(equipamentoId))
      );
      
      const pmocsVinculados = pmocsResult.filter(p => 
        Array.isArray(p.equipamentos_ids) && p.equipamentos_ids.includes(equipamentoId)
      );
      
      if (chamadosVinculados.length > 0) {
        throw new Error(`Não é possível excluir este equipamento pois ele possui ${chamadosVinculados.length} chamado(s) vinculado(s).`);
      }
      
      if (pmocsVinculados.length > 0) {
        throw new Error(`Não é possível excluir este equipamento pois ele está vinculado a ${pmocsVinculados.length} PMOC(s).`);
      }
      
      return base44.entities.Equipamento.delete(equipamentoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipamentos']);
      toast({ description: "✅ Equipamento excluído com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao excluir equipamento:", error);
      toast({ description: `❌ ${error.message || 'Erro ao excluir equipamento.'}`, variant: "destructive" });
    }
  });

  const handleSubmit = (data) => {
    if (editingEquipamento) {
      updateMutation.mutate({ id: editingEquipamento.id, data });
    } else {
      createMutation.mutate({
        ...data,
        empresa_id: user.empresa_id
      });
    }
  };

  const handleDelete = (equipamento) => {
    if (confirm(`Tem certeza que deseja excluir o equipamento "${equipamento.numero_equipamento}"?\n\n⚠️ Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(equipamento.id);
    }
  };

  const handleVisualizarEquipamento = (equipamento) => {
    setVisualizandoEquipamento(equipamento);
  };


  const filteredEquipamentos = equipamentos.filter(equip => {
    const matchSearch = equip.numero_equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equip.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equip.modelo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Adjusted to handle empty string for "Todos os Clientes"
    const matchCliente = filtroCliente === "" || equip.cliente_id === filtroCliente;
    
    return matchSearch && matchCliente;
  });

  if (!user) {
    return (
      <PageLoading />
    );
  }

  if (equipamentosError) {
    return (
      <PageShell>
        <PageHeader title="Equipamentos" description="Parque instalado e histórico técnico" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar os equipamentos"
          description="Os cadastros continuam salvos. Verifique a conexão e tente novamente."
          onRetry={refetchEquipamentos}
        />
      </PageShell>
    );
  }

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
            onEditarChamado={(chamado) => {
              // Redirecionar para página de chamados com edição
              setVisualizandoEquipamento(null);
              toast({ description: "Para editar o chamado, acesse a página de Chamados", variant: "default" });
            }}
            onDeletarChamado={async (chamado) => {
              if (window.confirm(`Confirma a exclusão do chamado #${chamado.numero_chamado}?`)) {
                try {
                  await base44.entities.Chamado.delete(chamado.id);
                  queryClient.invalidateQueries(['chamados-equipamento', visualizandoEquipamento.id]); // Invalidate for this specific equipment
                  toast({ description: "✅ Chamado excluído com sucesso!", variant: "success" });
                } catch (error) {
                  console.error("Erro ao excluir chamado:", error);
                  toast({ description: "❌ Erro ao excluir chamado", variant: "destructive" });
                }
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <PageShell>
        <PageHeader
          title="Equipamentos"
          eyebrow="Parque instalado"
          description={`${equipamentos.length} equipamento${equipamentos.length !== 1 ? 's' : ''} em acompanhamento`}
          backTo={createPageUrl("Dashboard")}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => setImprimindoTodosQr(true)}
                disabled={filteredEquipamentos.length === 0}
                className="w-full sm:w-auto"
              >
                <Printer className="w-5 h-5 mr-2" />
                Imprimir QR Codes
              </Button>
              <Button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingEquipamento(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Equipamento
              </Button>
            </>
          }
        />

        {showForm && (
          <EquipamentoForm
            equipamento={editingEquipamento}
            clientes={clientes}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEquipamento(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <label htmlFor="busca-equipamentos" className="sr-only">Buscar equipamentos</label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              id="busca-equipamentos"
              placeholder="Buscar por número, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-cliente-equipamentos">Cliente</Label>
            <select id="filtro-cliente-equipamentos" value={filtroCliente} onChange={(event) => setFiltroCliente(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Todos os clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          Exibindo {filteredEquipamentos.length} de {equipamentos.length} equipamentos
        </div>

        {!isLoading && equipamentos.length > 0 && filteredEquipamentos.length === 0 ? (
          <Card className="shadow-sm"><FilterEmptyState onClear={() => { setSearchTerm(""); setFiltroCliente(""); }} /></Card>
        ) : (
          <EquipamentosList
          equipamentos={filteredEquipamentos}
          clientes={clientes}
          isLoading={isLoading}
          onEdit={(equipamento) => {
            setEditingEquipamento(equipamento);
            setShowForm(true);
          }}
          onDelete={handleDelete}
          onView={handleVisualizarEquipamento}
          onQrCode={setGerandoQrPara}
        />
        )}

        {gerandoQrPara && (
          <QRCodeEquipamentoModal
            equipamento={gerandoQrPara}
            cliente={clientes.find((c) => c.id === gerandoQrPara.cliente_id)}
            onClose={() => setGerandoQrPara(null)}
          />
        )}

        {imprimindoTodosQr && (
          <ImprimirQRCodesEquipamentos
            equipamentos={filteredEquipamentos}
            clientes={clientes}
            onDone={() => setImprimindoTodosQr(false)}
          />
        )}
    </PageShell>
  );
}