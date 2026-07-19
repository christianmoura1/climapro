import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, AlertCircle, User, Wrench, List, CalendarDays, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isWithinInterval, startOfWeek as getStartOfWeek, endOfWeek as getEndOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import ExecutarManutencaoModal from "../pmoc/ExecutarManutencaoModal";

export default function MeusPMOCs({ pmocs, clientes }) {
  const [pmocSelecionado, setPmocSelecionado] = useState(null);
  const [visualizacao, setVisualizacao] = useState('lista'); // 'lista' ou 'calendario'
  const [dataAtual, setDataAtual] = useState(new Date());
  
  // Filtros
  const [filtros, setFiltros] = useState({
    periodo: 'todos',
    cliente_id: 'todos',
    status: 'todos'
  });

  // Aplicar filtros
  const pmocsFiltrados = pmocs.filter(pmoc => {
    // Filtro de cliente
    if (filtros.cliente_id !== 'todos' && pmoc.cliente_id !== filtros.cliente_id) {
      return false;
    }

    // Filtro de status
    if (filtros.status !== 'todos') {
      if (filtros.status === 'aguardando' && pmoc.status !== 'aguardando_execucao') return false;
      if (filtros.status === 'em_andamento' && pmoc.status !== 'em_andamento') return false;
      if (filtros.status === 'concluido' && pmoc.status !== 'concluido') return false;
      if (filtros.status === 'reaberto' && pmoc.status !== 'reaberto') return false;
    }

    // Filtro de período
    if (filtros.periodo !== 'todos' && pmoc.proxima_manutencao) {
      const dataProxima = new Date(pmoc.proxima_manutencao);
      const hoje = new Date();
      
      switch (filtros.periodo) {
        case 'hoje':
          if (!isSameDay(dataProxima, hoje)) return false;
          break;
        case 'esta_semana':
          const inicioSemana = getStartOfWeek(hoje);
          const fimSemana = getEndOfWeek(hoje);
          if (!isWithinInterval(dataProxima, { start: inicioSemana, end: fimSemana })) return false;
          break;
        case 'este_mes':
          const inicioMes = startOfMonth(hoje);
          const fimMes = endOfMonth(hoje);
          if (!isWithinInterval(dataProxima, { start: inicioMes, end: fimMes })) return false;
          break;
        case 'proximo_mes':
          const proximoMes = addMonths(hoje, 1);
          const inicioProximoMes = startOfMonth(proximoMes);
          const fimProximoMes = endOfMonth(proximoMes);
          if (!isWithinInterval(dataProxima, { start: inicioProximoMes, end: fimProximoMes })) return false;
          break;
        default:
          break;
      }
    }

    return true;
  });

  const handleAnterior = () => {
    setDataAtual(subMonths(dataAtual, 1));
  };

  const handleProximo = () => {
    setDataAtual(addMonths(dataAtual, 1));
  };

  const handleHoje = () => {
    setDataAtual(new Date());
  };

  // Renderização em Calendário
  const renderCalendario = () => {
    const inicioMes = startOfMonth(dataAtual);
    const fimMes = endOfMonth(dataAtual);
    const inicioCal = startOfWeek(inicioMes);
    const fimCal = endOfWeek(fimMes);
    
    const diasCalendario = eachDayOfInterval({ start: inicioCal, end: fimCal });
    const hoje = new Date();

    const getPMOCsNoDia = (dia) => {
      return pmocsFiltrados.filter(pmoc => {
        if (!pmoc.proxima_manutencao) return false;
        return isSameDay(new Date(pmoc.proxima_manutencao), dia);
      });
    };

    const statusColors = {
      'aguardando_execucao': 'bg-yellow-100 border-yellow-400 text-yellow-800',
      'em_andamento': 'bg-purple-100 border-purple-400 text-purple-800',
      'reaberto': 'bg-red-100 border-red-400 text-red-800',
      'concluido': 'bg-green-100 border-green-400 text-green-800'
    };

    return (
      <Card className="shadow-lg border-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Calendário de PMOCs</CardTitle>
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
                <h3 className="text-base font-semibold text-foreground">
                  {format(dataAtual, 'MMMM yyyy', { locale: ptBR })}
                </h3>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
              <div key={dia} className="text-center font-semibold text-muted-foreground text-sm py-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-2">
            {diasCalendario.map((dia, idx) => {
              const pmocsNoDia = getPMOCsNoDia(dia);
              const isHoje = isSameDay(dia, hoje);
              const isMesAtual = isSameMonth(dia, dataAtual);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 border rounded-lg ${
                    isHoje ? 'bg-indigo-50 border-indigo-500 border-2' : 'bg-white border-border'
                  } ${!isMesAtual ? 'opacity-40' : ''} hover:shadow-md transition-shadow`}
                >
                  <div className={`text-sm font-semibold mb-2 ${
                    isHoje ? 'text-indigo-600' : isMesAtual ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(dia, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {pmocsNoDia.slice(0, 2).map((pmoc) => {
                      const cliente = clientes.find(c => c.id === pmoc.cliente_id);
                      const statusColor = statusColors[pmoc.status] || 'bg-muted border-border text-foreground';
                      
                      return (
                        <div
                          key={pmoc.id}
                          onClick={() => setPmocSelecionado(pmoc)}
                          className={`text-xs p-2 rounded border cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}
                        >
                          <div className="font-semibold truncate">
                            {cliente?.nome || 'Cliente'}
                          </div>
                          <div className="text-xs truncate capitalize">
                            {pmoc.periodicidade}
                          </div>
                        </div>
                      );
                    })}
                    {pmocsNoDia.length > 2 && (
                      <div className="text-xs text-muted-foreground pl-1">
                        +{pmocsNoDia.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderização em Lista
  const renderLista = () => {
    return (
      <Card className="shadow-lg border-none">
        <CardHeader className="border-b">
          <CardTitle>Meus PMOCs ({pmocsFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pmocsFiltrados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p>Nenhum PMOC encontrado com os filtros selecionados</p>
            </div>
          ) : (
            <div className="divide-y">
              {pmocsFiltrados.map((pmoc) => {
                const cliente = clientes.find(c => c.id === pmoc.cliente_id);
                const podeExecutar = pmoc.status === 'aguardando_execucao' || pmoc.status === 'reaberto';

                return (
                  <div key={pmoc.id} className="p-4 hover:bg-muted">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-foreground">PMOC {pmoc.periodicidade}</p>
                          <Badge className={
                            pmoc.status === 'aguardando_execucao' ? 'bg-blue-100 text-blue-800' :
                            pmoc.status === 'em_execucao' ? 'bg-amber-100 text-amber-800' :
                            pmoc.status === 'aguardando_aprovacao_empresa' ? 'bg-orange-100 text-orange-800' :
                            pmoc.status === 'aguardando_validacao_cliente' ? 'bg-yellow-100 text-yellow-800' :
                            pmoc.status === 'reaberto' ? 'bg-red-100 text-red-800' :
                            pmoc.status === 'pausado' ? 'bg-muted text-foreground' :
                            pmoc.status === 'concluido' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-muted text-muted-foreground'
                          }>
                            {pmoc.status === 'aguardando_execucao' ? 'Aguardando Execução' :
                             pmoc.status === 'em_execucao' ? 'Em Execução' :
                             pmoc.status === 'aguardando_aprovacao_empresa' ? 'Aguardando Aprovação' :
                             pmoc.status === 'aguardando_validacao_cliente' ? 'Aguardando Cliente' :
                             pmoc.status === 'reaberto' ? 'Reaberto - Necessita Correção' :
                             pmoc.status === 'concluido' ? 'Concluído' :
                             pmoc.status === 'cancelado' ? 'Cancelado' :
                             pmoc.status === 'pausado' ? 'Pausado' :
                             pmoc.status}
                          </Badge>
                        </div>

                        {cliente && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="w-4 h-4" />
                            <span>{cliente.nome}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {pmoc.status === 'reaberto' ? 'Reaberto para correção' :
                             pmoc.proxima_manutencao 
                              ? `Próxima: ${format(new Date(pmoc.proxima_manutencao), "dd/MM/yyyy", { locale: ptBR })}`
                              : 'Não agendado'}
                          </span>
                        </div>

                        {pmoc.status === 'reaberto' && pmoc.motivo_reabertura && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <p className="text-sm text-red-800">
                              <strong>⚠️ Motivo:</strong> {pmoc.motivo_reabertura}
                            </p>
                          </div>
                        )}

                        {pmoc.observacoes && pmoc.status !== 'reaberto' && (
                          <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                            {pmoc.observacoes}
                          </p>
                        )}
                      </div>

                      {podeExecutar && (
                        <Button
                          onClick={() => setPmocSelecionado(pmoc)}
                          className={pmoc.status === 'reaberto' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          {pmoc.status === 'reaberto' ? 'Corrigir PMOC' : 'Executar Manutenção'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Controles e Filtros */}
      <Card className="shadow-lg border-none mb-6">
        <CardContent className="p-6">
          {/* Alternador de Visualização */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={visualizacao === 'lista' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('lista')}
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                📋 Lista
              </Button>
              <Button
                variant={visualizacao === 'calendario' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('calendario')}
                className="flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                🗓️ Calendário
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {pmocsFiltrados.length} PMOC(s) encontrado(s)
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-4 flex-wrap border-t pt-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Filtros:</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Período:</Label>
              <select
                value={filtros.periodo}
                onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="hoje">Hoje</option>
                <option value="esta_semana">Esta Semana</option>
                <option value="este_mes">Este Mês</option>
                <option value="proximo_mes">Próximo Mês</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Cliente:</Label>
              <select
                value={filtros.cliente_id}
                onChange={(e) => setFiltros({...filtros, cliente_id: e.target.value})}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Status:</Label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando Execução</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="reaberto">Reaberto</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização */}
      {visualizacao === 'lista' ? renderLista() : renderCalendario()}

      {/* Modal de Execução */}
      {pmocSelecionado && (
        <ExecutarManutencaoModal
          pmoc={pmocSelecionado}
          cliente={clientes.find(c => c.id === pmocSelecionado.cliente_id)}
          onClose={() => setPmocSelecionado(null)}
        />
      )}
    </>
  );
}