import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, AlertCircle, User, Wrench, List, CalendarDays, Filter, ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isWithinInterval, startOfWeek as getStartOfWeek, endOfWeek as getEndOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";

import ExecutarManutencaoModal from "../pmoc/ExecutarManutencaoModal";
import { montarProgramacaoPMOC } from "@/lib/pmocDataVisita";

const LABEL_STATUS = {
  aguardando_execucao: 'Aguardando Execução',
  em_execucao: 'Em Execução',
  aguardando_aprovacao_empresa: 'Aguardando Aprovação',
  aguardando_validacao_cliente: 'Aguardando Cliente',
  reaberto: 'Reaberto - Necessita Correção',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  pausado: 'Pausado',
};

const COR_STATUS = {
  aguardando_execucao: 'bg-blue-100 text-blue-800',
  em_execucao: 'bg-amber-100 text-amber-800',
  aguardando_aprovacao_empresa: 'bg-orange-100 text-orange-800',
  aguardando_validacao_cliente: 'bg-yellow-100 text-yellow-800',
  reaberto: 'bg-red-100 text-red-800',
  concluido: 'bg-emerald-100 text-emerald-800',
  pausado: 'bg-muted text-foreground',
};

const COR_CALENDARIO = {
  aguardando_execucao: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  em_execucao: 'bg-purple-100 border-purple-400 text-purple-800',
  reaberto: 'bg-red-100 border-red-400 text-red-800',
  concluido: 'bg-green-100 border-green-400 text-green-800',
};

