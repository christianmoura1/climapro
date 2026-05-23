import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Users, 
  Calendar, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Snowflake,
  UserCog,
  Cpu
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import StatsCard from "../components/dashboard/StatsCard";
import RecentChamados from "../components/dashboard/RecentChamados";
import ProximosPMOCs from "../components/dashboard/ProximosPMOCs";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log('[CLIMAPRO-BOOT] Dashboard - carregando usuário');
    
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log('[CLIMAPRO-BOOT] Dashboard - usuário carregado:', currentUser.email);
        setUser(currentUser);
        setIsAdmin(currentUser.email === "christianmoura2014@gmail.com");
        
        // Marcar como inicializado
        window.__climapro_initialized = true;
        
        // Se usuário não tem empresa_id, redirecionar para setup
        if (!currentUser.empresa_id && currentUser.email !== "christianmoura2014@gmail.com") {
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
    queryKey: ['chamados', user?.empresa_id],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.Chamado.list('-created_date', 1000);
      }
      return base44.entities.Chamado.filter(
        { empresa_id: user.empresa_id },
        '-created_date',
        1000
      );
    },
    enabled: !!user && (!!user.empresa_id || isAdmin)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Olá, {user.full_name || 'Usuário'}! 👋
              </h1>
              <p className="text-gray-600">
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
            value={pmocs.filter(p => p.status === 'ativo').length}
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

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          <RecentChamados chamados={chamados.slice(0, 5)} />
          <ProximosPMOCs pmocs={pmocs.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}