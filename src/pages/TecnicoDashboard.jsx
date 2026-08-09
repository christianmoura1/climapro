
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Calendar, 
  DollarSign, // Keeping Clock icon for general time-related contexts if needed
  AlertCircle,
  CheckCircle,
  LogOut,
  Wallet,
  TrendingUp,
  TrendingDown,
  Lock,
  Plus,
  Wrench
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import

import MeusChamados from "../components/tecnico/MeusChamados";
import MeusPMOCs from "../components/tecnico/MeusPMOCs";
import ControleFinanceiroTecnico from "../components/tecnico/ControleFinanceiroTecnico";
import OrcamentosPendentes from "../components/tecnico/OrcamentosPendentes";
import CreditosPendentes from "../components/tecnico/CreditosPendentes";
import RegistrarPonto from "../components/ponto/RegistrarPonto"; // New import for Ponto Eletrônico component
import AprovarEdicoesPonto from "../components/ponto/AprovarEdicoesPonto";
import { PageLoading } from "@/components/ui/page-loading";
import SinoNotificacoes from "@/components/ui/sino-notificacoes";
import { toast } from "@/components/ui/use-toast";
import ChamadoForm from "@/components/chamados/ChamadoForm";
import EquipamentoForm from "@/components/equipamentos/EquipamentoForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper function for creating page URLs, as implied by the outline.
// For "AlterarSenha", it's assumed there's a route configured at /alterar-senha.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case "AlterarSenha":
      return "/alterar-senha";
    // Add other cases if needed for other pages
    default:
      return "/";
  }
};

