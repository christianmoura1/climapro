import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import EquipamentoForm from "../components/equipamentos/EquipamentoForm";
import EquipamentosList from "../components/equipamentos/EquipamentosList";
import HistoricoChamadosEquipamento from "../components/equipamentos/HistoricoChamadosEquipamento";

export default function EquipamentosPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCliente, setFiltroCliente] = useState(""); // Changed default from "todos" to ""
  const [buscaCliente, setBuscaCliente] = useState("");
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ['equipamentos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if (user.email === "christianmoura2014@gmail.com") {
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
      if (user.email === "christianmoura2014@gmail.com") {
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
      if (user.email === "christianmoura2014@gmail.com") {
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
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipamentos']);
      setShowForm(false);
      setEditingEquipamento(null);
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
      alert("✅ Equipamento excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir equipamento:", error);
      alert(`❌ ${error.message || 'Erro ao excluir equipamento.'}`);
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

  // Filtrar clientes pela busca
  const clientesFiltrados = clientes.filter(cliente => 
    cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
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
              alert("Para editar o chamado, acesse a página de Chamados");
            }}
            onDeletarChamado={async (chamado) => {
              if (window.confirm(`Confirma a exclusão do chamado #${chamado.numero_chamado}?`)) {
                try {
                  await base44.entities.Chamado.delete(chamado.id);
                  queryClient.invalidateQueries(['chamados-equipamento', visualizandoEquipamento.id]); // Invalidate for this specific equipment
                  alert("✅ Chamado excluído com sucesso!");
                } catch (error) {
                  console.error("Erro ao excluir chamado:", error);
                  alert("❌ Erro ao excluir chamado");
                }
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Equipamentos</h1>
              <p className="text-gray-600 mt-1">Gerencie todos os equipamentos</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setShowForm(!showForm);
              setEditingEquipamento(null); // Clear editing state when opening form for new item
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Equipamento
          </Button>
        </div>

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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por número, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Digite para buscar cliente..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
            />
            <select
              value={filtroCliente}
              onChange={(e) => {
                setFiltroCliente(e.target.value);
                setBuscaCliente("");
              }}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              size="15"
            >
              <option value="">Todos os Clientes</option> {/* Value changed to empty string */}
              {clientesFiltrados.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
            {buscaCliente && clientesFiltrados.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">Nenhum cliente encontrado</p>
            )}
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Exibindo {filteredEquipamentos.length} de {equipamentos.length} equipamentos
        </div>

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
        />
      </div>
    </div>
  );
}