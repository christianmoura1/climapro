import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Clock,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { format, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import CalendarioMensal from "../components/agenda/CalendarioMensal";
import CalendarioSemanal from "../components/agenda/CalendarioSemanal";
import CalendarioDiario from "../components/agenda/CalendarioDiario";
import NovoEventoModal from "../components/agenda/NovoEventoModal";
import DetalhesEventoModal from "../components/agenda/DetalhesEventoModal";
import FiltrosAgenda from "../components/agenda/FiltrosAgenda";
import { PageLoading } from "@/components/ui/page-loading";

export default function AgendaPage() {
  const [user, setUser] = useState(null);
  const [visualizacao, setVisualizacao] = useState('mes');
  const [dataAtual, setDataAtual] = useState(new Date());
  const [showNovoEvento, setShowNovoEvento] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [filtros, setFiltros] = useState({
    tecnico_id: 'todos',
    tipo: 'todos',
    status: 'todos'
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['agenda-eventos', user?.empresa_id, dataAtual.getMonth(), dataAtual.getFullYear()],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.AgendaEvento.list('-data_inicio');
      }
      return base44.entities.AgendaEvento.filter(
        { empresa_id: user.empresa_id },
        '-data_inicio'
      );
    },
    enabled: !!user
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados', user?.empresa_id],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Chamado.list();
      }
      return base44.entities.Chamado.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const { data: pmocs = [] } = useQuery({
    queryKey: ['pmocs', user?.empresa_id],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.PMOC.list();
      }
      return base44.entities.PMOC.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const eventosFiltrados = eventos.filter(evento => {
    if (filtros.tecnico_id !== 'todos' && evento.tecnico_id !== filtros.tecnico_id) return false;
    if (filtros.tipo !== 'todos' && evento.tipo !== filtros.tipo) return false;
    if (filtros.status !== 'todos' && evento.status !== filtros.status) return false;
    return true;
  });

  const hoje = new Date();
  const eventosHoje = eventosFiltrados.filter(e => isSameDay(new Date(e.data_inicio), hoje));
  const eventosPendentes = eventosFiltrados.filter(e => e.status === 'pendente').length;
  const proximosEventos = eventosFiltrados
    .filter(e => new Date(e.data_inicio) >= hoje)
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
    .slice(0, 5);

  const handleAnterior = () => {
    if (visualizacao === 'mes') {
      setDataAtual(subMonths(dataAtual, 1));
    } else if (visualizacao === 'semana') {
      setDataAtual(new Date(dataAtual.setDate(dataAtual.getDate() - 7)));
    } else {
      setDataAtual(new Date(dataAtual.setDate(dataAtual.getDate() - 1)));
    }
  };

  const handleProximo = () => {
    if (visualizacao === 'mes') {
      setDataAtual(addMonths(dataAtual, 1));
    } else if (visualizacao === 'semana') {
      setDataAtual(new Date(dataAtual.setDate(dataAtual.getDate() + 7)));
    } else {
      setDataAtual(new Date(dataAtual.setDate(dataAtual.getDate() + 1)));
    }
  };

  const handleHoje = () => {
    setDataAtual(new Date());
  };

  const handleEventoUpdate = () => {
    queryClient.invalidateQueries(['agenda-eventos']);
    setEventoSelecionado(null);
  };

  if (!user) {
    return (
      <PageLoading />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground mt-1">Gerenciamento de atendimentos e manutenções</p>
            </div>
          </div>
          <Button
            onClick={() => setShowNovoEvento(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Evento
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eventos Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-indigo-600">{eventosHoje.length}</p>
                <CalendarIcon className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-orange-600">{eventosPendentes}</p>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Técnicos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-600">{tecnicos.filter(t => t.status === 'ativo').length}</p>
                <User className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-purple-600">{proximosEventos.length}</p>
                <CheckCircle className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-none mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={handleAnterior}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={handleHoje}>
                  Hoje
                </Button>
                <Button variant="outline" size="icon" onClick={handleProximo}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {visualizacao === 'mes' && format(dataAtual, 'MMMM yyyy', { locale: ptBR })}
                    {visualizacao === 'semana' && `Semana de ${format(startOfWeek(dataAtual), 'd MMM', { locale: ptBR })} - ${format(endOfWeek(dataAtual), 'd MMM', { locale: ptBR })}`}
                    {visualizacao === 'dia' && format(dataAtual, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={visualizacao === 'mes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('mes')}
                >
                  Mês
                </Button>
                <Button
                  variant={visualizacao === 'semana' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('semana')}
                >
                  Semana
                </Button>
                <Button
                  variant={visualizacao === 'dia' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('dia')}
                >
                  Dia
                </Button>
              </div>
            </div>

            <FiltrosAgenda
              filtros={filtros}
              onFiltrosChange={setFiltros}
              tecnicos={tecnicos}
            />
          </CardContent>
        </Card>

        {visualizacao === 'mes' && (
          <CalendarioMensal
            dataAtual={dataAtual}
            eventos={eventosFiltrados}
            tecnicos={tecnicos}
            clientes={clientes}
            onEventoClick={setEventoSelecionado}
          />
        )}

        {visualizacao === 'semana' && (
          <CalendarioSemanal
            dataAtual={dataAtual}
            eventos={eventosFiltrados}
            tecnicos={tecnicos}
            clientes={clientes}
            onEventoClick={setEventoSelecionado}
          />
        )}

        {visualizacao === 'dia' && (
          <CalendarioDiario
            dataAtual={dataAtual}
            eventos={eventosFiltrados}
            tecnicos={tecnicos}
            clientes={clientes}
            onEventoClick={setEventoSelecionado}
          />
        )}
      </div>

      {showNovoEvento && (
        <NovoEventoModal
          user={user}
          tecnicos={tecnicos}
          clientes={clientes}
          onClose={() => setShowNovoEvento(false)}
        />
      )}

      {eventoSelecionado && (
        <DetalhesEventoModal
          evento={eventoSelecionado}
          clientes={clientes}
          tecnicos={tecnicos}
          onClose={() => setEventoSelecionado(null)}
          onUpdate={handleEventoUpdate}
        />
      )}
    </div>
  );
}