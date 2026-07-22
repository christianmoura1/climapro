import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Snowflake,
  UserCog,
  Cpu,
  Bell,
  X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import StatsCard from "../components/dashboard/StatsCard";
import RecentChamados from "../components/dashboard/RecentChamados";
import ProximosPMOCs from "../components/dashboard/ProximosPMOCs";
import ManutencoesVencidasModal from "../components/dashboard/ManutencoesVencidasModal";
import { PageLoading } from "@/components/ui/page-loading";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showVencidasModal, setShowVencidasModal] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
    } catch { return []; }
  });

  const handleDismissAlerts = () => {
    const ids = lembretesVisiveis.map(c => c.id);
    const updated = [...new Set([...dismissedAlertIds, ...ids])];
    setDismissedAlertIds(updated);
    localStorage.setItem('dismissed_alert_ids', JSON.stringify(updated));
  };

  const handleCriarChamadoFromAlert = async (chamadoId) => {
    try {
      await base44.entities.Chamado.update(chamadoId, { lembrete_manutencao_enviado: true });
    } catch (e) { /* ignore */ }
    setShowVencidasModal(false);
    navigate(createPageUrl("Chamados"));
  };

  useEffect(() => {
    console.log('[CLIMAPRO-BOOT] Dashboard - carregando usuário');
    
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log('[CLIMAPRO-BOOT] Dashboard - usuário carregado:', currentUser.email);
        setUser(currentUser);
        setIsAdmin(currentUser.role === 'admin' && !currentUser.empresa_id);
        
        // Marcar como inicializado
        window.__climapro_initialized = true;
        
        // Se usuário não tem empresa_id, redirecionar para setup
        if (!currentUser.empresa_id && currentUser.role !== 'admin') {
          navigate(createPageUrl("SetupInicial"));
        }
      } catch (error) {
        console.error("[CLIMAPRO-BOOT] Erro ao carregar usuário no dashboard:", error);
        // Se erro de autenticação, redirecionar para login
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  // FILTRAR CHAMADOS POR EMPRESA
  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados', user?.empresa_id, user?.role],
    queryFn: async () => {
      const adminUser = (user.role === 'admin' && !user.empresa_id);
      if (adminUser) {
        return base44.entities.Chamado.list('-created_date', 1000);
      }
      return base44.entities.Chamado.filter(
        { empresa_id: user.empresa_id },
        '-created_date',
        1000
      );
    },
    enabled: !!user
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list(),
    enabled: isAdmin
  });

  // FILTRAR PMOCS POR EMPRESA
  const { data: pmocs = [] } = useQuery({
    queryKey: ['pmocs', user?.empresa_id],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.PMOC.list('-created_date', 20);
      }
      return base44.entities.PMOC.filter(
        { empresa_id: user.empresa_id },
        '-created_date',
        20
      );
    },
    enabled: !!user && (!!user.empresa_id || isAdmin)
  });

  // EQUIPAMENTOS ATIVOS NO PMOC + CLIENTES (para o widget de próximas manutenções)
  const { data: equipamentosPmoc = [] } = useQuery({
    queryKey: ['equipamentos-pmoc-dashboard', user?.empresa_id],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.Equipamento.filter({ pmoc_ativo: true });
      }
      return base44.entities.Equipamento.filter({ empresa_id: user.empresa_id, pmoc_ativo: true });
    },
    enabled: !!user && (!!user.empresa_id || isAdmin)
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user && (!!user.empresa_id || isAdmin)
  });

  // LEMBRETES DE MANUTENÇÃO VENCIDOS (data <= hoje e ainda não enviados)
  const hoje = new Date().toISOString().split('T')[0];
  const { data: lembretesVencidos = [] } = useQuery({
    queryKey: ['lembretes-manutencao-vencidos', user?.empresa_id],
    queryFn: async () => {
      let chamados;
      if (isAdmin) {
        chamados = await base44.entities.Chamado.filter(
          { lembrete_manutencao_enviado: false },
          '-data_lembrete_proxima_manutencao',
          200
        );
      } else {
        if (!user?.empresa_id) return [];
        chamados = await base44.entities.Chamado.filter(
          { empresa_id: user.empresa_id, lembrete_manutencao_enviado: false },
          '-data_lembrete_proxima_manutencao',
          200
        );
      }
      return chamados.filter(c =>
        c.data_lembrete_proxima_manutencao &&
        c.data_lembrete_proxima_manutencao <= hoje
      );
    },
    enabled: !!user && (!!user.empresa_id || isAdmin)
  });

  // Filtrar alertas dispensados
  const lembretesVisiveis = lembretesVencidos.filter(c => !dismissedAlertIds.includes(c.id));

  // FILTRAR FINANCEIRO POR EMPRESA
  const { data: financeiro = [] } = useQuery({
    queryKey: ['financeiro', user?.empresa_id],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.Financeiro.list('-created_date', 100);
      }
      return base44.entities.Financeiro.filter(
        { empresa_id: user.empresa_id },
        '-created_date',
        100
      );
    },
    enabled: !!user && (!!user.empresa_id || isAdmin)
  });

  // Estatísticas
  const chamadosPendentes = chamados.filter(c => c.status === 'pendente').length;
  const chamadosEmAndamento = chamados.filter(c => c.status === 'em_andamento').length;
  const chamadosFinalizados = chamados.filter(c => c.status === 'finalizado' || c.status === 'aguardando_aprovacao_empresa').length;

  const receitaTotal = financeiro
    .filter(f => f.tipo === 'entrada' && f.status === 'pago')
    .reduce((sum, f) => sum + (f.valor || 0), 0);

  const despesaTotal = financeiro
    .filter(f => f.tipo === 'saida' && f.status === 'pago')
    .reduce((sum, f) => sum + (f.valor || 0), 0);

  const lucroMensal = receitaTotal - despesaTotal;

  // Chamados abertos por dia, últimos 7 dias (para o gráfico de tendência)
  const chamadosPorDia = Array.from({ length: 7 }).map((_, i) => {
    const dia = startOfDay(subDays(new Date(), 6 - i));
    const diaSeguinte = startOfDay(subDays(new Date(), 5 - i));
    const total = chamados.filter(c => {
      if (!c.data_abertura) return false;
      const dataAbertura = new Date(c.data_abertura);
      return dataAbertura >= dia && dataAbertura < diaSeguinte;
    }).length;
    return { dia: format(dia, "dd/MM", { locale: ptBR }), total };
  });

  if (!user) {
    return (
      <PageLoading />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Olá, {user.full_name || 'Usuário'}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo ao ClimaPro - seu CRM operacional
              </p>
            </div>
            {isAdmin && (
              <Link to={createPageUrl("AdminPanel")}>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Snowflake className="w-4 h-4 mr-2" />
                  Painel Admin
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Chamados Pendentes"
            value={chamadosPendentes}
            icon={AlertCircle}
            bgColor="bg-orange-500"
            trend={`${chamadosEmAndamento} em andamento`}
          />
          <StatsCard
            title="Chamados Finalizados"
            value={chamadosFinalizados}
            icon={CheckCircle}
            bgColor="bg-green-500"
            trend="Este mês"
          />
          <StatsCard
            title="PMOCs Ativos"
            value={pmocs.filter(p => !['concluido', 'cancelado'].includes(p.status)).length}
            icon={Calendar}
            bgColor="bg-blue-500"
            trend={`${pmocs.length} total`}
          />
          <StatsCard
            title="Lucro Mensal"
            value={`R$ ${lucroMensal.toFixed(2)}`}
            icon={DollarSign}
            bgColor="bg-purple-500"
            trend={lucroMensal >= 0 ? "Positivo" : "Negativo"}
          />
        </div>

        {/* Card de Manutenções Vencidas */}
        {lembretesVisiveis.length > 0 && (
          <div className="mb-8">
            <div className="relative bg-red-600 rounded-xl p-5 shadow-lg">
              <button
                onClick={() => setShowVencidasModal(true)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4 pr-10">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">
                      Manutenções Vencidas
                    </h3>
                    <p className="text-sm text-red-100">
                      {lembretesVisiveis.length} cliente{lembretesVisiveis.length > 1 ? 's' : ''} precisa{lembretesVisiveis.length === 1 ? '' : 'm'} de atenção — clique para ver detalhes
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-full px-3 py-1 shrink-0">
                    <span className="text-white font-bold text-xl">{lembretesVisiveis.length}</span>
                  </div>
                </div>
              </button>
              <button
                onClick={handleDismissAlerts}
                title="Dispensar alerta"
                className="absolute top-1/2 right-3 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {showVencidasModal && lembretesVisiveis.length > 0 && (
          <ManutencoesVencidasModal
            chamados={lembretesVisiveis}
            onClose={() => setShowVencidasModal(false)}
            onCriarChamado={handleCriarChamadoFromAlert}
          />
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <Link to={createPageUrl("Chamados")} className="block">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-auto py-4">
              <div className="text-center w-full">
                <ClipboardList className="w-6 h-6 mx-auto mb-2" />
                <span>Chamados</span>
              </div>
            </Button>
          </Link>
          <Link to={createPageUrl("Clientes")} className="block">
            <Button className="w-full bg-green-600 hover:bg-green-700 h-auto py-4">
              <div className="text-center w-full">
                <Users className="w-6 h-6 mx-auto mb-2" />
                <span>Clientes</span>
              </div>
            </Button>
          </Link>
          <Link to={createPageUrl("Equipamentos")} className="block">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-auto py-4">
              <div className="text-center w-full">
                <Cpu className="w-6 h-6 mx-auto mb-2" />
                <span>Equipamentos</span>
              </div>
            </Button>
          </Link>
          <Link to={createPageUrl("GerenciarTecnicos")} className="block">
            <Button className="w-full bg-teal-600 hover:bg-teal-700 h-auto py-4">
              <div className="text-center w-full">
                <UserCog className="w-6 h-6 mx-auto mb-2" />
                <span>Técnicos</span>
              </div>
            </Button>
          </Link>
          <Link to={createPageUrl("PMOC")} className="block">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 h-auto py-4">
              <div className="text-center w-full">
                <Calendar className="w-6 h-6 mx-auto mb-2" />
                <span>PMOC</span>
              </div>
            </Button>
          </Link>
        </div>

        {/* Gráfico de tendência */}
        <Card className="shadow-sm border-none rounded-xl mb-8">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold">Chamados abertos — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chamadosPorDia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corChamados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214 32% 89%)" />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(215 16% 47%)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(215 16% 47%)" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 89%)", fontSize: 13 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Chamados"
                  stroke="hsl(221 83% 53%)"
                  strokeWidth={2}
                  fill="url(#corChamados)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          <RecentChamados chamados={chamados.slice(0, 5)} />
          <ProximosPMOCs equipamentos={equipamentosPmoc} clientes={clientes} />
        </div>
      </div>
    </div>
  );
}