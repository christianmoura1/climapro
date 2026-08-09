import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CalendarRange,
  BookOpen,
  LogOut,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Snowflake,
  Lock,
  FileText
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import ChamadoClienteForm from "../components/cliente/ChamadoClienteForm";
import KanbanChamados from "../components/chamados/KanbanChamados"; // Added import
import VisualizarChamadoCliente from "../components/cliente/VisualizarChamadoCliente";
import HistoricoEquipamentoCliente from "../components/cliente/HistoricoEquipamentoCliente";
import OrcamentosClientePortal from "../components/cliente/OrcamentosClientePortal";
import EquipamentosClientePortal from "../components/cliente/EquipamentosClientePortal";
import QRCodeEquipamentoModal from "../components/equipamentos/QRCodeEquipamentoModal";
import PlanoAnualPMOC from "../components/pmoc/PlanoAnualPMOC";
import VisualizarPMOCCliente from "../components/pmoc/VisualizarPMOCCliente";
import CadernoManutencaoPDF from "../components/pmoc/CadernoManutencaoPDF";
import { dataVisitaDoMes, indexarAgendamentos, proximaVisita } from "@/lib/pmocDataVisita";
import { PageLoading } from "@/components/ui/page-loading";
import SinoNotificacoes from "@/components/ui/sino-notificacoes";
import { toast } from "@/components/ui/use-toast";

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [showChamadoForm, setShowChamadoForm] = useState(false);
  const queryClient = useQueryClient();
  const [visualizacao, setVisualizacao] = useState('kanban'); // Added state for view type
  const [visualizandoChamado, setVisualizandoChamado] = useState(null);
  const [visualizandoEquipamento, setVisualizandoEquipamento] = useState(null);
  const [qrEquipamento, setQrEquipamento] = useState(null);
  const [verPlanoAnual, setVerPlanoAnual] = useState(false);
  const [verCaderno, setVerCaderno] = useState(false);
  const [vendoExecucao, setVendoExecucao] = useState(null);

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

  // Remarcações de mês, para o cliente ver a data que a empresa realmente
  // programou e não a data padrão do contrato.
  const { data: agendamentosPMOC = [] } = useQuery({
    queryKey: ['pmoc-agendamentos', cliente?.id],
    queryFn: () => base44.entities.PmocAgendamento.filter({ cliente_id: cliente.id }),
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

  const { data: orcamentos = [], isLoading: orcamentosLoading } = useQuery({
    queryKey: ['orcamentos-cliente', cliente?.id],
    queryFn: () => base44.entities.Orcamento.filter({ cliente_id: cliente.id }, '-created_date'),
    enabled: !!cliente
  });

  const { data: manutencoes = [] } = useQuery({
    queryKey: ['manutencoes-cliente', cliente?.id],
    queryFn: () => base44.entities.ManutencaoPMOC.filter({ cliente_id: cliente.id }, '-data_execucao'),
    enabled: !!cliente
  });

  const orcamentosVisiveis = orcamentos.filter((item) => !['rascunho', 'cancelado'].includes(item.status));
  // Inclui chamados antigos com equipamento_id e rodadas com equipamentos_ids.
  const chamadosEquipamento = visualizandoEquipamento
    ? meusChamados.filter((item) => item.equipamento_id === visualizandoEquipamento.id || item.equipamentos_ids?.includes(visualizandoEquipamento.id))
    : [];

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
https://geradordepmoc.com.br/Chamados`;

      // Pegar telefone da empresa (remover caracteres especiais)
      const telefoneEmpresa = empresa?.telefone?.replace(/\D/g, '') || '';
      
      if (telefoneEmpresa) {
        // Abrir WhatsApp Web com mensagem pronta
        const whatsappUrl = `https://wa.me/${telefoneEmpresa}?text=${encodeURIComponent(mensagem)}`;
        window.open(whatsappUrl, '_blank');
        
        toast({ description: `✅ Chamado criado com sucesso!

📱 O WhatsApp foi aberto automaticamente com a notificação.

Clique em ENVIAR para notificar a empresa.`, variant: "success" });
      } else {
        // Se não tiver WhatsApp, copiar para clipboard
        navigator.clipboard.writeText(mensagem).then(() => {
          toast({ description: `✅ Chamado criado com sucesso!

📋 Mensagem copiada para área de transferência.

Por favor, envie para a empresa:
📱 ${empresa?.telefone || 'Telefone não cadastrado'}`, variant: "success" });
        }).catch(() => {
            toast({ description: `✅ Chamado criado com sucesso!

⚠️ Não foi possível copiar a mensagem automaticamente.

Por favor, copie e envie manualmente para a empresa:
${mensagem}
`, variant: "success" });
        });
      }
    },
    onError: (error) => {
      console.error("❌ ERRO ao criar chamado:", error);
      toast({ description: "Erro ao criar chamado. Tente novamente.", variant: "destructive" });
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
      <PageLoading />
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
        manutencoes={manutencoes.filter((item) => item.equipamentos_ids?.includes(visualizandoEquipamento.id))}
        onVoltar={() => setVisualizandoEquipamento(null)}
      />
    );
  }

  // A programação sai dos equipamentos no plano, não da tabela `pmoc`: aquela
  // linha só nasce quando a empresa executa a primeira rodada, e até lá o
  // cliente via "Nenhum PMOC programado" mesmo tendo equipamento no contrato.
  const equipamentosNoPlano = equipamentos.filter((eq) => eq.pmoc_ativo);
  // Rodada ainda em aprovação interna não é do cliente: ele vê o que a empresa
  // já liberou.
  const manutencoesRealizadas = manutencoes.filter(
    (m) => m.status === 'concluida' || m.status === 'aguardando_validacao_cliente'
  );
  const indiceAgendamentos = indexarAgendamentos(agendamentosPMOC);
  const visitaAgendada = cliente ? proximaVisita(cliente, indiceAgendamentos) : null;
  const proximasVisitas = cliente
    ? Array.from({ length: 6 }, (_, i) => {
        const base = new Date();
        base.setDate(1);
        base.setMonth(base.getMonth() + i);
        return dataVisitaDoMes(cliente, base.getFullYear(), base.getMonth(), indiceAgendamentos);
      }).filter((v) => v.data >= new Date(new Date().setHours(0, 0, 0, 0))).slice(0, 5)
    : [];

  const chamadosPendentes = meusChamados.filter(c => c.status === 'pendente' || c.status === 'em_andamento').length;
  const chamadosFinalizados = meusChamados.filter(c => c.status === 'finalizado').length;

  const statusConfig = {
    pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
    em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
    finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
    cancelado: { color: "bg-muted text-foreground", label: "Cancelado" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Snowflake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Olá, {cliente.nome}! 👋
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Portal do Cliente</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <SinoNotificacoes />

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
              <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Ativos</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Finalizados</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Equipamentos no PMOC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-purple-600">{equipamentosNoPlano.length}</p>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botão Abrir Chamado */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="p-8 text-center text-muted-foreground">
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
                  <div key={chamado.id} className="p-4 hover:bg-muted">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{chamado.titulo}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{chamado.descricao}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

        {/* Orçamentos enviados pela empresa */}
        <Card id="orcamentos" className="mb-8 border-none shadow-lg scroll-mt-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Meus Orçamentos ({orcamentosVisiveis.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <OrcamentosClientePortal orcamentos={orcamentosVisiveis} isLoading={orcamentosLoading} />
          </CardContent>
        </Card>

        {/* Cadastro, histórico e QR Code dos ativos */}
        <Card id="equipamentos" className="mb-8 border-none shadow-lg scroll-mt-6">
          <CardHeader className="border-b">
            <CardTitle>Meus Equipamentos ({equipamentos.length})</CardTitle>
            <p className="text-sm text-muted-foreground">Consulte os dados, o histórico de manutenção e o QR Code de cada ativo.</p>
          </CardHeader>
          <CardContent className="p-6">
            <EquipamentosClientePortal
              equipamentos={equipamentos}
              onHistorico={handleVisualizarEquipamento}
              onQrCode={setQrEquipamento}
            />
          </CardContent>
        </Card>
        {/* Meus PMOCs */}
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Programação de Manutenções (PMOC)</CardTitle>
              {equipamentosNoPlano.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" className="w-full whitespace-normal" onClick={() => setVerPlanoAnual(true)}>
                    <CalendarRange className="w-4 h-4 mr-2" />
                    Abrir plano anual
                  </Button>
                  <Button variant="outline" className="w-full whitespace-normal" onClick={() => setVerCaderno(true)}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Abrir caderno
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {equipamentosNoPlano.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum equipamento no plano de manutenção preventiva.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-indigo-950">
                        {visitaAgendada
                          ? `Próxima visita: ${format(visitaAgendada.data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                          : 'Próxima visita: a definir'}
                      </p>
                      <p className="text-sm text-indigo-900/80">
                        {equipamentosNoPlano.length} equipamento(s) no plano de manutenção preventiva.
                      </p>
                      {visitaAgendada?.remarcada && (
                        <p className="mt-1 text-sm text-amber-800">Data remarcada pela empresa.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Próximas visitas</p>
                  <ul className="divide-y rounded-lg border">
                    {proximasVisitas.map((visita) => (
                      <li key={visita.data.toISOString()} className="flex items-center justify-between p-3 text-sm">
                        <span className="capitalize text-muted-foreground">
                          {format(visita.data, "MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <span className="font-semibold text-foreground">
                          {format(visita.data, "dd/MM/yyyy", { locale: ptBR })}
                          {visita.remarcada && (
                            <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700">remarcada</Badge>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Manutenções realizadas</p>
                  {manutencoesRealizadas.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      Nenhuma visita concluída ainda. Assim que a empresa finalizar a primeira, o
                      relatório aparece aqui.
                    </p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {manutencoesRealizadas.map((item) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-foreground">
                              {item.data_execucao
                                ? format(new Date(item.data_execucao), "dd/MM/yyyy", { locale: ptBR })
                                : 'Data não informada'}
                            </span>
                            {item.status === 'aguardando_validacao_cliente' && (
                              <Badge variant="outline" className="border-amber-300 text-amber-700">
                                aguardando sua validação
                              </Badge>
                            )}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setVendoExecucao(item)}>
                            Ver o que foi feito
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    {verPlanoAnual && (
      <PlanoAnualPMOC
        cliente={cliente}
        equipamentos={equipamentosNoPlano}
        empresaId={empresaId}
        pmocId={meusPMOCs[0]?.id || null}
        somenteLeitura
        onClose={() => setVerPlanoAnual(false)}
      />
    )}
    {vendoExecucao && (
      <VisualizarPMOCCliente
        manutencao={vendoExecucao}
        pmoc={meusPMOCs.find((p) => p.id === vendoExecucao.pmoc_id) || null}
        tecnico={tecnicos.find((t) => t.id === vendoExecucao.tecnico_id) || null}
        equipamentos={equipamentos.filter((eq) => vendoExecucao.equipamentos_ids?.includes(eq.id))}
        onClose={() => setVendoExecucao(null)}
      />
    )}
    {verCaderno && (
      <CadernoManutencaoPDF
        cliente={cliente}
        equipamentos={equipamentosNoPlano}
        onClose={() => setVerCaderno(false)}
      />
    )}
    {qrEquipamento && (
      <QRCodeEquipamentoModal
        equipamento={qrEquipamento}
        cliente={cliente}
        onClose={() => setQrEquipamento(null)}
      />
    )}    </div>
  );
}
