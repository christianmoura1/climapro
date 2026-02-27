
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, AlertCircle, Filter, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import PMOCForm from "../components/pmoc/PMOCForm";
import PMOCList from "../components/pmoc/PMOCList";
import PMOCDetail from "../components/pmoc/PMOCDetail";
import AprovarPMOCEmpresa from "../components/pmoc/AprovarPMOCEmpresa";
import VisualizarPMOCCliente from "../components/pmoc/VisualizarPMOCCliente";

export default function PMOCPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPMOC, setEditingPMOC] = useState(null);
  const [viewingPMOC, setViewingPMOC] = useState(null);
  const [aprovandoManutencao, setAprovandoManutencao] = useState(null);
  const [visualizandoManutencao, setVisualizandoManutencao] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // FILTRAR PMOCS POR EMPRESA E CLIENTE
  const { data: pmocs = [], isLoading } = useQuery({
    queryKey: ['pmocs', user?.empresa_id, filtroCliente],
    queryFn: async () => {
      if (!user) return [];
      
      const filters = { empresa_id: user.empresa_id };
      
      // Aplicar filtro de cliente se selecionado
      if (filtroCliente) {
        filters.cliente_id = filtroCliente;
      }
      
      if (user?.email === "christianmoura2014@gmail.com") {
        if (filtroCliente) {
          return base44.entities.PMOC.filter({ cliente_id: filtroCliente }, '-created_date');
        }
        return base44.entities.PMOC.list('-created_date');
      }
      
      return base44.entities.PMOC.filter(filters, '-created_date');
    },
    enabled: !!user
  });

  // Buscar manutenções aguardando aprovação
  const { data: manutencoesAguardandoAprovacao = [] } = useQuery({
    queryKey: ['manutencoes-aguardando-aprovacao', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.ManutencaoPMOC.filter({
          status: 'aguardando_aprovacao_empresa'
        }, '-data_execucao');
      }
      return base44.entities.ManutencaoPMOC.filter({
        empresa_id: user.empresa_id,
        status: 'aguardando_aprovacao_empresa'
      }, '-data_execucao');
    },
    enabled: !!user
  });

  // FILTRAR CLIENTES POR EMPRESA
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if (user?.email === "christianmoura2014@gmail.com") {
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
      if (!user) return []; // Ensure user is loaded before fetching
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // FILTRAR EQUIPAMENTOS POR EMPRESA
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.Equipamento.list();
      }
      return base44.entities.Equipamento.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // Buscar histórico de manutenções concluídas
  const { data: manutencoesConcluidas = [] } = useQuery({
    queryKey: ['manutencoes-concluidas', user?.empresa_id, filtroCliente],
    queryFn: async () => {
      if (!user) return [];
      
      const filters = {
        empresa_id: user.empresa_id,
        status: 'concluida'
      };
      
      if (filtroCliente) {
        filters.cliente_id = filtroCliente;
      }
      
      if (user?.email === "christianmoura2014@gmail.com") {
        if (filtroCliente) {
          return base44.entities.ManutencaoPMOC.filter(
            { status: 'concluida', cliente_id: filtroCliente },
            '-data_execucao'
          );
        }
        return base44.entities.ManutencaoPMOC.filter(
          { status: 'concluida' },
          '-data_execucao'
        );
      }
      
      return base44.entities.ManutencaoPMOC.filter(filters, '-data_execucao');
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PMOC.create(data),
    onSuccess: async (newPMOC) => {
      queryClient.invalidateQueries(['pmocs']);
      setShowForm(false);
      
      // Enviar notificação por e-mail
      const cliente = clientes.find(c => c.id === newPMOC.cliente_id);
      if (cliente?.email) {
        await base44.integrations.Core.SendEmail({
          to: cliente.email,
          subject: "PMOC Criado - ClimaPro",
          body: `Olá ${cliente.nome},\n\nSeu PMOC foi criado com sucesso.\nPeriodicidade: ${newPMOC.periodicidade}\nPróxima manutenção: ${format(new Date(newPMOC.proxima_manutencao), "dd/MM/yyyy", { locale: ptBR })}\n\nAtenciosamente,\nEquipe ClimaPro`
        });
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PMOC.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pmocs']);
      setShowForm(false);
      setEditingPMOC(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PMOC.delete(id), 
    onSuccess: () => {
      queryClient.invalidateQueries(['pmocs']);
      alert("✅ PMOC excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir PMOC:", error);
      alert("❌ Erro ao excluir PMOC. Tente novamente.");
    }
  });

  const deleteManutencaoMutation = useMutation({
    mutationFn: (id) => base44.entities.ManutencaoPMOC.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['manutencoes-concluidas']);
      queryClient.invalidateQueries(['pmocs']);
      alert("✅ Histórico de manutenção excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir manutenção:", error);
      alert("❌ Erro ao excluir histórico. Tente novamente.");
    }
  });

  const handleSubmit = async (data) => {
    // Calcular próxima manutenção baseado na periodicidade
    const dataInicio = new Date(data.data_inicio);
    let proximaManutencao = new Date(dataInicio);
    
    switch (data.periodicidade) {
      case 'mensal':
        proximaManutencao.setMonth(proximaManutencao.getMonth() + 1);
        break;
      case 'bimestral':
        proximaManutencao.setMonth(proximaManutencao.getMonth() + 2);
        break;
      case 'trimestral':
        proximaManutencao.setMonth(proximaManutencao.getMonth() + 3);
        break;
      case 'semestral':
        proximaManutencao.setMonth(proximaManutencao.getMonth() + 6);
        break;
      case 'anual':
        proximaManutencao.setFullYear(proximaManutencao.getFullYear() + 1);
        break;
      default:
        // Default to monthly if periodicidade is not recognized
        proximaManutencao.setMonth(proximaManutencao.getMonth() + 1);
    }

    // Preparar mês de referência (primeiro dia do mês)
    const mesReferencia = new Date(data.data_inicio);
    mesReferencia.setDate(1);

    const pmocData = {
      ...data,
      empresa_id: user.empresa_id,
      mes_referencia: mesReferencia.toISOString().split('T')[0],
      data_execucao_programada: proximaManutencao.toISOString().split('T')[0],
      proxima_manutencao: proximaManutencao.toISOString().split('T')[0]
    };

    if (editingPMOC) {
      updateMutation.mutate({ id: editingPMOC.id, data: pmocData });
    } else {
      // Criar PMOC
      const newPMOC = await createMutation.mutateAsync(pmocData);
      
      // 🆕 CRIAR EVENTO NA AGENDA AUTOMATICAMENTE
      try {
        const cliente = clientes.find(c => c.id === pmocData.cliente_id);
        const tecnico = tecnicos.find(t => t.id === pmocData.tecnico_responsavel_id);
        
        // Criar evento na agenda
        await base44.entities.AgendaEvento.create({
          empresa_id: user.empresa_id,
          pmoc_id: newPMOC.id,
          cliente_id: pmocData.cliente_id,
          tecnico_id: pmocData.tecnico_responsavel_id,
          titulo: `PMOC ${pmocData.periodicidade} - ${cliente?.nome || 'Cliente'}`,
          descricao: `Manutenção preventiva ${pmocData.periodicidade} programada`,
          tipo: 'pmoc',
          origem: 'automatico',
          data_inicio: new Date(proximaManutencao).toISOString(),
          data_fim: new Date(new Date(proximaManutencao).setHours(new Date(proximaManutencao).getHours() + 2)).toISOString(),
          endereco: cliente?.endereco || '',
          latitude: cliente?.latitude,
          longitude: cliente?.longitude,
          status: 'pendente',
          cor: '#9333ea',
          recorrente: true,
          frequencia_recorrencia: pmocData.periodicidade === 'mensal' ? 'mensal' :
                                  pmocData.periodicidade === 'bimestral' ? 'mensal' : // This is as per outline, 'bimestral' maps to 'mensal'
                                  pmocData.periodicidade === 'trimestral' ? 'trimestral' :
                                  pmocData.periodicidade === 'semestral' ? 'semestral' :
                                  'anual' // Default for 'anual' or any other unrecognized
        });
        
        // Enviar notificação ao técnico se designado
        if (tecnico?.email) {
          await base44.integrations.Core.SendEmail({
            to: tecnico.email,
            subject: `📅 Novo PMOC Agendado - ${cliente?.nome}`,
            body: `Olá ${tecnico.nome},

Um novo PMOC foi agendado para você:

📋 Cliente: ${cliente?.nome}
📍 Endereço: ${cliente?.endereco}
📆 Data: ${format(proximaManutencao, "dd/MM/yyyy", { locale: ptBR })}
🔄 Periodicidade: ${pmocData.periodicidade}

O PMOC foi adicionado automaticamente à sua agenda.

Atenciosamente,
ClimaPro`
          });
        }
      } catch (error) {
        console.error("Erro ao criar evento na agenda ou enviar e-mail:", error);
        // Não bloquear a criação do PMOC se falhar a criação do evento ou envio de e-mail
      }
    }
  };

  const handleDelete = (pmoc) => {
    if (window.confirm(`⚠️ Confirma a exclusão do PMOC de ${clientes.find(c => c.id === pmoc.cliente_id)?.nome || 'cliente'}?\n\nEsta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(pmoc.id);
    }
  };

  const handleAprovarManutencao = (manutencao) => {
    const pmoc = pmocs.find(p => p.id === manutencao.pmoc_id);
    const cliente = clientes.find(c => c.id === manutencao.cliente_id);
    const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
    const equipamentosManutencao = equipamentos.filter(e => 
      manutencao.equipamentos_ids?.includes(e.id)
    );

    setAprovandoManutencao({
      manutencao,
      pmoc,
      cliente,
      tecnico,
      equipamentos: equipamentosManutencao
    });
  };

  const handleVisualizarManutencao = (manutencao) => {
    const pmoc = pmocs.find(p => p.id === manutencao.pmoc_id);
    const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
    const equipamentosManutencao = equipamentos.filter(e => 
      manutencao.equipamentos_ids?.includes(e.id)
    );

    setVisualizandoManutencao({
      manutencao,
      pmoc,
      tecnico,
      equipamentos: equipamentosManutencao
    });
  };

  const handleBaixarPDFManutencao = async (manutencao) => {
    // Abrir o modal de visualização que já tem o botão de baixar PDF
    handleVisualizarManutencao(manutencao);
  };

  const handleDeleteManutencao = (manutencao) => {
    const cliente = clientes.find(c => c.id === manutencao.cliente_id);
    const confirmar = window.confirm(
      `⚠️ Confirma a exclusão do histórico de manutenção?\n\nCliente: ${cliente?.nome || 'N/A'}\nData: ${manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}\n\n⚠️ ATENÇÃO: Esta ação irá excluir o histórico para a empresa, cliente e técnico.\n\nEsta ação não pode ser desfeita.`
    );
    
    if (confirmar) {
      deleteManutencaoMutation.mutate(manutencao.id);
    }
  };

  if (aprovandoManutencao) {
    return (
      <AprovarPMOCEmpresa
        manutencao={aprovandoManutencao.manutencao}
        pmoc={aprovandoManutencao.pmoc}
        cliente={aprovandoManutencao.cliente}
        tecnico={aprovandoManutencao.tecnico}
        equipamentos={aprovandoManutencao.equipamentos}
        onClose={() => setAprovandoManutencao(null)}
      />
    );
  }

  if (visualizandoManutencao) {
    return (
      <VisualizarPMOCCliente
        manutencao={visualizandoManutencao.manutencao}
        pmoc={visualizandoManutencao.pmoc}
        tecnico={visualizandoManutencao.tecnico}
        equipamentos={visualizandoManutencao.equipamentos}
        onClose={() => setVisualizandoManutencao(null)}
      />
    );
  }

  if (viewingPMOC) {
    return (
      <PMOCDetail
        pmoc={viewingPMOC}
        cliente={clientes.find(c => c.id === viewingPMOC.cliente_id)}
        tecnico={tecnicos.find(t => t.id === viewingPMOC.tecnico_responsavel_id)}
        onClose={() => setViewingPMOC(null)}
        onUpdate={(updatedData) => {
          updateMutation.mutate({ id: viewingPMOC.id, data: updatedData });
          setViewingPMOC(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PMOC</h1>
              <p className="text-gray-600 mt-1">Planos de Manutenção, Operação e Controle</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setShowForm(!showForm);
              setEditingPMOC(null); // Ensure no PMOC is being edited when opening new form
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo PMOC
          </Button>
        </div>

        {/* Seção de PMOCs aguardando aprovação */}
        {manutencoesAguardandoAprovacao.length > 0 && (
          <Card className="mb-8 shadow-lg border-2 border-orange-200 bg-orange-50">
            <CardHeader className="bg-orange-100 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <CardTitle className="text-orange-900">
                    PMOCs Aguardando Aprovação ({manutencoesAguardandoAprovacao.length})
                  </CardTitle>
                </div>
                <Badge className="bg-orange-600 text-white">
                  Ação Necessária
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-orange-200">
                {manutencoesAguardandoAprovacao.map((manutencao) => {
                  const cliente = clientes.find(c => c.id === manutencao.cliente_id);
                  const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
                  const pmoc = pmocs.find(p => p.id === manutencao.pmoc_id);
                  
                  return (
                    <div key={manutencao.id} className="p-4 hover:bg-orange-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {cliente?.nome || 'Cliente não identificado'}
                            </h3>
                            <Badge className="bg-purple-100 text-purple-800 capitalize">
                              {pmoc?.periodicidade || 'N/A'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>🔧 Técnico: {tecnico?.nome || 'Não atribuído'}</p>
                            <p>📅 Executado em: {manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}</p>
                            <p>🏢 Equipamentos: {manutencao.equipamentos_ids?.length || 0}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAprovarManutencao(manutencao)}
                          className="bg-green-600 hover:bg-green-700"
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
          <PMOCForm
            pmoc={editingPMOC}
            clientes={clientes}
            tecnicos={tecnicos}
            equipamentos={equipamentos}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPMOC(null);
            }}
          />
        )}

        {/* Seção de Histórico de PMOCs Concluídos */}
        <Card className="mb-8 shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                📋 Histórico de PMOCs Concluídos
              </CardTitle>
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <div className="w-64">
                  <Label className="sr-only">Filtrar por Cliente</Label>
                  <select
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Todos os Clientes</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {manutencoesConcluidas.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {filtroCliente 
                  ? "Nenhum PMOC concluído para este cliente" 
                  : "Nenhum PMOC concluído ainda"}
              </div>
            ) : (
              <div className="divide-y">
                {manutencoesConcluidas.map((manutencao) => {
                  const cliente = clientes.find(c => c.id === manutencao.cliente_id);
                  const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
                  const pmoc = pmocs.find(p => p.id === manutencao.pmoc_id);
                  
                  return (
                    <div key={manutencao.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {cliente?.nome || 'Cliente não identificado'}
                            </h3>
                            <Badge className="bg-purple-100 text-purple-800 capitalize">
                              {pmoc?.periodicidade || 'N/A'}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Concluído
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>🔧 Técnico: {tecnico?.nome || 'Não identificado'}</p>
                            <p>📅 Executado em: {manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</p>
                            <p>🏢 Equipamentos: {manutencao.equipamentos_ids?.length || 0}</p>
                            {manutencao.data_aprovacao_empresa && (
                              <p>✅ Aprovado em: {format(new Date(manutencao.data_aprovacao_empresa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleVisualizarManutencao(manutencao)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            👁️ Ver
                          </Button>
                          <Button
                            onClick={() => handleBaixarPDFManutencao(manutencao)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                          <Button
                            onClick={() => handleDeleteManutencao(manutencao)}
                            variant="outline"
                            size="sm"
                            disabled={deleteManutencaoMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deleteManutencaoMutation.isPending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <>🗑️</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <PMOCList
          pmocs={pmocs}
          clientes={clientes}
          tecnicos={tecnicos}
          isLoading={isLoading}
          onView={setViewingPMOC}
          onEdit={(pmoc) => {
            setEditingPMOC(pmoc);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
