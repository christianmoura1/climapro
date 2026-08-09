
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  DollarSign,
  Plus,
  AlertTriangle,
  TrendingUp,
  Download,
  Settings // Added Settings icon for the new section
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { aplicacaoDoPlano, PLANOS, planoPorId } from "@/lib/planos";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

import NovaEmpresaForm from "../components/admin/NovaEmpresaForm";
import ListaEmpresas from "../components/admin/ListaEmpresas";
import EmpresasInadimplentes from "../components/admin/EmpresasInadimplentes";
import { toast } from "@/components/ui/use-toast";

// Valor mensal formatado do plano, para os avisos de cobrança.
function valorDoPlano(planoId) {
  const plano = planoPorId(planoId);
  if (!plano || !plano.valor) return 'a combinar';
  return `R$ ${plano.valor.toFixed(2).replace('.', ',')}`;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false);
  const [filtroFinanceiro, setFiltroFinanceiro] = useState('mensal'); // mensal, trimestral, anual
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl("Dashboard"));
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Erro ao verificar admin:", error);
        navigate(createPageUrl("LandingPage"));
      }
    };
    checkAdmin();
  }, [navigate]);

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list('-created_date'),
    enabled: isAdmin
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos-global'],
    queryFn: () => base44.entities.Tecnico.list(),
    enabled: isAdmin
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-global'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: isAdmin
  });

  const criarEmpresaMutation = useMutation({
    mutationFn: async (data) => {
      const slugExiste = empresas.some(e => e.slug_empresa === data.slug_empresa);
      if (slugExiste) {
        throw new Error("Este slug já está em uso. Escolha outro nome.");
      }
      return base44.entities.Empresa.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['empresas']);
      setShowNovaEmpresa(false);
    }
  });

  const updateEmpresaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Empresa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['empresas']);
    }
  });

  const deleteEmpresaMutation = useMutation({
    mutationFn: async (empresaId) => {
      await base44.entities.Empresa.delete(empresaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['empresas']);
    }
  });

  const limparDadosTecnicoMutation = useMutation({
    mutationFn: async (emailTecnico) => {
      console.log("[AdminPanel] Limpando dados do técnico:", emailTecnico);
      
      // 1. Buscar o técnico pelo email diretamente na entidade Tecnico
      const todosTeconicos = await base44.entities.Tecnico.list();
      const tecnico = todosTeconicos.find(t => t.email === emailTecnico);
      
      if (!tecnico) {
        throw new Error("Técnico não encontrado com este email");
      }

      console.log("[AdminPanel] Técnico encontrado:", tecnico);

      // 2. Buscar e excluir todos os lançamentos do técnico
      const lancamentosTecnico = await base44.entities.LancamentoTecnico.filter({
        tecnico_id: tecnico.id
      });
      
      console.log("[AdminPanel] Lançamentos do técnico:", lancamentosTecnico.length);
      
      for (const lanc of lancamentosTecnico) {
        await base44.entities.LancamentoTecnico.delete(lanc.id);
      }

      // 3. Buscar e excluir todas as movimentações do técnico
      const movimentacoes = await base44.entities.MovimentacaoTecnico.filter({
        tecnico_id: tecnico.id
      });
      
      console.log("[AdminPanel] Movimentações do técnico:", movimentacoes.length);
      
      for (const mov of movimentacoes) {
        await base44.entities.MovimentacaoTecnico.delete(mov.id);
      }

      // 4. Buscar e excluir todos os orçamentos do técnico
      const orcamentos = await base44.entities.OrcamentoTecnico.filter({
        tecnico_id: tecnico.id
      });
      
      console.log("[AdminPanel] Orçamentos do técnico:", orcamentos.length);
      
      for (const orc of orcamentos) {
        await base44.entities.OrcamentoTecnico.delete(orc.id);
      }

      // 5. Buscar e excluir lançamentos financeiros da empresa relacionados ao técnico
      const lancamentosEmpresa = await base44.entities.Financeiro.filter({
        tecnico_id: tecnico.id
      });
      
      console.log("[AdminPanel] Lançamentos da empresa:", lancamentosEmpresa.length);
      
      for (const lanc of lancamentosEmpresa) {
        await base44.entities.Financeiro.delete(lanc.id);
      }

      // 6. Buscar e excluir gastos pendentes do técnico
      const gastos = await base44.entities.GastoTecnico.filter({
        tecnico_id: tecnico.id
      });
      
      console.log("[AdminPanel] Gastos do técnico:", gastos.length);
      
      for (const gasto of gastos) {
        await base44.entities.GastoTecnico.delete(gasto.id);
      }

      return {
        tecnico,
        lancamentosTecnico: lancamentosTecnico.length,
        movimentacoes: movimentacoes.length,
        orcamentos: orcamentos.length,
        lancamentosEmpresa: lancamentosEmpresa.length,
        gastos: gastos.length
      };
    },
    onSuccess: (resultado) => {
      queryClient.invalidateQueries(['financeiro']);
      queryClient.invalidateQueries(['lancamentos-tecnico']);
      queryClient.invalidateQueries(['movimentacoes-tecnico']);
      queryClient.invalidateQueries(['orcamentos-pendentes']);
      queryClient.invalidateQueries(['gastos-pendentes']);
      
      alert(`✅ Dados financeiros do técnico ${resultado.tecnico.nome} limpos com sucesso!

📊 Resumo:
- Lançamentos do técnico: ${resultado.lancamentosTecnico}
- Movimentações: ${resultado.movimentacoes}
- Orçamentos: ${resultado.orcamentos}
- Lançamentos da empresa: ${resultado.lancamentosEmpresa}
- Gastos: ${resultado.gastos}

Total de registros excluídos: ${resultado.lancamentosTecnico + resultado.movimentacoes + resultado.orcamentos + resultado.lancamentosEmpresa + resultado.gastos}`);
    },
    onError: (error) => {
      console.error("[AdminPanel] Erro ao limpar dados:", error);
      toast({ description: `❌ Erro ao limpar dados: ${error.message}`, variant: "destructive" });
    }
  });

  const handleLimparDadosTecnico = () => {
    const email = prompt("Digite o email do técnico para limpar os dados financeiros:\n\nExemplo: fredsantana71@gmail.com");
    if (!email) return;
    
    const confirmacao = confirm(`⚠️ ATENÇÃO!\n\nVocê está prestes a EXCLUIR PERMANENTEMENTE todos os dados financeiros do técnico:\n\n${email}\n\nIsso inclui:\n✗ Todos os lançamentos do técnico\n✗ Todas as movimentações (aprovadas/pendentes/rejeitadas)\n✗ Todos os orçamentos\n✗ Todos os gastos pendentes\n✗ Lançamentos no financeiro da empresa\n✗ Histórico financeiro completo\n\nEsta ação NÃO PODE ser desfeita.\n\nDeseja continuar?`);
    
    if (confirmacao) {
      limparDadosTecnicoMutation.mutate(email);
    }
  };

  const handleUpdateModulos = async (empresaId, novosModulos, moduloAlterado, novoStatus) => {
    try {
      // Atualizar empresa
      await updateEmpresaMutation.mutateAsync({
        id: empresaId,
        data: { modulos_ativos: novosModulos }
      });

      // Registrar log
      const empresa = empresas.find(e => e.id === empresaId);
      if (user) { // Ensure user is not null before logging
        await base44.entities.LogAcao.create({
          empresa_id: empresaId,
          user_id: user.id,
          user_email: user.email,
          tipo_usuario: 'admin_global',
          acao: `Módulo "${moduloAlterado}" ${novoStatus ? 'ativado' : 'desativado'}`,
          entidade_afetada: 'Empresa',
          entidade_id: empresaId,
          data_hora: new Date().toISOString(),
          detalhes: `Empresa: ${empresa?.nome}`
        });
      }

      // Enviar notificação por email
      if (empresa?.email_contato) {
        await base44.integrations.Core.SendEmail({
          to: empresa.email_contato,
          subject: `Módulo ${novoStatus ? 'Ativado' : 'Desativado'} - ClimaPro`,
          body: `Olá ${empresa.nome},\n\nO módulo "${moduloAlterado}" foi ${novoStatus ? 'ativado' : 'desativado'} no seu painel.\n\n${novoStatus ? 'Você já pode começar a utilizá-lo!' : 'Entre em contato conosco para mais informações.'}\n\nAtenciosamente,\nEquipe ClimaPro`
        });
      }

      toast({ description: `Módulo ${moduloAlterado} ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`, variant: "default" });
    } catch (error) {
      console.error("Erro ao atualizar módulos:", error);
      toast({ description: "Erro ao atualizar módulo. Tente novamente.", variant: "destructive" });
    }
  };

  // Atualizar status de pagamento automaticamente
  useEffect(() => {
    const atualizarStatusPagamento = async () => {
      if (!isAdmin || !empresas || empresas.length === 0) return;
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      for (const empresa of empresas) {
        if (empresa.data_vencimento_plano && empresa.plano !== 'free') {
          const vencimento = new Date(empresa.data_vencimento_plano);
          vencimento.setHours(0, 0, 0, 0);
          const diasDiferenca = differenceInDays(hoje, vencimento);
          
          let novoStatus = 'ativo';
          let novoStatusEmpresa = 'ativa';
          
          if (diasDiferenca >= 0 && diasDiferenca <= 7) {
            // 1 a 7 dias de atraso
            novoStatus = 'pendente';
            novoStatusEmpresa = 'ativa';
          } else if (diasDiferenca > 7) {
            // Mais de 7 dias de atraso
            novoStatus = 'bloqueado';
            novoStatusEmpresa = 'suspensa';
            
            // Fazer downgrade para free
            if (empresa.plano !== 'free') {
              await updateEmpresaMutation.mutateAsync({
                id: empresa.id,
                data: {
                  // aplicacaoDoPlano grava limites e módulos juntos; o valor
                  // fixo que estava aqui deixou de bater com o plano Free
                  // quando o teto virou 40 chamados.
                  ...aplicacaoDoPlano('free'),
                  status_pagamento: 'bloqueado',
                  status: 'suspensa'
                }
              });
              
              // Enviar email de bloqueio
              if (empresa.email_contato) {
                await base44.integrations.Core.SendEmail({
                  to: empresa.email_contato,
                  subject: "🚫 Conta Bloqueada - Pagamento Pendente",
                  body: `Olá ${empresa.nome},\n\nSua conta foi bloqueada devido ao não pagamento do plano há mais de 7 dias.\n\nPara reativar, entre em contato conosco.\n\nAtenciosamente,\nEquipe ClimaPro`
                });
              }
              continue;
            }
          }
          
          // Atualizar se necessário
          if (empresa.status_pagamento !== novoStatus || empresa.status !== novoStatusEmpresa) {
            await updateEmpresaMutation.mutateAsync({
              id: empresa.id,
              data: {
                status_pagamento: novoStatus,
                status: novoStatusEmpresa
              }
            });
          }
        }
      }
    };
    
    if (isAdmin && empresas && empresas.length > 0) {
      atualizarStatusPagamento();
    }
  }, [empresas, isAdmin]);

  // Enviar lembretes automáticos
  useEffect(() => {
    const enviarLembretes = async () => {
      if (!isAdmin || !empresas || empresas.length === 0) return;
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      for (const empresa of empresas) {
        if (empresa.data_vencimento_plano && empresa.plano !== 'free' && empresa.email_contato) {
          const vencimento = new Date(empresa.data_vencimento_plano);
          vencimento.setHours(0, 0, 0, 0);
          const diasRestantes = differenceInDays(vencimento, hoje);
          
          // 3 dias antes
          if (diasRestantes === 3) {
            await base44.integrations.Core.SendEmail({
              to: empresa.email_contato,
              subject: "⏰ Lembrete: Seu plano vence em 3 dias",
              body: `Olá ${empresa.nome},\n\nSeu plano ${empresa.plano} vence em 3 dias (${format(vencimento, "dd/MM/yyyy", { locale: ptBR })}).\n\nRenove para continuar usando todos os recursos.\n\nValor: ${valorDoPlano(empresa.plano)}\n\nAtenciosamente,\nEquipe ClimaPro`
            });
          }
          
          // No dia do vencimento
          if (diasRestantes === 0) {
            await base44.integrations.Core.SendEmail({
              to: empresa.email_contato,
              subject: "🔔 Seu plano vence hoje!",
              body: `Olá ${empresa.nome},\n\nSeu plano vence HOJE!\n\nRenove agora para não perder o acesso.\n\nValor: ${valorDoPlano(empresa.plano)}\n\nAtenciosamente,\nEquipe ClimaPro`
            });
          }
          
          // 2 dias após vencimento
          if (diasRestantes === -2) {
            await base44.integrations.Core.SendEmail({
              to: empresa.email_contato,
              subject: "⚠️ Pagamento Atrasado - Urgente",
              body: `Olá ${empresa.nome},\n\nSeu pagamento está atrasado há 2 dias.\n\nSem o pagamento, sua conta será bloqueada em 5 dias.\n\nValor: ${valorDoPlano(empresa.plano)}\n\nAtenciosamente,\nEquipe ClimaPro`
            });
          }
        }
      }
    };
    
    if (isAdmin && empresas && empresas.length > 0) {
      enviarLembretes();
    }
  }, [empresas, isAdmin]);

  // Calcular métricas
  // Valor mensal por plano, para o cálculo de faturamento. Vem de
  // src/lib/planos.js para não ficar defasado quando o preço mudar.
  const precos = Object.fromEntries(PLANOS.map((plano) => [plano.id, plano.valor]));

  const empresasAtivas = empresas.filter(e => e.status === 'ativa').length;
  const empresasInadimplentes = empresas.filter(e => 
    e.status_pagamento === 'pendente' || e.status_pagamento === 'bloqueado'
  ).length;

  const receitaMensal = empresas
    .filter(e => e.plano !== 'free' && e.status_pagamento === 'ativo')
    .reduce((sum, e) => sum + (precos[e.plano] || 0), 0);

  const faturamentoTotal = empresas
    .filter(e => e.plano !== 'free')
    .reduce((sum, e) => {
      if (!e.created_date) return sum;
      const mesesAtivo = Math.max(1, Math.floor(differenceInDays(new Date(), new Date(e.created_date)) / 30));
      return sum + (precos[e.plano] || 0) * mesesAtivo;
    }, 0);

  const tecnicosAtivos = tecnicos.filter(t => t.status === 'ativo').length;
  const clientesAtivos = clientes.length;

  // Dados para gráfico de faturamento
  const calcularFaturamentoPorMes = () => {
    const meses = filtroFinanceiro === 'anual' ? 12 : filtroFinanceiro === 'trimestral' ? 3 : 6;
    const dados = [];
    
    for (let i = meses - 1; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      const mesAno = format(data, 'MMM/yy', { locale: ptBR });
      
      const faturamento = empresas
        .filter(e => {
          if (e.plano === 'free' || !e.created_date) return false;
          const criacao = new Date(e.created_date);
          return criacao <= data;
        })
        .reduce((sum, e) => sum + (precos[e.plano] || 0), 0);
      
      dados.push({
        mes: mesAno,
        faturamento: faturamento
      });
    }
    
    return dados;
  };

  const dadosFaturamento = calcularFaturamentoPorMes();

  const handleUpdatePlan = async (empresaId, newPlan) => {
    // aplicacaoDoPlano grava limites E módulos, igual ao webhook do Stripe.
    // Antes daqui saía só limite_chamados_mes, e com um mapa de planos que nem
    // existia mais ('intermediario', 'avancado'), então o valor ia undefined.
    const aplicacao = aplicacaoDoPlano(newPlan);

    const dataVencimento = newPlan !== 'free' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    updateEmpresaMutation.mutate({
      id: empresaId,
      data: {
        ...aplicacao,
        data_vencimento_plano: dataVencimento,
        status_pagamento: 'ativo',
        status: 'ativa'
      }
    });
  };

  const handleConfirmarPagamento = async (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    const novaDataVencimento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await updateEmpresaMutation.mutateAsync({
      id: empresaId,
      data: {
        status_pagamento: 'ativo',
        status: 'ativa',
        data_vencimento_plano: novaDataVencimento
      }
    });
    
    toast({ description: "Pagamento confirmado! Empresa reativada.", variant: "default" });
  };

  const handleEnviarLembrete = async (empresa) => {
    const mensagem = `🔔 *LEMBRETE DE PAGAMENTO*

Olá ${empresa.nome}!

Seu pagamento está ${empresa.status_pagamento === 'pendente' ? 'pendente' : 'atrasado'}.

*Plano:* ${empresa.plano}
*Valor:* R$ ${precos[empresa.plano]}
*Vencimento:* ${format(new Date(empresa.data_vencimento_plano), "dd/MM/yyyy", { locale: ptBR })}

Por favor, regularize o pagamento para continuar usando o sistema.

Atenciosamente,
ClimaPro`;

    if (empresa.telefone) {
      const telefone = empresa.telefone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
      window.open(whatsappUrl, '_blank');
    }
    
    if (empresa.email_contato) {
      await base44.integrations.Core.SendEmail({
        to: empresa.email_contato,
        subject: "🔔 Lembrete de Pagamento - ClimaPro",
        body: mensagem
      });
    }
    
    toast({ description: "Lembrete enviado!", variant: "default" });
  };

  const handleExportarRelatorio = () => {
    let csvContent = "Nome da Empresa,Plano,Valor Mensal,Status Pagamento,Data Vencimento,Técnicos Ativos,Clientes Ativos\n";
    
    empresas.forEach(empresa => {
      const tecnicosDaEmpresa = tecnicos.filter(t => t.empresa_id === empresa.id && t.status === 'ativo').length;
      const clientesDaEmpresa = clientes.filter(c => c.empresa_id === empresa.id).length;
      
      csvContent += `${empresa.nome},${empresa.plano},R$ ${precos[empresa.plano]},${empresa.status_pagamento || 'ativo'},${empresa.data_vencimento_plano || 'N/A'},${tecnicosDaEmpresa},${clientesDaEmpresa}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-financeiro-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Apenas o administrador global pode acessar esta área.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel Administrativo Global</h1>
            <p className="text-muted-foreground mt-1">Gestão financeira e operacional</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportarRelatorio}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
            <Button
              onClick={() => setShowNovaEmpresa(!showNovaEmpresa)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Empresa
            </Button>
          </div>
        </div>

        {/* Ferramentas Administrativas */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ferramentas Administrativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Atenção:</strong> As ferramentas abaixo são irreversíveis. Use com cuidado.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleLimparDadosTecnico}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={limparDadosTecnicoMutation.isPending}
                >
                  {limparDadosTecnicoMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                      Limpando...
                    </>
                  ) : (
                    "🗑️ Limpar Dados Financeiros de Técnico"
                  )}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Como usar:</strong> Digite o email do técnico (ex: fredsantana71@gmail.com) para remover todo seu histórico financeiro.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-none bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Empresas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{empresasAtivas}</p>
                  <p className="text-xs opacity-75 mt-1">Em operação</p>
                </div>
                <Building2 className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Empresas Inadimplentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{empresasInadimplentes}</p>
                  <p className="text-xs opacity-75 mt-1">Pendente/Bloqueado</p>
                </div>
                <AlertTriangle className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Receita Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">R$ {receitaMensal.toFixed(2)}</p>
                  <p className="text-xs opacity-75 mt-1">Planos ativos</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Faturamento Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">R$ {faturamentoTotal.toFixed(2)}</p>
                  <p className="text-xs opacity-75 mt-1">Acumulado</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas Adicionais */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Técnicos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{tecnicosAtivos}</p>
                <Users className="w-8 h-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{clientesAtivos}</p>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Faturamento */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Histórico de Faturamento</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filtroFinanceiro === 'mensal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroFinanceiro('mensal')}
                >
                  Mensal
                </Button>
                <Button
                  variant={filtroFinanceiro === 'trimestral' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroFinanceiro('trimestral')}
                >
                  Trimestral
                </Button>
                <Button
                  variant={filtroFinanceiro === 'anual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroFinanceiro('anual')}
                >
                  Anual
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFaturamento}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="faturamento" stroke="#8b5cf6" strokeWidth={2} name="Faturamento" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Empresas Inadimplentes */}
        {empresasInadimplentes > 0 && (
          <EmpresasInadimplentes
            empresas={empresas.filter(e => e.status_pagamento === 'pendente' || e.status_pagamento === 'bloqueado')}
            onEnviarLembrete={handleEnviarLembrete}
            onConfirmarPagamento={handleConfirmarPagamento}
          />
        )}

        {/* Formulário Nova Empresa */}
        {showNovaEmpresa && (
          <NovaEmpresaForm
            onSubmit={(data) => criarEmpresaMutation.mutate(data)}
            onCancel={() => setShowNovaEmpresa(false)}
            isLoading={criarEmpresaMutation.isPending}
            error={criarEmpresaMutation.error}
          />
        )}

        {/* Lista de Empresas */}
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Empresas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ListaEmpresas
              empresas={empresas}
              tecnicos={tecnicos}
              clientes={clientes}
              onUpdateStatus={(empresaId, newStatus) => {
                updateEmpresaMutation.mutate({
                  id: empresaId,
                  data: { status: newStatus }
                });
              }}
              onUpdatePlan={handleUpdatePlan}
              onDelete={(empresaId) => {
                if (confirm("Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.")) {
                  deleteEmpresaMutation.mutate(empresaId);
                }
              }}
              onConfirmarPagamento={handleConfirmarPagamento}
              onUpdateModulos={handleUpdateModulos}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