// Agenda de PMOC do técnico.
//
// A lista sai dos equipamentos com PMOC ativo, não das linhas da tabela `pmoc`:
// aquela linha é um cabeçalho que só nasce quando alguém executa a primeira
// rodada, e a consulta antiga ainda filtrava por `tecnico_responsavel_id`, campo
// que nenhuma tela do sistema preenche. O resultado era sempre "0 PMOC(s)
// encontrado(s)", mesmo com seis equipamentos no plano.
export default function MeusPMOCs({ clientes, empresaId, tecnicoId }) {
  const queryClient = useQueryClient();
  const [pmocSelecionado, setPmocSelecionado] = useState(null);
  const [abrindoRodada, setAbrindoRodada] = useState(null);
  const [visualizacao, setVisualizacao] = useState('lista');
  const [dataAtual, setDataAtual] = useState(new Date());

  const [filtros, setFiltros] = useState({
    periodo: 'todos',
    cliente_id: 'todos',
    status: 'todos'
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos-pmoc-empresa', empresaId],
    queryFn: () => base44.entities.Equipamento.filter({ empresa_id: empresaId, pmoc_ativo: true }),
    enabled: !!empresaId,
  });

  const { data: pmocs = [] } = useQuery({
    queryKey: ['pmocs-empresa', empresaId],
    queryFn: () => base44.entities.PMOC.filter({ empresa_id: empresaId }),
    enabled: !!empresaId,
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['pmoc-agendamentos', 'empresa', empresaId],
    queryFn: () => base44.entities.PmocAgendamento.filter({ empresa_id: empresaId }),
    enabled: !!empresaId,
  });

  const programacao = montarProgramacaoPMOC({ clientes, equipamentos, pmocs, agendamentos });

  const statusDe = (item) => item.pmoc?.status || 'aguardando_execucao';

  // Enquanto ninguém atribui um responsável, a rodada é de quem chegar — some
  // só o que já está no nome de outro técnico.
  const visiveis = programacao.filter((item) => {
    const dono = item.pmoc?.tecnico_responsavel_id;
    return !dono || !tecnicoId || dono === tecnicoId;
  });

  const filtrados = visiveis.filter((item) => {
    if (filtros.cliente_id !== 'todos' && item.cliente.id !== filtros.cliente_id) return false;

    if (filtros.status !== 'todos') {
      const status = statusDe(item);
      if (filtros.status === 'aguardando' && status !== 'aguardando_execucao') return false;
      if (filtros.status === 'em_andamento' && status !== 'em_execucao') return false;
      if (filtros.status === 'concluido' && status !== 'concluido') return false;
      if (filtros.status === 'reaberto' && status !== 'reaberto') return false;
    }

    const data = item.visita?.data;
    if (filtros.periodo !== 'todos' && data) {
      const hoje = new Date();
      switch (filtros.periodo) {
        case 'hoje':
          if (!isSameDay(data, hoje)) return false;
          break;
        case 'esta_semana':
          if (!isWithinInterval(data, { start: getStartOfWeek(hoje), end: getEndOfWeek(hoje) })) return false;
          break;
        case 'este_mes':
          if (!isWithinInterval(data, { start: startOfMonth(hoje), end: endOfMonth(hoje) })) return false;
          break;
        case 'proximo_mes': {
          const proximoMes = addMonths(hoje, 1);
          if (!isWithinInterval(data, { start: startOfMonth(proximoMes), end: endOfMonth(proximoMes) })) return false;
          break;
        }
        default:
          break;
      }
    }

    return true;
  });

  // Executar exige um cabeçalho de PMOC gravado, porque a manutenção referencia
  // pmoc_id. Se ainda não existe, ele nasce aqui — mesma coisa que a tela da
  // empresa faz ao iniciar a rodada.
  const abrirExecucao = async (item) => {
    if (item.pmoc) {
      setPmocSelecionado({ pmoc: item.pmoc, cliente: item.cliente });
      return;
    }
    setAbrindoRodada(item.cliente.id);
    try {
      const mesReferencia = new Date();
      mesReferencia.setDate(1);
      const criado = await base44.entities.PMOC.create({
        cliente_id: item.cliente.id,
        empresa_id: empresaId,
        tecnico_responsavel_id: tecnicoId || null,
        mes_referencia: format(mesReferencia, 'yyyy-MM-dd'),
        data_execucao_programada: item.visita ? format(item.visita.data, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      });
      queryClient.invalidateQueries(['pmocs-empresa']);
      setPmocSelecionado({ pmoc: criado, cliente: item.cliente });
    } catch (error) {
      console.error('Erro ao iniciar a rodada de PMOC:', error);
      toast({ description: '❌ Não foi possível iniciar a rodada. Tente novamente.', variant: 'destructive' });
    } finally {
      setAbrindoRodada(null);
    }
  };

  const handleAnterior = () => setDataAtual(subMonths(dataAtual, 1));
  const handleProximo = () => setDataAtual(addMonths(dataAtual, 1));
  const handleHoje = () => setDataAtual(new Date());

  const renderCalendario = () => {
    const inicioMes = startOfMonth(dataAtual);
    const fimMes = endOfMonth(dataAtual);
    const diasCalendario = eachDayOfInterval({ start: startOfWeek(inicioMes), end: endOfWeek(fimMes) });
    const hoje = new Date();

    const itensNoDia = (dia) => filtrados.filter((item) => item.visita && isSameDay(item.visita.data, dia));

    return (
      <Card className="shadow-lg border-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Calendário de PMOCs</CardTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleAnterior} aria-label="Mês anterior">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleHoje}>Hoje</Button>
              <Button variant="outline" size="icon" onClick={handleProximo} aria-label="Próximo mês">
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
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
              <div key={dia} className="text-center font-semibold text-muted-foreground text-sm py-2">
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {diasCalendario.map((dia, idx) => {
              const doDia = itensNoDia(dia);
              const isHoje = isSameDay(dia, hoje);
              const isMesAtual = isSameMonth(dia, dataAtual);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 border rounded-lg ${
                    isHoje ? 'bg-indigo-50 border-indigo-500 border-2' : 'bg-card border-border'
                  } ${!isMesAtual ? 'opacity-40' : ''} hover:shadow-md transition-shadow`}
                >
                  <div className={`text-sm font-semibold mb-2 ${
                    isHoje ? 'text-indigo-600' : isMesAtual ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {format(dia, 'd')}
                  </div>

                  <div className="space-y-1">
                    {doDia.slice(0, 2).map((item) => (
                      <button
                        key={item.cliente.id}
                        type="button"
                        onClick={() => abrirExecucao(item)}
                        className={`w-full rounded border p-2 text-left text-xs transition-opacity hover:opacity-80 ${
                          COR_CALENDARIO[statusDe(item)] || 'bg-muted border-border text-foreground'
                        }`}
                      >
                        <div className="font-semibold truncate">{item.cliente.nome}</div>
                        <div className="truncate text-xs">{item.equipamentos.length} equip.</div>
                      </button>
                    ))}
                    {doDia.length > 2 && (
                      <div className="text-xs text-muted-foreground pl-1">
                        +{doDia.length - 2} mais
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

  const renderLista = () => (
    <Card className="shadow-lg border-none">
      <CardHeader className="border-b">
        <CardTitle>Meus PMOCs ({filtrados.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {filtrados.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p>Nenhum PMOC encontrado com os filtros selecionados</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtrados.map((item) => {
              const status = statusDe(item);
              const podeExecutar = status === 'aguardando_execucao' || status === 'em_execucao' || status === 'reaberto';

              return (
                <div key={item.cliente.id} className="p-4 hover:bg-muted">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="font-semibold text-foreground">PMOC — {item.cliente.nome}</p>
                        <Badge className={COR_STATUS[status] || 'bg-muted text-muted-foreground'}>
                          {LABEL_STATUS[status] || status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {status === 'reaberto' ? 'Reaberto para correção' :
                           item.visita
                            ? `Próxima visita: ${format(item.visita.data, "dd/MM/yyyy", { locale: ptBR })}`
                            : 'Não agendado'}
                        </span>
                        {item.visita?.remarcada && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700">remarcada</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Cpu className="w-4 h-4" />
                        <span>{item.equipamentos.length} equipamento(s) no plano</span>
                      </div>

                      {item.cliente.endereco && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{item.cliente.endereco}</span>
                        </div>
                      )}

                      {item.visita?.observacao && (
                        <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
                          Remarcada: {item.visita.observacao}
                        </p>
                      )}

                      {status === 'reaberto' && item.pmoc?.motivo_reabertura && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                          <p className="text-sm text-red-800">
                            <strong>⚠️ Motivo:</strong> {item.pmoc.motivo_reabertura}
                          </p>
                        </div>
                      )}
                    </div>

                    {podeExecutar && (
                      <Button
                        onClick={() => abrirExecucao(item)}
                        disabled={abrindoRodada === item.cliente.id}
                        className={`shrink-0 ${status === 'reaberto' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        {abrindoRodada === item.cliente.id ? 'Abrindo...' :
                         status === 'reaberto' ? 'Corrigir PMOC' :
                         status === 'em_execucao' ? 'Continuar execução' : 'Executar Manutenção'}
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

  return (
    <>
      <Card className="shadow-lg border-none mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={visualizacao === 'lista' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('lista')}
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                Lista
              </Button>
              <Button
                variant={visualizacao === 'calendario' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('calendario')}
                className="flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                Calendário
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {filtrados.length} PMOC(s) encontrado(s)
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap border-t pt-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Filtros:</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm" htmlFor="filtro-periodo">Período:</Label>
              <select
                id="filtro-periodo"
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
              <Label className="text-sm" htmlFor="filtro-cliente">Cliente:</Label>
              <select
                id="filtro-cliente"
                value={filtros.cliente_id}
                onChange={(e) => setFiltros({...filtros, cliente_id: e.target.value})}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm" htmlFor="filtro-status">Status:</Label>
              <select
                id="filtro-status"
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando Execução</option>
                <option value="em_andamento">Em Execução</option>
                <option value="reaberto">Reaberto</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {visualizacao === 'lista' ? renderLista() : renderCalendario()}

      {pmocSelecionado && (
        <ExecutarManutencaoModal
          pmoc={pmocSelecionado.pmoc}
          cliente={pmocSelecionado.cliente}
          onClose={() => {
            setPmocSelecionado(null);
            queryClient.invalidateQueries(['pmocs-empresa']);
            queryClient.invalidateQueries(['equipamentos-pmoc-empresa']);
          }}
        />
      )}
    </>
  );
}
