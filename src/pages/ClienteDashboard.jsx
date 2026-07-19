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
  Lock,
  Cpu,
  MapPin,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import ChamadoClienteForm from "../components/cliente/ChamadoClienteForm";
import KanbanChamados from "../components/chamados/KanbanChamados"; // Added import
import VisualizarChamadoCliente from "../components/cliente/VisualizarChamadoCliente";
import HistoricoEquipamentoCliente from "../components/cliente/HistoricoEquipamentoCliente"; // New import

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [showChamadoForm, setShowChamadoForm] = useState(false);
  const queryClient = useQueryClient();
  const [visualizacao, setVisualizacao] = useState('kanban'); // Added state for view type
  const [visualizandoChamado, setVisualizandoChamado] = useState(null);
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null);
  const [estabelecimentoAberto, setEstabelecimentoAberto] = useState(null);

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
        // Tenta pelo cliente_id salvo no perfil do usuário, ou pelo email
        const clienteId = currentUser.data?.cliente_id || currentUser.cliente_id;
        let meuCliente = null;
        if (clienteId) {
          const clientes = await base44.entities.Cliente.list();
          meuCliente = clientes.find(c => c.id === clienteId);
        }
        if (!meuCliente) {
          const clientes = await base44.entities.Cliente.list();
          meuCliente = clientes.find(c => c.email === currentUser.email);
        }
        setCliente(meuCliente);

        // Garantir que cliente_id está salvo no perfil do usuário (necessário para RLS)
        if (meuCliente && !currentUser.data?.cliente_id) {
          await base44.auth.updateMe({
            cliente_id: meuCliente.id,
            tipo_usuario: 'cliente',
            empresa_id: meuCliente.empresa_id,
            ultimo_acesso: new Date().toISOString()
          });
        } else {
          await base44.auth.updateMe({
            ultimo_acesso: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        navigate("/");
      }
    };
    loadUser();
  }, [navigate]);

  const empresaId = user?.data?.empresa_id || user?.empresa_id;

  // Buscar meus chamados
  const { data: meusChamados = [] } = useQuery({
    queryKey: ['meus-chamados-cliente', cliente?.id],
    queryFn: () => base44.entities.Chamado.filter({
      cliente_id: cliente.id
    }, '-created_date'),
    enabled: !!cliente
  });

  // Buscar meus PMOCs
  const { data: meusPMOCs = [] } = useQuery({
    queryKey: ['meus-pmocs-cliente', cliente?.id],
    queryFn: () => base44.entities.PMOC.filter({ cliente_id: cliente.id }),
    enabled: !!cliente
  });

  // manutencoesConcluidas removido — não exibido mais no portal do cliente

  // Buscar tecnicos
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      return base44.entities.Tecnico.filter({ empresa_id: empresaId });
    },
    enabled: !!empresaId
  });

  // Buscar equipamentos
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos-cliente', cliente?.id],
    queryFn: async () => {
      if (!cliente) return [];
      return base44.entities.Equipamento.filter({ cliente_id: cliente.id });
    },
    enabled: !!cliente
  });

  // Buscar chamados do equipamento selecionado
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

  // Buscar empresa
  const { data: empresa } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const empresas = await base44.entities.Empresa.list();
      return empresas.find(e => e.id === empresaId);
    },
    enabled: !!empresaId
  });

  const criarChamadoMutation = useMutation({
    mutationFn: async (data) => {
      // Criação direta: a policy de RLS em `chamado` já garante que um cliente
      // só consegue criar chamados com o próprio cliente_id (ver supabase/migrations).
      const empresaIdFinal = empresaId || cliente.empresa_id;
      const chamado = await base44.entities.Chamado.create({
        ...data,
        empresa_id: empresaIdFinal,
        cliente_id: cliente.id,
        numero_chamado: `CH${Date.now()}`,
        data_abertura: new Date().toISOString(),
        status: 'pendente',
        tipo_problema: data.tipo_problema || 'manutencao_corretiva',
        prioridade: data.prioridade || 'media',
      });

      // Buscar dados da empresa
      const empresas = await base44.entities.Empresa.list();
      const minhaEmpresa = empresas.find(e => e.id === empresaIdFinal);

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

  // Conditional rendering for equipment history
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

        {/* Meus Estabelecimentos */}
        {(() => {
          const estabelecimentos = cliente.estabelecimentos || [];
          // Equipamentos sem estabelecimento vinculado
          const equipSemEstabelecimento = equipamentos.filter(e => !e.estabelecimento_nome);
          // Todos os estabelecimentos para mostrar (incluindo os que têm equipamentos mesmo sem estar cadastrados)
          const nomesEstabelecimentosEquip = [...new Set(equipamentos.filter(e => e.estabelecimento_nome).map(e => e.estabelecimento_nome))];
          const todoEstabelecimentos = [
            ...estabelecimentos,
            ...nomesEstabelecimentosEquip.filter(nome => !estabelecimentos.find(e => e.nome === nome)).map(nome => ({ nome, endereco: '' }))
          ];

          if (todoEstabelecimentos.length === 0 && equipamentos.length === 0) return null;

          return (
            <Card className="shadow-lg border-none mb-8">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Meus Estabelecimentos ({todoEstabelecimentos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {todoEstabelecimentos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Nenhum estabelecimento cadastrado</div>
                ) : (
                  <div className="divide-y">
                    {todoEstabelecimentos.map((est, idx) => {
                      const equipsEst = equipamentos.filter(e => e.estabelecimento_nome === est.nome);
                      const chamadosEst = meusChamados.filter(c => {
                        // Se o estabelecimento tem endereço, filtrar chamados pelo mesmo endereço
                        if (est.endereco && est.endereco.trim() && c.local && c.local.trim()) {
                          const enderecoBase = est.endereco.toLowerCase().split(',')[0].trim();
                          const localBase = c.local.toLowerCase().split(',')[0].trim();
                          return localBase.includes(enderecoBase) || enderecoBase.includes(localBase);
                        }
                        // Sem endereço no estabelecimento: filtrar por equipamento
                        return equipsEst.some(e => e.id === c.equipamento_id || c.equipamentos_ids?.includes(e.id));
                      });
                      const isOpen = estabelecimentoAberto === est.nome;

                      return (
                        <div key={idx}>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                            onClick={() => setEstabelecimentoAberto(isOpen ? null : est.nome)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{est.nome}</p>
                                {est.endereco && <p className="text-sm text-gray-500">{est.endereco}</p>}
                                <p className="text-xs text-gray-400">{equipsEst.length} equipamento(s) · {chamadosEst.length} chamado(s)</p>
                              </div>
                            </div>
                            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </button>

                          {isOpen && (
                            <div className="bg-gray-50 px-4 pb-4">
                              {/* Equipamentos do estabelecimento */}
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 mb-2">Equipamentos</p>
                              {equipsEst.length === 0 ? (
                                <p className="text-sm text-gray-400 italic mb-3">Nenhum equipamento vinculado a este estabelecimento.</p>
                              ) : (
                                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                  {equipsEst.map((equip) => (
                                    <div
                                      key={equip.id}
                                      className="bg-white rounded-lg border p-3 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                                      onClick={() => handleVisualizarEquipamento(equip)}
                                    >
                                      {equip.foto_url ? (
                                        <img src={equip.foto_url} alt={equip.modelo} className="w-12 h-12 object-cover rounded border" />
                                      ) : (
                                        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center shrink-0">
                                          <Cpu className="w-6 h-6 text-blue-600" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 truncate">{equip.marca} {equip.modelo}</p>
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                          <Badge variant="outline" className="text-xs">{equip.tipo?.replace('_', ' ')}</Badge>
                                          {equip.capacidade && <Badge variant="outline" className="text-xs">{equip.capacidade}</Badge>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Chamados do estabelecimento */}
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Histórico de Chamados</p>
                              {chamadosEst.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">Nenhum chamado registrado para este estabelecimento.</p>
                              ) : (
                                <div className="space-y-2">
                                  {chamadosEst.slice(0, 5).map((c) => {
                                    const statusCfg = {
                                      pendente: "bg-orange-100 text-orange-800",
                                      em_andamento: "bg-blue-100 text-blue-800",
                                      finalizado: "bg-green-100 text-green-800",
                                      cancelado: "bg-gray-100 text-gray-800"
                                    };
                                    const isFinalizado = c.status === 'finalizado';
                                    return (
                                      <div
                                        key={c.id}
                                        className={`bg-white rounded border p-3 flex items-start justify-between gap-2 text-sm ${isFinalizado ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                        onClick={() => isFinalizado && handleVisualizarChamado(c)}
                                      >
                                        <div>
                                          <p className="font-medium text-gray-800">{c.numero_chamado} — {c.titulo}</p>
                                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {c.created_date ? format(new Date(c.created_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                                          </p>
                                        </div>
                                        <Badge className={statusCfg[c.status] || "bg-gray-100 text-gray-800"}>
                                          {c.status?.replace('_', ' ')}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                  {chamadosEst.length > 5 && (
                                    <p className="text-xs text-gray-400 text-center">+{chamadosEst.length - 5} chamado(s) mais antigos</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Equipamentos sem estabelecimento */}
                    {equipSemEstabelecimento.length > 0 && (
                      <div>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                          onClick={() => setEstabelecimentoAberto(estabelecimentoAberto === '__sem_local__' ? null : '__sem_local__')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Cpu className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-700">Sem local definido</p>
                              <p className="text-xs text-gray-400">{equipSemEstabelecimento.length} equipamento(s)</p>
                            </div>
                          </div>
                          {estabelecimentoAberto === '__sem_local__' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>
                        {estabelecimentoAberto === '__sem_local__' && (
                          <div className="bg-gray-50 px-4 pb-4 grid sm:grid-cols-2 gap-3 pt-2">
                            {equipSemEstabelecimento.map((equip) => (
                              <div
                                key={equip.id}
                                className="bg-white rounded-lg border p-3 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                                onClick={() => handleVisualizarEquipamento(equip)}
                              >
                                <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center shrink-0">
                                  <Cpu className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">{equip.marca} {equip.modelo}</p>
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs">{equip.tipo?.replace('_', ' ')}</Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

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