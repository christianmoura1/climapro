
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, TrendingUp, DollarSign, Download, AlertCircle, Calendar, Trash2, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import LancamentoForm from "../components/financeiro/LancamentoForm";
import LancamentosList from "../components/financeiro/LancamentosList";
import GastosTecnicosPendentes from "../components/financeiro/GastosTecnicosPendentes";
import RelatorioFinanceiro from "../components/financeiro/RelatorioFinanceiro";
import BloqueioModulo from "../components/admin/BloqueioModulo";
import AprovarMovimentacoes from "../components/financeiro/AprovarMovimentacoes";
import GastosTecnicosLista from "../components/financeiro/GastosTecnicosLista";
import DetalheGastosTecnico from "../components/financeiro/DetalheGastosTecnico";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";

export default function FinanceiroPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [moduloAtivo, setModuloAtivo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [incluirPendentes, setIncluirPendentes] = useState(true);
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mensal');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usandoFiltroPersonalizado, setUsandoFiltroPersonalizado] = useState(false);
  
  const [forceRender, setForceRender] = useState(0);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(null);
  
  const [filtroTecnicoCreditos, setFiltroTecnicoCreditos] = useState('todos');
  const [filtroTecnicoGastos, setFiltroTecnicoGastos] = useState('todos');
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.empresa_id) {
          const empresas = await base44.entities.Empresa.list();
          const minhaEmpresa = empresas.find(e => e.id === currentUser.empresa_id);
          setEmpresa(minhaEmpresa);
          
          const modulosAtivos = minhaEmpresa?.modulos_ativos || {};
          const financeiroAtivo = modulosAtivos.financeiro === true;
          setModuloAtivo(financeiroAtivo);
          
          if (!financeiroAtivo && currentUser.role !== 'admin') {
            setModuloAtivo(false);
          }
        } else if (currentUser.role === 'admin') {
          setModuloAtivo(true);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        navigate(createPageUrl("Dashboard"));
      }
    };
    loadData();
  }, [navigate]);

  const { data: lancamentos = [], isLoading: loadingLancamentos, error: lancamentosError } = useQuery({
    queryKey: ['financeiro', user?.empresa_id, forceRender],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Financeiro.list('-data_lancamento');
      }
      return base44.entities.Financeiro.filter(
        { empresa_id: user.empresa_id },
        '-data_lancamento'
      );
    },
    enabled: !!user && moduloAtivo === true,
    retry: 3,
    retryDelay: 1000
  });

  const { data: gastosPendentes = [] } = useQuery({
    queryKey: ['gastos-pendentes', user?.empresa_id],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.GastoTecnico.filter({ status_aprovacao: 'pendente' });
      }
      return base44.entities.GastoTecnico.filter({
        empresa_id: user.empresa_id,
        status_aprovacao: 'pendente'
      });
    },
    enabled: !!user && moduloAtivo === true
  });

  const { data: movimentacoesPendentes = [], isLoading: loadingMovimentacoes } = useQuery({
    queryKey: ['movimentacoes-pendentes', user?.empresa_id, forceRender],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        const todasMovimentacoes = await base44.entities.MovimentacaoTecnico.list('-data_envio');
        return todasMovimentacoes.filter(m => m.status === 'pendente');
      }
      
      const movimentacoesDaEmpresa = await base44.entities.MovimentacaoTecnico.filter({
        empresa_id: user.empresa_id
      }, '-data_envio');
      
      const pendentes = movimentacoesDaEmpresa.filter(m => m.status === 'pendente');
      return pendentes;
    },
    enabled: !!user && moduloAtivo === true,
    retry: 3,
    retryDelay: 1000
  });

  const { data: movimentacoesTecnicos = [] } = useQuery({
    queryKey: ['movimentacoes-tecnicos', user?.empresa_id],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.MovimentacaoTecnico.list('-data_movimentacao');
      }
      return base44.entities.MovimentacaoTecnico.filter({
        empresa_id: user.empresa_id
      }, '-data_movimentacao');
    },
    enabled: !!user && moduloAtivo === true
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user && moduloAtivo === true
  });

  const { data: creditosTecnicos = [] } = useQuery({
    queryKey: ['creditos-tecnicos', user?.empresa_id, forceRender],
    queryFn: async () => {
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.CreditoTecnico.list('-data_envio');
      }
      return base44.entities.CreditoTecnico.filter(
        { empresa_id: user.empresa_id },
        '-data_envio'
      );
    },
    enabled: !!user && moduloAtivo === true
  });

  const createLancamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.Financeiro.create(data),
    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await queryClient.invalidateQueries(['financeiro']);
      setForceRender(prev => prev + 1);
      setShowForm(false);
      toast({ description: "✅ Lançamento criado com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao criar lançamento:", error);
      toast({ description: "❌ Erro ao criar lançamento. Tente novamente.", variant: "destructive" });
    }
  });

  const deleteLancamentoMutation = useMutation({
    mutationFn: async (lancamentoId) => {
      await base44.entities.Financeiro.delete(lancamentoId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['financeiro']);
      setForceRender(prev => prev + 1);
      toast({ description: "✅ Lançamento excluído com sucesso!", variant: "success" });
    }
  });

  const aprovarGastoMutation = useMutation({
    mutationFn: async ({ gastoId, aprovar }) => {
      const gasto = gastosPendentes.find(g => g.id === gastoId);
      
      await base44.entities.GastoTecnico.update(gastoId, {
        status_aprovacao: aprovar ? 'aprovado' : 'rejeitado'
      });

      if (aprovar) {
        // financeiro.categoria não aceita 'pedagio'/'estacionamento' (CHECK);
        // esses tipos de gasto entram como 'outro'.
        const CATEGORIAS_FINANCEIRO = ['servico', 'pecas', 'combustivel', 'alimentacao', 'salario', 'aluguel', 'equipamento', 'outro'];
        await base44.entities.Financeiro.create({
          empresa_id: user.empresa_id,
          tipo: 'saida',
          categoria: CATEGORIAS_FINANCEIRO.includes(gasto.tipo_gasto) ? gasto.tipo_gasto : 'outro',
          descricao: gasto.descricao || `Gasto de ${gasto.tipo_gasto}`,
          valor: gasto.valor,
          data_lancamento: gasto.data_gasto,
          tecnico_id: gasto.tecnico_id,
          chamado_id: gasto.chamado_id,
          status: 'pago'
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['gastos-pendentes']);
      await queryClient.invalidateQueries(['financeiro']);
      setForceRender(prev => prev + 1);
    }
  });

  const excluirCreditoMutation = useMutation({
    mutationFn: async (creditoId) => {
      await base44.entities.CreditoTecnico.delete(creditoId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['creditos-tecnicos']);
      await queryClient.invalidateQueries(['financeiro']);
      setForceRender(prev => prev + 1);
      toast({ description: "✅ Crédito excluído com sucesso!", variant: "success" });
    }
  });

  const excluirGastoTecnicoMutation = useMutation({
    mutationFn: async (movimentacaoId) => {
      await base44.entities.MovimentacaoTecnico.delete(movimentacaoId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['movimentacoes-tecnicos']);
      await queryClient.invalidateQueries(['financeiro']);
      setForceRender(prev => prev + 1);
      toast({ description: "✅ Gasto do técnico excluído com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao excluir gasto:", error);
      toast({ description: "❌ Erro ao excluir gasto. Tente novamente.", variant: "destructive" });
    }
  });

  const handleExcluirGastoTecnico = (gasto) => {
    const tecnico = tecnicos.find(t => t.id === gasto.tecnico_id);
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO!\n\nDeseja realmente excluir este gasto?\n\n` +
      `Técnico: ${tecnico?.nome || 'N/A'}\n` +
      `Valor: R$ ${parseFloat(gasto.valor).toFixed(2)}\n` +
      `Categoria: ${gasto.categoria || 'N/A'}\n` +
      `Descrição: ${gasto.descricao || 'Sem descrição'}\n\n` +
      `Esta ação é *irreversível* e afetará os relatórios da empresa e do técnico.`
    );
    
    if (confirmacao) {
      excluirGastoTecnicoMutation.mutate(gasto.id);
    }
  };

  const obterIntervaloDatas = () => {
    const hoje = new Date();
    
    if (usandoFiltroPersonalizado && dataInicio && dataFim) {
      return {
        inicio: startOfDay(new Date(dataInicio)),
        fim: endOfDay(new Date(dataFim))
      };
    }
    
    switch (periodoSelecionado) {
      case 'diario':
        return { inicio: startOfDay(subDays(hoje, 6)), fim: endOfDay(hoje) };
      case 'semanal':
        return { inicio: startOfWeek(subWeeks(hoje, 5), { locale: ptBR }), fim: endOfWeek(hoje, { locale: ptBR }) };
      case 'mensal':
      default:
        return { inicio: startOfMonth(subMonths(hoje, 5)), fim: endOfMonth(hoje) };
    }
  };

  const lancamentosFiltrados = useMemo(() => {
    if (!lancamentos || lancamentos.length === 0) return [];
    
    const { inicio, fim } = obterIntervaloDatas();
    return lancamentos.filter(l => {
      if (!l.data_lancamento) return false; 
      const dataLanc = new Date(l.data_lancamento);
      return dataLanc >= inicio && dataLanc <= fim;
    });
  }, [lancamentos, periodoSelecionado, usandoFiltroPersonalizado, dataInicio, dataFim]);

  const receitas = useMemo(() => {
    return lancamentosFiltrados
      .filter(f => f.tipo === 'entrada' && f.status === 'pago')
      .reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
  }, [lancamentosFiltrados]);

  const despesasPagas = useMemo(() => {
    return lancamentosFiltrados
      .filter(f => f.tipo === 'saida' && f.status === 'pago') 
      .reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
  }, [lancamentosFiltrados]);

  const despesasPendentes = useMemo(() => {
    return lancamentosFiltrados
      .filter(f => f.tipo === 'saida' && f.status === 'pendente') 
      .reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
  }, [lancamentosFiltrados]);

  const creditosEnviadosAprovados = useMemo(() => {
    const { inicio, fim } = obterIntervaloDatas();
    return creditosTecnicos
      .filter(c => {
        if (c.status !== 'aprovado') return false;
        if (!c.data_envio) return false;
        const dataEnvio = new Date(c.data_envio);
        return dataEnvio >= inicio && dataEnvio <= fim;
      })
      .reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
  }, [creditosTecnicos, periodoSelecionado, usandoFiltroPersonalizado, dataInicio, dataFim]);

  const gastosTecnicos = useMemo(() => {
    const movimentacoesAprovadas = movimentacoesTecnicos.filter(m => 
      m.tipo === 'despesa' && m.status === 'aprovado'
    );
    
    const { inicio, fim } = obterIntervaloDatas();
    return movimentacoesAprovadas.filter(m => {
      if (!m.data_movimentacao) return false;
      const dataMovimentacao = new Date(m.data_movimentacao);
      return dataMovimentacao >= inicio && dataMovimentacao <= fim;
    });
  }, [movimentacoesTecnicos, periodoSelecionado, usandoFiltroPersonalizado, dataInicio, dataFim]);

  const totalGastosTecnicos = useMemo(() => {
    return gastosTecnicos.reduce((sum, g) => sum + (parseFloat(g.valor) || 0), 0);
  }, [gastosTecnicos]);

  const despesas = incluirPendentes ? (despesasPagas + despesasPendentes + creditosEnviadosAprovados) : (despesasPagas + creditosEnviadosAprovados);
  const saldo = receitas - despesas;

  const creditosFiltrados = useMemo(() => {
    let filtered = creditosTecnicos;
    const { inicio, fim } = obterIntervaloDatas();

    filtered = filtered.filter(c => {
      if (!c.data_envio) return false;
      const dataCredito = new Date(c.data_envio);
      return dataCredito >= inicio && dataCredito <= fim;
    });

    if (filtroTecnicoCreditos !== 'todos') {
      filtered = filtered.filter(c => c.tecnico_id === filtroTecnicoCreditos);
    }
    return filtered;
  }, [creditosTecnicos, filtroTecnicoCreditos, periodoSelecionado, usandoFiltroPersonalizado, dataInicio, dataFim]);

  const gastosTecnicosFiltrados = useMemo(() => {
    if (filtroTecnicoGastos === 'todos') return gastosTecnicos;
    return gastosTecnicos.filter(g => g.tecnico_id === filtroTecnicoGastos);
  }, [gastosTecnicos, filtroTecnicoGastos]);

  const creditosAprovadosFiltrados = creditosFiltrados.filter(c => c.status === 'aprovado').length;
  const creditosPendentesFiltrados = creditosFiltrados.filter(c => c.status === 'pendente').length;
  const creditosRejeitadosFiltrados = creditosFiltrados.filter(c => c.status === 'rejeitado').length;
  const totalCreditosEnviadosFiltrados = creditosFiltrados.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
  
  const totalGastosTecnicosFiltrados = useMemo(() => {
    return gastosTecnicosFiltrados.reduce((sum, g) => sum + (parseFloat(g.valor) || 0), 0);
  }, [gastosTecnicosFiltrados]);

  const gerarDadosGrafico = useCallback(() => {
    const dados = [];
    const hoje = new Date();

    if (periodoSelecionado === 'diario') {
      for (let i = 6; i >= 0; i--) {
        const data = subDays(hoje, i);
        const dataStr = format(data, 'dd/MM');
        
        const lancamentosDia = lancamentosFiltrados.filter(l => {
          const dataLanc = new Date(l.data_lancamento);
          return format(dataLanc, 'yyyy-MM-dd') === format(data, 'yyyy-MM-dd');
        });

        const entradas = lancamentosDia
          .filter(l => l.tipo === 'entrada' && l.status === 'pago')
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

        const companySaidas = lancamentosDia
          .filter(l => l.tipo === 'saida' && (l.status === 'pago' || (incluirPendentes && l.status === 'pendente'))) 
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

        const creditosDia = creditosTecnicos
          .filter(c => {
            if (c.status !== 'aprovado') return false;
            const dataEnvio = new Date(c.data_envio);
            return format(dataEnvio, 'yyyy-MM-dd') === format(data, 'yyyy-MM-dd');
          })
          .reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);

        dados.push({
          periodo: dataStr,
          Entradas: entradas,
          Saídas: companySaidas + creditosDia
        });
      }
    } else if (periodoSelecionado === 'semanal') {
      for (let i = 5; i >= 0; i--) {
        const inicioSemana = startOfWeek(subWeeks(hoje, i), { locale: ptBR });
        const fimSemana = endOfWeek(subWeeks(hoje, i), { locale: ptBR });
        const semanaStr = `${format(inicioSemana, 'dd/MM', { locale: ptBR })}`;
        
        const lancamentosSemana = lancamentosFiltrados.filter(l => {
          const dataLanc = new Date(l.data_lancamento);
          return dataLanc >= inicioSemana && dataLanc <= fimSemana;
        });

        const entradas = lancamentosSemana
          .filter(l => l.tipo === 'entrada' && l.status === 'pago')
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

        const companySaidas = lancamentosSemana
          .filter(l => l.tipo === 'saida' && (l.status === 'pago' || (incluirPendentes && l.status === 'pendente'))) 
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

        const creditosSemana = creditosTecnicos
          .filter(c => {
            if (c.status !== 'aprovado') return false;
            const dataEnvio = new Date(c.data_envio);
            return dataEnvio >= inicioSemana && dataEnvio <= fimSemana;
          })
          .reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);

        dados.push({
          periodo: semanaStr,
          Entradas: entradas,
          Saídas: companySaidas + creditosSemana
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const mes = subMonths(hoje, i);
        const mesStr = format(mes, 'MMM', { locale: ptBR });
        
        const lancamentosMes = lancamentosFiltrados.filter(l => {
          const dataLanc = new Date(l.data_lancamento);
          return format(dataLanc, 'yyyy-MM') === format(mes, 'yyyy-MM');
        });

        const entradas = lancamentosMes
          .filter(l => l.tipo === 'entrada' && l.status === 'pago')
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

        const companySaidas = lancamentosMes
          .filter(l => l.tipo === 'saida' && (l.status === 'pago' || (incluirPendentes && l.status === 'pendente'))) 
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

        const creditosMes = creditosTecnicos
          .filter(c => {
            if (c.status !== 'aprovado') return false;
            const dataEnvio = new Date(c.data_envio);
            return format(dataEnvio, 'yyyy-MM') === format(mes, 'yyyy-MM');
          })
          .reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);

        dados.push({
          periodo: mesStr,
          Entradas: entradas,
          Saídas: companySaidas + creditosMes
        });
      }
    }

    return dados;
  }, [lancamentosFiltrados, creditosTecnicos, periodoSelecionado, incluirPendentes, usandoFiltroPersonalizado, dataInicio, dataFim]);

  const dadosGrafico = useMemo(() => gerarDadosGrafico(), [gerarDadosGrafico]);

  const gastosPorTecnico = useMemo(() => {
    return tecnicos.map(tecnico => {
      const gastosDoTecnico = gastosTecnicos.filter(g => g.tecnico_id === tecnico.id);
      const total = gastosDoTecnico.reduce((sum, g) => sum + (parseFloat(g.valor) || 0), 0);
      return { tecnico: tecnico.nome, total };
    }).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [gastosTecnicos, tecnicos]);

  const topCategorias = useMemo(() => {
    const categorias = {};
    lancamentosFiltrados
      .filter(l => l.tipo === 'saida') 
      .forEach(l => {
        categorias[l.categoria] = (categorias[l.categoria] || 0) + parseFloat(l.valor || 0);
      });
    return Object.entries(categorias).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [lancamentosFiltrados]);

  if (!user) return <PageLoading />;
  if (moduloAtivo === false) return <BloqueioModulo nomeModulo="Financeiro" />;
  if (moduloAtivo === null) return <PageLoading />;
  if (tecnicoSelecionado) return (
    <DetalheGastosTecnico 
      tecnico={tecnicoSelecionado} 
      gastos={movimentacoesTecnicos.filter(g => g.tecnico_id === tecnicoSelecionado.id)} 
      onVoltar={() => setTecnicoSelecionado(null)} 
      onExcluir={handleExcluirGastoTecnico}
    />
  );
  if (showRelatorio) return <RelatorioFinanceiro lancamentos={lancamentosFiltrados} empresa={empresa} onClose={() => setShowRelatorio(false)} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
              <p className="text-muted-foreground mt-1">Controle completo de receitas e despesas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRelatorio(true)}>
              <Download className="w-4 h-4 mr-2" />Relatório
            </Button>
            <Button onClick={() => setShowForm(!showForm)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-5 h-5 mr-2" />Novo Lançamento
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-none mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Filtros de Período</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Período Pré-definido:</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button variant={periodoSelecionado === 'diario' && !usandoFiltroPersonalizado ? 'default' : 'outline'} onClick={() => { setPeriodoSelecionado('diario'); setUsandoFiltroPersonalizado(false); setDataInicio(''); setDataFim(''); }} className={periodoSelecionado === 'diario' && !usandoFiltroPersonalizado ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>📅 Diário</Button>
                  <Button variant={periodoSelecionado === 'semanal' && !usandoFiltroPersonalizado ? 'default' : 'outline'} onClick={() => { setPeriodoSelecionado('semanal'); setUsandoFiltroPersonalizado(false); setDataInicio(''); setDataFim(''); }} className={periodoSelecionado === 'semanal' && !usandoFiltroPersonalizado ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>📊 Semanal</Button>
                  <Button variant={periodoSelecionado === 'mensal' && !usandoFiltroPersonalizado ? 'default' : 'outline'} onClick={() => { setPeriodoSelecionado('mensal'); setUsandoFiltroPersonalizado(false); setDataInicio(''); setDataFim(''); }} className={periodoSelecionado === 'mensal' && !usandoFiltroPersonalizado ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}>📈 Mensal</Button>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div><Label>Data Início</Label><Input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setUsandoFiltroPersonalizado(false); }} /></div>
                  <div><Label>Data Fim</Label><Input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setUsandoFiltroPersonalizado(false); }} /></div>
                  <div className="flex items-end gap-2">
                    <Button onClick={() => { if (dataInicio && dataFim) { setUsandoFiltroPersonalizado(true); setPeriodoSelecionado('personalizado'); }}} disabled={!dataInicio || !dataFim || dataInicio > dataFim} className="flex-1 bg-blue-600 hover:bg-blue-700">Aplicar</Button>
                    {usandoFiltroPersonalizado && <Button variant="outline" onClick={() => { setUsandoFiltroPersonalizado(false); setDataInicio(''); setDataFim(''); setPeriodoSelecionado('mensal'); }}>Limpar</Button>}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {despesasPendentes > 0 && (
          <Card className="shadow-lg border-2 border-yellow-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-foreground">R$ {despesasPendentes.toFixed(2)} em despesas pendentes</p>
                    <p className="text-sm text-muted-foreground">Escolha se deseja incluí-las no cálculo</p>
                  </div>
                </div>
                <Button variant={incluirPendentes ? "default" : "outline"} onClick={() => setIncluirPendentes(!incluirPendentes)}>
                  {incluirPendentes ? "Incluindo" : "Apenas Pagas"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-600">R$ {receitas.toFixed(2)}</p>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Despesas da Empresa</CardTitle></CardHeader>
            <CardContent>
              <div>
                <p className="text-3xl font-bold text-red-600">R$ {despesas.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Operacionais: R$ {(despesasPagas + (incluirPendentes ? despesasPendentes : 0)).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Créditos: R$ {creditosEnviadosAprovados.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Gastos dos Técnicos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">R$ {totalGastosTecnicos.toFixed(2)}</p>
              <p className="text-xs text-purple-600 mt-1">Controle (não afeta saldo)</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>R$ {saldo.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {creditosTecnicos.length > 0 && (
          <Card className="shadow-lg border-none mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-orange-600"/>Créditos para Técnicos</CardTitle>
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={filtroTecnicoCreditos} onValueChange={setFiltroTecnicoCreditos}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Técnicos</SelectItem>
                      {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-blue-600">Total</p><p className="text-2xl font-bold text-blue-900">R$ {totalCreditosEnviadosFiltrados.toFixed(2)}</p></div>
                <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-green-600">Aprovados</p><p className="text-2xl font-bold text-green-900">{creditosAprovadosFiltrados}</p></div>
                <div className="bg-yellow-50 p-4 rounded-lg"><p className="text-sm text-yellow-600">Pendentes</p><p className="text-2xl font-bold text-yellow-900">{creditosPendentesFiltrados}</p></div>
                <div className="bg-red-50 p-4 rounded-lg"><p className="text-sm text-red-600">Rejeitados</p><p className="text-2xl font-bold text-red-900">{creditosRejeitadosFiltrados}</p></div>
              </div>
              {creditosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum crédito encontrado</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Data</th>
                        <th className="px-4 py-2 text-left">Técnico</th>
                        <th className="px-4 py-2 text-left">Tipo</th>
                        <th className="px-4 py-2 text-left">Descrição</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {creditosFiltrados.map((credito) => {
                        const tec = tecnicos.find(t => t.id === credito.tecnico_id);
                        return (
                          <tr key={credito.id} className="hover:bg-muted">
                            <td className="px-4 py-2">{format(new Date(credito.data_envio), 'dd/MM/yyyy', { locale: ptBR })}</td>
                            <td className="px-4 py-2">{tec?.nome || 'N/A'}</td>
                            <td className="px-4 py-2 capitalize">{credito.tipo}</td>
                            <td className="px-4 py-2 max-w-xs truncate">{credito.descricao}</td>
                            <td className="px-4 py-2 text-right font-semibold">R$ {parseFloat(credito.valor).toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge className={credito.status === 'aprovado' ? 'bg-green-100 text-green-800' : credito.status === 'rejeitado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{credito.status}</Badge>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button variant="ghost" size="icon" onClick={() => { if (window.confirm('Excluir crédito?')) excluirCreditoMutation.mutate(credito.id); }} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {loadingMovimentacoes ? (
          <Card className="mb-8"><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div><p className="text-muted-foreground text-sm">Carregando...</p></CardContent></Card>
        ) : movimentacoesPendentes.length > 0 ? (
          <div className="mb-8"><AprovarMovimentacoes movimentacoes={movimentacoesPendentes} tecnicos={tecnicos} /></div>
        ) : null}

        {gastosPendentes.length > 0 && (
          <GastosTecnicosPendentes gastos={gastosPendentes} tecnicos={tecnicos} onAprovar={(id) => aprovarGastoMutation.mutate({ gastoId: id, aprovar: true })} onRejeitar={(id) => aprovarGastoMutation.mutate({ gastoId: id, aprovar: false })} />
        )}

        {gastosTecnicos.length > 0 && (
          <Card className="shadow-lg border-none mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-purple-600" />Gastos dos Técnicos</CardTitle>
                  <Badge className="bg-purple-100 text-purple-800">Total: R$ {totalGastosTecnicosFiltrados.toFixed(2)}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={filtroTecnicoGastos} onValueChange={setFiltroTecnicoGastos}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Técnicos</SelectItem>
                      {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {gastosTecnicosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum gasto encontrado</div>
              ) : (
                <GastosTecnicosLista 
                  movimentacoes={gastosTecnicosFiltrados} 
                  tecnicos={tecnicos} 
                  onVerDetalhes={(t) => setTecnicoSelecionado(t)} 
                  onExcluir={handleExcluirGastoTecnico}
                />
              )}
            </CardContent>
          </Card>
        )}

        {showForm && (
          <div className="mb-8">
            <LancamentoForm tecnicos={tecnicos} onSubmit={(data) => createLancamentoMutation.mutate({...data, empresa_id: user.empresa_id})} onCancel={() => setShowForm(false)} isLoading={createLancamentoMutation.isPending} />
          </div>
        )}

        <Card className="shadow-lg border-none mb-8">
          <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Entradas" fill="#10b981" />
                <Bar dataKey="Saídas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-none">
            <CardHeader><CardTitle>Top 5 Gastos por Técnico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gastosPorTecnico.map((item, i) => (
                  <div key={i} className="flex justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{i + 1}. {item.tecnico}</span>
                    <span className="text-purple-600 font-bold">R$ {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader><CardTitle>Top 5 Categorias</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCategorias.map(([cat, val], i) => (
                  <div key={i} className="flex justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{i + 1}. {cat}</span>
                    <span className="text-red-600 font-bold">R$ {val.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Histórico de Lançamentos da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LancamentosList lancamentos={lancamentosFiltrados} tecnicos={tecnicos} onDelete={(id) => { if (window.confirm('Excluir lançamento?')) deleteLancamentoMutation.mutate(id); }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
