import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Search, Building2, Phone, Mail, Cpu, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ClienteForm from "../components/clientes/ClienteForm";
import ClienteDetalhes from "../components/clientes/ClienteDetalhes";
import HistoricoChamadosEquipamento from "../components/equipamentos/HistoricoChamadosEquipamento";
import ChamadoForm from "../components/chamados/ChamadoForm";
import VisualizarChamadoCliente from "../components/cliente/VisualizarChamadoCliente";

export default function ClientesPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingCliente, setViewingCliente] = useState(null); // Changed from selectedCliente
  const [editingCliente, setEditingCliente] = useState(null);
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null); // New state for viewing equipment history
  const [visualizandoChamado, setVisualizandoChamado] = useState(null); // State for viewing finalized chamado
  const [editingChamado, setEditingChamado] = useState(null); // New state for editing a Chamado
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

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', empresaId],
    queryFn: async () => {
      if (!user) return [];
      if (user.email === "christianmoura2014@gmail.com") {
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
      if (user.email === "christianmoura2014@gmail.com") {
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
        nome: clienteData.nome,
        email: clienteData.email,
        telefone: clienteData.telefone,
        whatsapp: clienteData.whatsapp,
        endereco: clienteData.endereco,
        latitude: clienteData.latitude,
        longitude: clienteData.longitude,
        tipo_estabelecimento: clienteData.tipo_estabelecimento,
        observacoes: clienteData.observacoes,
        tem_acesso_portal: clienteData.tem_acesso_portal,
        estabelecimentos: clienteData.estabelecimentos || [],
        empresa_id: empresaId
      });

      return { cliente, temAcessoPortal: clienteData.tem_acesso_portal };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clientes']);
      setShowForm(false);
      setEditingCliente(null);
      
      if (data.temAcessoPortal) {
        const linkPortal = `https://climapro.base44.app`;
        const mensagemParaEnviar = `🔐 ACESSO AO PORTAL DO CLIENTE - ClimaPro

Olá ${data.cliente.nome}!

Você agora tem acesso ao nosso portal do cliente. Siga o passo a passo abaixo:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 PASSO 1: ACESSE O LINK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Clique ou copie este link no seu navegador:
👉 ${linkPortal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ PASSO 2: CRIAR SUA CONTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quando a página abrir, você verá "Welcome to ClimaPro"

⚠️ Como você ainda NÃO tem conta, clique em:
   "Sign up" (embaixo do botão azul)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 PASSO 3: PREENCHER SEU EMAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No formulário de cadastro, digite:

Email: ${data.cliente.email}

⚠️ IMPORTANTE: Use EXATAMENTE este email!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PASSO 4: CRIAR UMA SENHA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie uma senha segura (mínimo 8 caracteres)
Exemplo: MinhaSenh@123

⚠️ Guarde bem sua senha!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASSO 5: CONFIRMAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Clique em "Sign up" para criar sua conta.

Pronto! Você será automaticamente direcionado para o portal do cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 O QUE VOCÊ PODE FAZER NO PORTAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Abrir novos chamados de manutenção
✅ Acompanhar status dos seus chamados
✅ Ver histórico de atendimentos
✅ Consultar programação PMOC
✅ Visualizar seus equipamentos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qualquer dúvida, estamos à disposição!

📱 WhatsApp: ${data.cliente.whatsapp || data.cliente.telefone}
📧 Email: ${data.cliente.email}`;

        navigator.clipboard.writeText(mensagemParaEnviar).then(() => {
          alert(`✅ Cliente cadastrado com sucesso!

📋 INSTRUÇÕES COPIADAS!

As instruções detalhadas foram copiadas para sua área de transferência.

📱 ENVIE AGORA PARA O CLIENTE:

WhatsApp: ${data.cliente.whatsapp || data.cliente.telefone}
Email: ${data.cliente.email}

Cole (Ctrl+V ou Cmd+V) a mensagem no WhatsApp ou Email do cliente.`);
        }).catch(() => {
          alert(`✅ Cliente cadastrado com sucesso!

⚠️ COPIE E ENVIE ESTAS INSTRUÇÕES:

${mensagemParaEnviar}`);
        });
      } else {
        alert("Cliente cadastrado com sucesso!");
      }
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      alert(error.message || "Erro ao criar cliente. Verifique os dados e tente novamente.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, clienteData }) => {
      return await base44.entities.Cliente.update(id, {
        nome: clienteData.nome,
        email: clienteData.email,
        telefone: clienteData.telefone,
        whatsapp: clienteData.whatsapp,
        endereco: clienteData.endereco,
        latitude: clienteData.latitude,
        longitude: clienteData.longitude,
        tipo_estabelecimento: clienteData.tipo_estabelecimento,
        observacoes: clienteData.observacoes,
        tem_acesso_portal: clienteData.tem_acesso_portal,
        estabelecimentos: clienteData.estabelecimentos || []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      setShowForm(false);
      setEditingCliente(null);
      alert("Cliente atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar cliente:", error);
      alert("Erro ao atualizar cliente. Tente novamente.");
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
      alert("Cliente excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir cliente:", error);
      alert(error.message || "Erro ao excluir cliente.");
    }
  });

  const updateChamadoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Chamado.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados-equipamento']);
      setEditingChamado(null);
      alert("✅ Chamado atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar chamado:", error);
      alert("❌ Erro ao atualizar chamado");
    }
  });

  const deleteChamadoMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Chamado.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados-equipamento']);
      alert("✅ Chamado excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir chamado:", error);
      alert("❌ Erro ao excluir chamado");
    }
  });

  const handleSubmit = (clienteData) => {
    if (!empresaId) {
      alert("Erro: Usuário não está vinculado a nenhuma empresa.");
      return;
    }

    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, clienteData });
    } else {
      createMutation.mutate(clienteData);
    }
  };

  const handleDelete = (clienteId) => { // Modified to accept ID
    const clientToDelete = clientes.find(c => c.id === clienteId);
    if (clientToDelete && confirm(`Tem certeza que deseja excluir o cliente "${clientToDelete.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(clienteId);
    } else if (!clientToDelete) {
      alert("Cliente não encontrado para exclusão.");
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
    if (user.email !== "christianmoura2014@gmail.com") {
      if (!empresaId || cliente.empresa_id !== empresaId) return false;
    }
    // Filtra por nome ou telefone
    if (!searchTerm) return true;
    return cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefone?.includes(searchTerm);
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600 mt-1">
                {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''} · Gerencie seus clientes e acessos ao portal
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setEditingCliente(null); // Ensure no client is being edited when opening for new
              setShowForm(!showForm);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Cliente
          </Button>
        </div>

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

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando clientes...</p>
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum cliente cadastrado ainda.</p>
            <Button 
              onClick={() => setShowForm(true)}
              className="mt-4 bg-green-600 hover:bg-green-700"
            >
              Cadastrar Primeiro Cliente
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes.map((cliente) => {
              const clienteEquipamentos = equipamentos.filter(e => e.cliente_id === cliente.id);
              
              return (
                <Card 
                  key={cliente.id} 
                  className="shadow-lg border-none hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setViewingCliente(cliente)} // Changed from setSelectedCliente
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
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
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{cliente.telefone}</span>
                          </div>
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}