export default function TecnicoDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tecnico, setTecnico] = useState(null);
  const [abaSelecionada, setAbaSelecionada] = useState('chamados');
  const [showRegistrarPontoModal, setShowRegistrarPontoModal] = useState(false); // New state to control Ponto Eletrônico modal visibility
  const [showNovoChamado, setShowNovoChamado] = useState(false);
  const [showNovoEquipamento, setShowNovoEquipamento] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (currentUser.tipo_usuario !== 'tecnico') {
          navigate("/");
          return;
        }

        setUser(currentUser);

        if (currentUser.tecnico_id) {
          // Optimized to filter directly instead of listing all
          const tecnicoData = await base44.entities.Tecnico.filter({ id: currentUser.tecnico_id });
          const meuTecnico = tecnicoData[0]; // Assuming ID is unique, only one will be returned
          setTecnico(meuTecnico);

          if (meuTecnico?.status !== 'ativo') {
            toast({ description: "Sua conta está inativa. Entre em contato com o administrador.", variant: "default" });
            base44.auth.logout();
            navigate("/"); // Redirect to home/login after logout
            return;
          }
        }

        try {
          await base44.auth.updateMe({
            ultimo_acesso: new Date().toISOString()
          });
        } catch (error) {
          console.warn("Não foi possível atualizar o último acesso do técnico:", error);
        }

        // O registro de auditoria é complementar e não pode impedir o técnico
        // de usar o painel quando uma política RLS recusar a inserção.
        try {
          await base44.entities.LogAcao.create({
            empresa_id: currentUser.empresa_id,
            user_id: currentUser.id,
            user_email: currentUser.email,
            tipo_usuario: currentUser.tipo_usuario,
            acao: "Login no sistema",
            data_hora: new Date().toISOString()
          });
        } catch (error) {
          console.warn("Não foi possível registrar o login do técnico:", error);
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        // Clear user/tecnico state and redirect on error
        setUser(null); 
        setTecnico(null);
        navigate("/");
      }
    };
    loadUser();
  }, [navigate]); // Added navigate to dependency array for best practice, though it's stable

  // Ensure all queries are enabled only when `user` and `tecnico` are properly loaded
  const { data: meusChamados = [] } = useQuery({
    queryKey: ['meus-chamados', tecnico?.id],
    queryFn: () => base44.entities.Chamado.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id
    }, '-created_date'),
    enabled: !!tecnico && !!user?.empresa_id
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: () => base44.entities.Cliente.filter({ empresa_id: user.empresa_id }),
    enabled: !!user?.empresa_id
  });

  const criarChamadoMutation = useMutation({
    mutationFn: ({ chamadoData }) => base44.entities.Chamado.create({
      ...chamadoData,
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      created_by: user.id,
      status: 'pendente',
      origem: 'manual',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meus-chamados'] });
      setShowNovoChamado(false);
      setAbaSelecionada('chamados');
      toast({ description: "Chamado aberto e atribuído a você.", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao abrir chamado:", error);
      toast({ description: `Não foi possível abrir o chamado: ${error.message}`, variant: "destructive" });
    },
  });

  const criarEquipamentoMutation = useMutation({
    mutationFn: (equipamentoData) => base44.entities.Equipamento.create({
      ...equipamentoData,
      empresa_id: user.empresa_id,
      created_by: user.id,
    }),
    onSuccess: () => {
      setShowNovoEquipamento(false);
      toast({ description: "Equipamento cadastrado com sucesso.", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao cadastrar equipamento:", error);
      toast({ description: `Não foi possível cadastrar o equipamento: ${error.message}`, variant: "destructive" });
    },
  });
  // Clientes com equipamento no plano de manutenção. O contador antigo lia a
  // tabela `pmoc` filtrando por tecnico_responsavel_id — campo que nenhuma tela
  // preenche — e por isso marcava 0 mesmo com o plano cheio.
  const { data: equipamentosPMOC = [] } = useQuery({
    queryKey: ['equipamentos-pmoc-empresa', user?.empresa_id],
    queryFn: () => base44.entities.Equipamento.filter({ empresa_id: user.empresa_id, pmoc_ativo: true }),
    enabled: !!user?.empresa_id
  });
  const clientesComPMOC = new Set(equipamentosPMOC.map((eq) => eq.cliente_id));

  const { data: orcamentosPendentes = [] } = useQuery({
    queryKey: ['orcamentos-pendentes', tecnico?.id],
    queryFn: () => base44.entities.OrcamentoTecnico.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      status: 'pendente'
    }),
    enabled: !!tecnico && !!user?.empresa_id
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-tecnico', tecnico?.id],
    queryFn: () => base44.entities.LancamentoTecnico.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id
    }, '-data_lancamento'),
    enabled: !!tecnico && !!user?.empresa_id
  });

  const { data: orcamentosAprovados = [] } = useQuery({
    queryKey: ['orcamentos-aprovados', tecnico?.id],
    queryFn: () => base44.entities.OrcamentoTecnico.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      status: 'aprovado'
    }),
    enabled: !!tecnico && !!user?.empresa_id
  });

  const { data: creditosPendentes = [] } = useQuery({
    queryKey: ['creditos-pendentes', tecnico?.id],
    queryFn: () => base44.entities.CreditoTecnico.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      status: 'pendente'
    }, '-data_envio'),
    enabled: !!tecnico && !!user?.empresa_id
  });

  // Buscar pontos pendentes de aprovação
  const { data: pontosPendentesAprovacao = [] } = useQuery({
    queryKey: ['pontos-pendentes-aprovacao', tecnico?.id],
    queryFn: () => base44.entities.PontoEletronico.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      status: 'aguardando_aprovacao'
    }, '-data_hora'),
    enabled: !!tecnico && !!user?.empresa_id
  });

  // NEW QUERY: Fetch the latest point entry for the technician
  const { data: ultimoPonto } = useQuery({
    queryKey: ['ultimo-ponto', tecnico?.id],
    queryFn: async () => {
      if (!user?.empresa_id || !tecnico?.id) return null; // Defensive check to ensure data exists
      const pontos = await base44.entities.PontoEletronico.filter({
        empresa_id: user.empresa_id,
        tecnico_id: tecnico.id
      }, '-data_hora', 1); // Get the most recent point entry by data_hora, limit to 1
      return pontos[0] || null;
    },
    enabled: !!tecnico && !!user?.empresa_id // Only run if technician and user are loaded
  });

  // Calcular saldo do técnico
  const calcularSaldo = () => {
    const totalOrcamento = orcamentosAprovados.reduce((sum, o) => sum + (o.valor_orcamento || 0), 0);
    const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((sum, l) => sum + (l.valor || 0), 0);
    const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa').reduce((sum, l) => sum + (l.valor || 0), 0);
    
    return {
      orcamento: totalOrcamento,
      entradas: totalEntradas,
      despesas: totalDespesas,
      saldo: totalOrcamento + totalEntradas - totalDespesas
    };
  };

  const saldoInfo = calcularSaldo();
  const percentualGasto = saldoInfo.orcamento > 0 ? (saldoInfo.despesas / saldoInfo.orcamento) * 100 : 0;

  const handleLogout = () => {
    base44.auth.logout();
    navigate("/"); // Redirect to home after logout
  };

  // Function to handle successful point registration or update
  const handlePontoRegistrado = () => {
    queryClient.invalidateQueries(['ultimo-ponto', tecnico?.id]); // Invalidate to refresh the last point status
    setShowRegistrarPontoModal(false); // Close the modal
  };

  if (!user || !tecnico) {
    return (
      <PageLoading />
    );
  }

  const chamadosPendentes = meusChamados.filter(c => c.status === 'pendente' || c.status === 'em_andamento').length;
  const chamadosFinalizados = meusChamados.filter(c => c.status === 'finalizado').length;

  // Determine ponto status based on ultimoPonto
  const isClockedIn = ultimoPonto && !ultimoPonto.data_hora_saida;
  const pontoButtonText = isClockedIn ? "Registrar Saída" : "Registrar Entrada";
  const pontoButtonIcon = isClockedIn ? <TrendingDown className="w-4 h-4 mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Olá, {tecnico.nome}! 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {tecnico.especialidade} • Painel do Técnico
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <SinoNotificacoes />

              {/* New Ponto Eletrônico Button */}
              <Button 
                variant="outline" 
                onClick={() => setShowRegistrarPontoModal(true)} 
                className={`${isClockedIn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
              >
                {pontoButtonIcon}
                {pontoButtonText}
              </Button>
              
              {/* Alterar Senha Button */}
              <Link to={createPageUrl("AlterarSenha")}>
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
        <section className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 shadow-sm sm:p-5" aria-labelledby="acoes-campo-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Ações de campo</p>
              <h2 id="acoes-campo-title" className="mt-1 text-lg font-bold text-foreground">Registre o atendimento no momento em que ele acontece</h2>
              <p className="mt-1 text-sm text-muted-foreground">O chamado fica atribuído a você e o equipamento vinculado à sua empresa.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button onClick={() => setShowNovoChamado(true)} className="min-h-12 justify-center bg-blue-600 px-5 hover:bg-blue-700">
                <Plus className="mr-2 h-5 w-5" />
                Novo chamado
              </Button>
              <Button onClick={() => setShowNovoEquipamento(true)} variant="outline" className="min-h-12 justify-center border-blue-300 bg-white px-5 text-blue-800 hover:bg-blue-50">
                <Wrench className="mr-2 h-5 w-5" />
                Cadastrar equipamento
              </Button>
            </div>
          </div>
        </section>
        {/* Alertas de orçamento */}
        {percentualGasto >= 80 && saldoInfo.orcamento > 0 && (
          <Card className="mb-6 border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-900">
                    ⚠️ Atenção: Seu orçamento está em {percentualGasto.toFixed(0)}%
                  </p>
                  <p className="text-sm text-orange-700">
                    Você gastou R$ {saldoInfo.despesas.toFixed(2)} de R$ {saldoInfo.orcamento.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pontos Pendentes de Aprovação */}
        {pontosPendentesAprovacao.length > 0 && (
          <AprovarEdicoesPonto pontosPendentes={pontosPendentesAprovacao} />
        )}

        {/* Créditos Pendentes */}
        {creditosPendentes.length > 0 && (
          <CreditosPendentes 
            creditos={creditosPendentes}
            user={user}
            tecnico={tecnico}
          />
        )}

        {/* Orçamentos pendentes */}
        {orcamentosPendentes.length > 0 && (
          <OrcamentosPendentes 
            orcamentos={orcamentosPendentes}
            user={user}
            tecnico={tecnico}
          />
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">PMOCs Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-purple-600">{clientesComPMOC.size}</p>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* New Ponto Eletrônico Status Card */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status do Ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold ${isClockedIn ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {isClockedIn ? 'Online' : 'Offline'}
                </p>
                {isClockedIn ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              {ultimoPonto && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isClockedIn 
                    ? `Entrada: ${new Date(ultimoPonto.data_hora).toLocaleTimeString()}`
                    : `Última Saída: ${new Date(ultimoPonto.data_hora_saida).toLocaleTimeString()}`
                  }
                </p>
              )}
              {!ultimoPonto && (
                <p className="text-xs text-muted-foreground mt-1">Nenhum ponto registrado hoje.</p>
              )}
            </CardContent>
          </Card>

          {/* Original Saldo Card, adjusted for grid layout */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold ${saldoInfo.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  R$ {saldoInfo.saldo.toFixed(2)}
                </p>
                <Wallet className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de navegação */}
        <div className="mb-6">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setAbaSelecionada('chamados')}
                className={`${
                  abaSelecionada === 'chamados'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <ClipboardList className="w-4 h-4" />
                Meus Chamados
              </button>
              <button
                onClick={() => setAbaSelecionada('pmocs')}
                className={`${
                  abaSelecionada === 'pmocs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Calendar className="w-4 h-4" />
                Meus PMOCs
              </button>
              <button
                onClick={() => setAbaSelecionada('financeiro')}
                className={`${
                  abaSelecionada === 'financeiro'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <DollarSign className="w-4 h-4" />
                Controle Financeiro
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo das abas */}
        {abaSelecionada === 'chamados' && (
          <MeusChamados 
            chamados={meusChamados} 
            clientes={clientes}
            user={user} 
            tecnico={tecnico} 
          />
        )}

        {abaSelecionada === 'pmocs' && (
          <MeusPMOCs clientes={clientes} empresaId={user?.empresa_id} tecnicoId={tecnico?.id} />
        )}

        {abaSelecionada === 'financeiro' && (
          <ControleFinanceiroTecnico
            user={user}
            tecnico={tecnico}
            saldoInfo={saldoInfo}
            lancamentos={lancamentos}
          />
        )}
      </div>

      {/* Registrar Ponto Modal - conditionally rendered */}
      {showRegistrarPontoModal && (
        <RegistrarPonto
          isOpen={showRegistrarPontoModal}
          onClose={() => setShowRegistrarPontoModal(false)}
          user={user}
          tecnico={tecnico}
          ultimoPonto={ultimoPonto} // Pass the latest point info to the modal
          onSuccess={handlePontoRegistrado} // Callback to refresh data and close modal
        />
      )}
      <Dialog open={showNovoChamado} onOpenChange={setShowNovoChamado}>
        <DialogContent className="p-0 sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Novo chamado</DialogTitle>
            <DialogDescription>Abra um chamado atribuído ao seu usuário técnico.</DialogDescription>
          </DialogHeader>
          <ChamadoForm
            chamado={{ tecnico_id: tecnico.id }}
            clientes={clientes}
            tecnicos={[tecnico]}
            tecnicoFixo={tecnico}
            onSubmit={(chamadoData) => criarChamadoMutation.mutate({ chamadoData })}
            onCancel={() => setShowNovoChamado(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showNovoEquipamento} onOpenChange={setShowNovoEquipamento}>
        <DialogContent className="p-0 sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Cadastrar equipamento</DialogTitle>
            <DialogDescription>Cadastre um equipamento para um cliente da sua empresa.</DialogDescription>
          </DialogHeader>
          <EquipamentoForm
            clientes={clientes}
            onSubmit={(equipamentoData) => criarEquipamentoMutation.mutate(equipamentoData)}
            onCancel={() => setShowNovoEquipamento(false)}
            isLoading={criarEquipamentoMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
