
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  LogOut,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Snowflake,
  Lock, // Added Lock icon
  Cpu // Added Cpu icon for equipment
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import ChamadoClienteForm from "../components/cliente/ChamadoClienteForm";
import KanbanChamados from "../components/chamados/KanbanChamados"; // Added import
import VisualizarPMOCCliente from "../components/pmoc/VisualizarPMOCCliente";
import VisualizarChamadoCliente from "../components/cliente/VisualizarChamadoCliente"; // New import
import HistoricoEquipamentoCliente from "../components/cliente/HistoricoEquipamentoCliente"; // New import

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [showChamadoForm, setShowChamadoForm] = useState(false);
  const queryClient = useQueryClient();
  const [visualizacao, setVisualizacao] = useState('kanban'); // Added state for view type
  const [visualizandoManutencao, setVisualizandoManutencao] = useState(null);
  const [visualizandoChamado, setVisualizandoChamado] = useState(null); // New state
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null); // New state

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();

        // Verificar se é cliente
        if (currentUser.tipo_usuario !== 'cliente') {
          navigate("/");
          return;
        }

        setUser(currentUser);

        // Buscar dados do cliente
        const clientes = await base44.entities.Cliente.list();
        const meuCliente = clientes.find(c => c.email === currentUser.email);
        setCliente(meuCliente);

        // Registrar último acesso
        await base44.auth.updateMe({
          ultimo_acesso: new Date().toISOString()
        });
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        navigate("/");
      }
    };
    loadUser();
  }, [navigate]);

  // Buscar meus chamados
  const { data: meusChamados = [] } = useQuery({
    queryKey: ['meus-chamados-cliente', cliente?.id],
    queryFn: () => base44.entities.Chamado.filter({
      empresa_id: user.empresa_id,
      cliente_id: cliente.id
    }, '-created_date'),
    enabled: !!cliente && !!user?.empresa_id
  });

  // Buscar meus PMOCs
  const { data: meusPMOCs = [] } = useQuery({
    queryKey: ['meus-pmocs-cliente', cliente?.id],
    queryFn: () => base44.entities.PMOC.filter({
      empresa_id: user.empresa_id,
      cliente_id: cliente.id
    }),
    enabled: !!cliente && !!user?.empresa_id
  });

  // Buscar manutenções concluídas do cliente
  const { data: manutencoesConcluidas = [] } = useQuery({
    queryKey: ['manutencoes-concluidas-cliente', cliente?.id],
    queryFn: async () => {
      if (!cliente || !user?.empresa_id) return [];
      return base44.entities.ManutencaoPMOC.filter({
        empresa_id: user.empresa_id,
        cliente_id: cliente.id,
        status: 'concluida'
      }, '-data_execucao');
    },
    enabled: !!cliente && !!user?.empresa_id
  });

  // Buscar tecnicos
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (!user?.empresa_id) return [];
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user?.empresa_id
  });

  // Buscar equipamentos
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos-cliente', cliente?.id],
    queryFn: async () => {
      if (!cliente || !user?.empresa_id) return [];
      return base44.entities.Equipamento.filter({
        empresa_id: user.empresa_id,
        cliente_id: cliente.id
      });
    },
    enabled: !!cliente && !!user?.empresa_id
  });

  // Buscar chamados do equipamento selecionado
  const { data: chamadosEquipamento = [] } = useQuery({
    queryKey: ['chamados-equipamento', visualizandoEquipamento?.id],
    queryFn: async () => {
      if (!visualizandoEquipamento || !user?.empresa_id) return [];
      return base44.entities.Chamado.filter({
        empresa_id: user.empresa_id,
        equipamento_id: visualizandoEquipamento.id
      }, '-data_finalizacao');
    },
    enabled: !!visualizandoEquipamento && !!user?.empresa_id
  });

  // Buscar empresa
  const { data: empresa } = useQuery({
    queryKey: ['empresa', user?.empresa_id],
    queryFn: async () => {
      if (!user?.empresa_id) return null;
      const empresas = await base44.entities.Empresa.list();
      return empresas.find(e => e.id === user.empresa_id);
    },
    enabled: !!user?.empresa_id
  });

  const criarChamadoMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Criar chamado
      const chamado = await base44.entities.Chamado.create({
        ...data,
        empresa_id: user.empresa_id,
        cliente_id: cliente.id,
        numero_chamado: `CH${Date.now()}`,
        data_abertura: new Date().toISOString(),
        status: 'pendente'
      });

      // 2. Buscar dados da empresa
      const empresas = await base44.entities.Empresa.list();
      const minhaEmpresa = empresas.find(e => e.id === user.empresa_id);
      
      return { chamado, empresa: minhaEmpresa };
    },
    onSuccess: ({ chamado, empresa }) => {
      queryClient.invalidateQueries(['meus-chamados-cliente']);
      setShowChamadoForm(false);
      
      // Criar mensagem para WhatsApp
      const mensagem = `🔔 *NOVO CHAMADO ABERTO*

*#${chamado.numero_chamado}*

📋 *DETALHES:*
Cliente: ${cliente.nome}
Título: ${chamado.titulo}
Descrição: ${chamado.descricao}
Local: ${chamado.local || 'Não informado'}
Prioridade: ${chamado.prioridade}

📞 *Contato:*
Tel: ${cliente.telefone}
Email: ${cliente.email}

🌐 *Acesse o sistema:*
https://climapro.base44.app/Chamados`;

      // Pegar telefone da empresa (remover caracteres especiais)
      const telefoneEmpresa = empresa?.telefone?.replace(/\D/g, '') || '';
      
      if (telefoneEmpresa) {
        // Abrir WhatsApp Web com mensagem pronta
        const whatsappUrl = `https://wa.me/${telefoneEmpresa}?text=${encodeURIComponent(mensagem)}`;
        window.open(whatsappUrl, '_blank');
        
        alert(`✅ Chamado criado com sucesso!

📱 O WhatsApp foi aberto automaticamente com a notificação.

Clique em ENVIAR para notificar a empresa.`);
      } else {
        // Se não tiver WhatsApp, copiar para clipboard
        navigator.clipboard.writeText(mensagem).then(() => {
          alert(`✅ Chamado criado com sucesso!

📋 Mensagem copiada para área de transferência.

Por favor, envie para a empresa:
📱 ${empresa?.telefone || 'Telefone não cadastrado'}`);
        }).catch(() => {
            alert(`✅ Chamado criado com sucesso!

⚠️ Não foi possível copiar a mensagem automaticamente.

Por favor, copie e envie manualmente para a empresa:
${mensagem}
`);
        });
      }
    },
    onError: (error) => {
      console.error("❌ ERRO ao criar chamado:", error);
      alert("Erro ao criar chamado. Tente novamente.");
    }
  });

  const handleLogout = () => {
    base44.auth.logout();
    navigate("/");
  };

  const handleSubmitChamado = (data) => {
    criarChamadoMutation.mutate(data);
  };

  const handleVisualizarManutencao = (manutencao) => {
    const pmoc = meusPMOCs.find(p => p.id === manutencao.pmoc_id);
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

  // New handler for visualizing service order
  const handleVisualizarChamado = (chamado) => {
    const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
    setVisualizandoChamado({ chamado, tecnico });
  };

  const handleVisualizarEquipamento = (equipamento) => {
    setVisualizandoEquipamento(equipamento);
  };

  if (!user || !cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Conditional rendering for VisualizarChamadoCliente
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

  // New: Conditional rendering for equipment history
  if (visualizandoEquipamento) {
    return (
      <HistoricoEquipamentoCliente
        equipamento={visualizandoEquipamento}
        chamados={chamadosEquipamento}
        tecnicos={tecnicos}
        empresa={empresa}
        onVoltar={() => setVisualizandoEquipamento(null)}
      />
    );
  }

  const chamadosPendentes = meusChamados.filter(c => c.status === 'pendente' || c.status === 'em_andamento').length;
  const chamadosFinalizados = meusChamados.filter(c => c.status === 'finalizado').length;

  const statusConfig = {
    pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
    em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
    finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
    cancelado: { color: "bg-gray-100 text-gray-800", label: "Cancelado" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Snowflake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Olá, {cliente.nome}! 👋
                </h1>
                <p className="text-sm text-gray-600 mt-1">Portal do Cliente</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/alterar-senha">
                <Button variant="outline">
                  <Lock className="w-4 h-4 mr-2" />
                  Alterar Senha
                </Button>
              </Link>
              
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Chamados Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-orange-600">{chamadosPendentes}</p>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Chamados Finalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-600">{chamadosFinalizados}</p>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">PMOCs Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-purple-600">{meusPMOCs.length}</p>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botão Abrir Chamado */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Abrir Novo Chamado</CardTitle>
              <Button
                onClick={() => setShowChamadoForm(!showChamadoForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Chamado
              </Button>
            </div>
          </CardHeader>
          {showChamadoForm && (
            <CardContent className="pt-6">
              <ChamadoClienteForm
                equipamentos={equipamentos}
                onSubmit={handleSubmitChamado}
                onCancel={() => setShowChamadoForm(false)}
                isLoading={criarChamadoMutation.isPending}
              />
            </CardContent>
          )}
        </Card>

        {/* Meus Chamados */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Meus Chamados</CardTitle>
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
            {meusChamados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum chamado aberto ainda
              </div>
            ) : visualizacao === 'kanban' ? (
              <KanbanChamados
                chamados={meusChamados}
                clientes={[cliente]} // Pass the current client as an array
                tecnicos={tecnicos}
                onView={null}
                onEdit={null}
                onDelete={null}
                onVisualizarChamado={handleVisualizarChamado}
                mostrarTecnico={false}
                mostrarCliente={false}
                mostrarBotoes={false} // Client shouldn't have edit/delete buttons or drag-and-drop
              />
            ) : (
              <div className="divide-y">
                {meusChamados.map((chamado) => (
                  <div key={chamado.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{chamado.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-2">{chamado.descricao}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            {chamado.created_date
                              ? format(new Date(chamado.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center"> {/* Adjusted for button alignment */}
                        <Badge className={statusConfig[chamado.status]?.color}>
                          {statusConfig[chamado.status]?.label}
                        </Badge>
                        {chamado.status === 'finalizado' && (
                          <Button
                            size="sm"
                            onClick={() => handleVisualizarChamado(chamado)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            👁️ Ver Relatório
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manutenções Concluídas (PMOCs) */}
        {manutencoesConcluidas.length > 0 && (
          <Card className="shadow-lg border-none mb-8">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Manutenções Concluídas ({manutencoesConcluidas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {manutencoesConcluidas.map((manutencao) => {
                  const pmoc = meusPMOCs.find(p => p.id === manutencao.pmoc_id);
                  const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
                  
                  return (
                    <div key={manutencao.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              PMOC {pmoc?.periodicidade || 'N/A'}
                            </h3>
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Concluído
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>🔧 Técnico: {tecnico?.nome || 'Não identificado'}</p>
                            <p>📅 Executado em: {manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</p>
                            <p>🏢 Equipamentos: {manutencao.equipamentos_ids?.length || 0}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleVisualizarManutencao(manutencao)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          👁️ Ver Relatório
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meus Equipamentos */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader className="border-b">
            <CardTitle>Meus Equipamentos ({equipamentos.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {equipamentos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum equipamento cadastrado ainda
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipamentos.map((equipamento) => (
                  <Card 
                    key={equipamento.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVisualizarEquipamento(equipamento)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {equipamento.foto_url ? (
                          <img
                            src={equipamento.foto_url}
                            alt={equipamento.modelo}
                            className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Cpu className="w-8 h-8 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {equipamento.marca} {equipamento.modelo}
                          </h4>
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {equipamento.tipo.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {equipamento.capacidade}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">
                            📍 {equipamento.localizacao}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meus PMOCs */}
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b">
            <CardTitle>Programação de Manutenções (PMOC)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {meusPMOCs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum PMOC programado
              </div>
            ) : (
              <div className="divide-y">
                {meusPMOCs.map((pmoc) => (
                  <div key={pmoc.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">PMOC {pmoc.periodicidade}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Próxima manutenção: {pmoc.proxima_manutencao
                              ? format(new Date(pmoc.proxima_manutencao), "dd/MM/yyyy", { locale: ptBR })
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">
                        {pmoc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
