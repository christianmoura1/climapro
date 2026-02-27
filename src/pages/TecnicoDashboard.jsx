
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  TrendingUp, // For Ponto Eletrônico Entrada
  TrendingDown, // For Ponto Eletrônico Saída
  Lock // New import for the lock icon
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import

import MeusChamados from "../components/tecnico/MeusChamados";
import MeusPMOCs from "../components/tecnico/MeusPMOCs";
import ControleFinanceiroTecnico from "../components/tecnico/ControleFinanceiroTecnico";
import OrcamentosPendentes from "../components/tecnico/OrcamentosPendentes";
import CreditosPendentes from "../components/tecnico/CreditosPendentes";
import RegistrarPonto from "../components/ponto/RegistrarPonto"; // New import for Ponto Eletrônico component
import AprovarEdicoesPonto from "../components/ponto/AprovarEdicoesPonto";

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
            alert("Sua conta está inativa. Entre em contato com o administrador.");
            base44.auth.logout();
            navigate("/"); // Redirect to home/login after logout
            return;
          }
        }

        await base44.auth.updateMe({
          ultimo_acesso: new Date().toISOString()
        });

        await base44.entities.LogAcao.create({
          empresa_id: currentUser.empresa_id,
          user_id: currentUser.id,
          user_email: currentUser.email,
          tipo_usuario: currentUser.tipo_usuario,
          acao: "Login no sistema",
          data_hora: new Date().toISOString()
        });
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

  const { data: meusPMOCs = [] } = useQuery({
    queryKey: ['meus-pmocs', tecnico?.id],
    queryFn: () => base44.entities.PMOC.filter({
      empresa_id: user.empresa_id,
      tecnico_responsavel_id: tecnico.id
    }),
    enabled: !!tecnico && !!user?.empresa_id
  });

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
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
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, {tecnico.nome}! 👋
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {tecnico.especialidade} • Painel do Técnico
              </p>
            </div>
            <div className="flex items-center space-x-4">
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

          {/* New Ponto Eletrônico Status Card */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Status do Ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold ${isClockedIn ? 'text-green-600' : 'text-gray-500'}`}>
                  {isClockedIn ? 'Online' : 'Offline'}
                </p>
                {isClockedIn ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-gray-400" />
                )}
              </div>
              {ultimoPonto && (
                <p className="text-xs text-gray-500 mt-1">
                  {isClockedIn 
                    ? `Entrada: ${new Date(ultimoPonto.data_hora).toLocaleTimeString()}`
                    : `Última Saída: ${new Date(ultimoPonto.data_hora_saida).toLocaleTimeString()}`
                  }
                </p>
              )}
              {!ultimoPonto && (
                <p className="text-xs text-gray-500 mt-1">Nenhum ponto registrado hoje.</p>
              )}
            </CardContent>
          </Card>

          {/* Original Saldo Card, adjusted for grid layout */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Saldo Disponível</CardTitle>
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
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setAbaSelecionada('chamados')}
                className={`${
                  abaSelecionada === 'chamados'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <MeusPMOCs pmocs={meusPMOCs} clientes={clientes} />
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
    </div>
  );
}
