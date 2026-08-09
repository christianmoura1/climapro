
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertCircle, Filter, Download } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import AprovarPMOCEmpresa from "../components/pmoc/AprovarPMOCEmpresa";
import VisualizarPMOCCliente from "../components/pmoc/VisualizarPMOCCliente";
import PainelPMOCCliente from "../components/pmoc/PainelPMOCCliente";
import ExecutarManutencaoModal from "../components/pmoc/ExecutarManutencaoModal";
import CadernoManutencaoPDF from "../components/pmoc/CadernoManutencaoPDF";
import PlanoAnualPMOC from "../components/pmoc/PlanoAnualPMOC";
import { toast } from "@/components/ui/use-toast";
import { PageLoading } from "@/components/ui/page-loading";
import { ErrorState, PageHeader, PageShell } from "@/components/ui/page-shell";

export default function PMOCPage() {
  const [aprovandoManutencao, setAprovandoManutencao] = useState(null);
  const [visualizandoManutencao, setVisualizandoManutencao] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [clientePainelId, setClientePainelId] = useState("");
  const [executandoRodada, setExecutandoRodada] = useState(null);
  const [gerandoCadernoCliente, setGerandoCadernoCliente] = useState(null);
  const [vendoPlanoAnualCliente, setVendoPlanoAnualCliente] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // FILTRAR PMOCS POR EMPRESA E CLIENTE
  const { data: pmocs = [], isLoading: isLoadingPmocs, error: pmocsError, refetch: refetchPmocs } = useQuery({
    queryKey: ['pmocs', user?.empresa_id, filtroCliente],
    queryFn: async () => {
      if (!user) return [];
      
      const filters = { empresa_id: user.empresa_id };
      
      // Aplicar filtro de cliente se selecionado
      if (filtroCliente) {
        filters.cliente_id = filtroCliente;
      }
      
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        if (filtroCliente) {
          return base44.entities.PMOC.filter({ cliente_id: filtroCliente }, '-created_date');
        }
        return base44.entities.PMOC.list('-created_date');
      }
      
      return base44.entities.PMOC.filter(filters, '-created_date');
    },
    enabled: !!user
  });

  // Buscar manutenções aguardando aprovação
  const { data: manutencoesAguardandoAprovacao = [] } = useQuery({
    queryKey: ['manutencoes-aguardando-aprovacao', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.ManutencaoPMOC.filter({
          status: 'aguardando_aprovacao_empresa'
        }, '-data_execucao');
      }
      return base44.entities.ManutencaoPMOC.filter({
        empresa_id: user.empresa_id,
        status: 'aguardando_aprovacao_empresa'
      }, '-data_execucao');
    },
    enabled: !!user
  });

  // FILTRAR CLIENTES POR EMPRESA
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // FILTRAR TÉCNICOS POR EMPRESA
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // FILTRAR EQUIPAMENTOS POR EMPRESA
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded before fetching
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        return base44.entities.Equipamento.list();
      }
      return base44.entities.Equipamento.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // Buscar histórico de manutenções concluídas
  const { data: manutencoesConcluidas = [] } = useQuery({
    queryKey: ['manutencoes-concluidas', user?.empresa_id, filtroCliente],
    queryFn: async () => {
      if (!user) return [];
      
      const filters = {
        empresa_id: user.empresa_id,
        status: 'concluida'
      };
      
      if (filtroCliente) {
        filters.cliente_id = filtroCliente;
      }
      
      if ((user?.role === 'admin' && !user?.empresa_id)) {
        if (filtroCliente) {
          return base44.entities.ManutencaoPMOC.filter(
            { status: 'concluida', cliente_id: filtroCliente },
            '-data_execucao'
          );
        }
        return base44.entities.ManutencaoPMOC.filter(
          { status: 'concluida' },
          '-data_execucao'
        );
      }
      
      return base44.entities.ManutencaoPMOC.filter(filters, '-data_execucao');
    },
    enabled: !!user
  });

  // Cria o "cabeçalho" de PMOC do cliente na primeira rodada mensal — não há
  // mais tela de criação manual, isso é 100% automático (ver handleExecutarRodada).
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PMOC.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pmocs']);
    }
  });

  const deleteManutencaoMutation = useMutation({
    mutationFn: (id) => base44.entities.ManutencaoPMOC.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['manutencoes-concluidas']);
      queryClient.invalidateQueries(['pmocs']);
      toast({ description: "✅ Histórico de manutenção excluído com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao excluir manutenção:", error);
      toast({ description: "❌ Erro ao excluir histórico. Tente novamente.", variant: "destructive" });
    }
  });

  const handleAprovarManutencao = (manutencao) => {
    const pmoc = pmocs.find(p => p.id === manutencao.pmoc_id);
    const cliente = clientes.find(c => c.id === manutencao.cliente_id);
    const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
    const equipamentosManutencao = equipamentos.filter(e => 
      manutencao.equipamentos_ids?.includes(e.id)
    );

    setAprovandoManutencao({
      manutencao,
      pmoc,
      cliente,
      tecnico,
      equipamentos: equipamentosManutencao
    });
  };

  const handleVisualizarManutencao = (manutencao) => {
    const pmoc = pmocs.find(p => p.id === manutencao.pmoc_id);
    const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);
    const equipamentosManutencao = equipamentos.filter(e => 
      manutencao.equipamentos_ids?.includes(e.id)
    );

    setVisualizandoManutencao({
      manutencao,
      pmoc,
      tecnico,
      equipamentos: equipamentosManutencao
    });
  };

  const handleBaixarPDFManutencao = async (manutencao) => {
    // Abrir o modal de visualização que já tem o botão de baixar PDF
    handleVisualizarManutencao(manutencao);
  };

  const handleDeleteManutencao = (manutencao) => {
    const cliente = clientes.find(c => c.id === manutencao.cliente_id);
    const confirmar = window.confirm(
      `⚠️ Confirma a exclusão do histórico de manutenção?\n\nCliente: ${cliente?.nome || 'N/A'}\nData: ${manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}\n\n⚠️ ATENÇÃO: Esta ação irá excluir o histórico para a empresa, cliente e técnico.\n\nEsta ação não pode ser desfeita.`
    );
    
    if (confirmar) {
      deleteManutencaoMutation.mutate(manutencao.id);
    }
  };

  const clientePainel = clientes.find((c) => c.id === clientePainelId) || null;
  const equipamentosDoPainel = equipamentos.filter(
    (eq) => eq.cliente_id === clientePainelId && eq.pmoc_ativo
  );

  const handleExecutarRodada = async (cliente) => {
    try {
      // Reaproveita o "cabeçalho" de PMOC do cliente se já existir; senão
      // cria um novo — a lista de equipamentos do plano é sempre calculada
      // dinamicamente a partir do cadastro, não fica presa a este registro.
      let pmocDoCliente = pmocs.find((p) => p.cliente_id === cliente.id);
      if (!pmocDoCliente) {
        const mesReferencia = new Date();
        mesReferencia.setDate(1);
        pmocDoCliente = await createMutation.mutateAsync({
          cliente_id: cliente.id,
          empresa_id: user.empresa_id,
          mes_referencia: mesReferencia.toISOString().split('T')[0],
          data_execucao_programada: new Date().toISOString().split('T')[0],
        });
      }
      setExecutandoRodada({ pmoc: pmocDoCliente, cliente });
    } catch (error) {
      console.error("Erro ao preparar rodada mensal:", error);
      toast({ description: "❌ Erro ao iniciar a rodada mensal. Tente novamente.", variant: "destructive" });
    }
  };

  if (!user || isLoadingPmocs) return <PageLoading />;

  if (pmocsError) {
    return (
      <PageShell>
        <PageHeader title="PMOC" description="Planos de Manutenção, Operação e Controle" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar os dados de PMOC"
          description="Os registros não foram alterados. Tente carregar a página novamente."
          onRetry={refetchPmocs}
        />
      </PageShell>
    );
  }

  if (executandoRodada) {
    return (
      <ExecutarManutencaoModal
        pmoc={executandoRodada.pmoc}
        cliente={executandoRodada.cliente}
        onClose={() => {
          setExecutandoRodada(null);
          queryClient.invalidateQueries(['pmocs']);
          queryClient.invalidateQueries(['equipamentos']);
        }}
      />
    );
  }

  if (gerandoCadernoCliente) {
    const equipamentosCaderno = equipamentos.filter(
      (eq) => eq.cliente_id === gerandoCadernoCliente.id && eq.pmoc_ativo
    );
    return (
      <CadernoManutencaoPDF
        cliente={gerandoCadernoCliente}
        equipamentos={equipamentosCaderno}
        onClose={() => setGerandoCadernoCliente(null)}
      />
    );
  }

  if (vendoPlanoAnualCliente) {
    const equipamentosPlano = equipamentos.filter(
      (eq) => eq.cliente_id === vendoPlanoAnualCliente.id && eq.pmoc_ativo
    );
    const pmocDoCliente = pmocs.find((p) => p.cliente_id === vendoPlanoAnualCliente.id);
    return (
      <PlanoAnualPMOC
        cliente={vendoPlanoAnualCliente}
        equipamentos={equipamentosPlano}
        empresaId={user?.empresa_id}
        pmocId={pmocDoCliente?.id}
        onClose={() => {
          setVendoPlanoAnualCliente(null);
          queryClient.invalidateQueries(['agenda-eventos']);
        }}
      />
    );
  }

  if (aprovandoManutencao) {
    return (
      <AprovarPMOCEmpresa
        manutencao={aprovandoManutencao.manutencao}
        pmoc={aprovandoManutencao.pmoc}
        cliente={aprovandoManutencao.cliente}
        tecnico={aprovandoManutencao.tecnico}
        equipamentos={aprovandoManutencao.equipamentos}
        onClose={() => setAprovandoManutencao(null)}
      />
    );
  }

  if (visualizandoManutencao) {
    return (
      <VisualizarPMOCCliente
        manutencao={visualizandoManutencao.manutencao}
        pmoc={visualizandoManutencao.pmoc}
        tecnico={visualizandoManutencao.tecnico}
        equipamentos={visualizandoManutencao.equipamentos}
        onClose={() => setVisualizandoManutencao(null)}
      />
    );
  }

  return (
    <PageShell>
      <PageHeader title="PMOC" description="Planos de Manutenção, Operação e Controle" backTo={createPageUrl("Dashboard")} eyebrow="Rotina preventiva" />

        {/* Painel dinâmico por cliente — todos os equipamentos, cada um com sua
            própria periodicidade, sem precisar recriar PMOCs manualmente */}
        <Card className="mb-8 shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardTitle>🏢 Painel de Equipamentos por Cliente</CardTitle>
            <div className="mt-2 max-w-md">
              <Label htmlFor="cliente-painel-pmoc">Cliente</Label>
              <select
                id="cliente-painel-pmoc"
                value={clientePainelId}
                onChange={(e) => setClientePainelId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="">Selecione um cliente para ver o plano de PMOC</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                ))}
              </select>
            </div>
          </CardHeader>
        </Card>

        {clientePainel && (
          <PainelPMOCCliente
            cliente={clientePainel}
            equipamentos={equipamentosDoPainel}
            empresaId={user?.empresa_id}
            onExecutarRodada={handleExecutarRodada}
            onGerarCaderno={setGerandoCadernoCliente}
            onVerPlanoAnual={setVendoPlanoAnualCliente}
          />
        )}

        {/* Seção de PMOCs aguardando aprovação */}
        {manutencoesAguardandoAprovacao.length > 0 && (
          <Card className="mb-8 shadow-lg border-2 border-orange-200 bg-orange-50">
            <CardHeader className="bg-orange-100 border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <CardTitle className="text-orange-900">
                    PMOCs Aguardando Aprovação ({manutencoesAguardandoAprovacao.length})
                  </CardTitle>
                </div>
                <Badge className="bg-orange-600 text-white">
                  Ação Necessária
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-orange-200">
                {manutencoesAguardandoAprovacao.map((manutencao) => {
                  const cliente = clientes.find(c => c.id === manutencao.cliente_id);
                  const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);

                  return (
                    <div key={manutencao.id} className="p-4 hover:bg-orange-100 transition-colors">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {cliente?.nome || 'Cliente não identificado'}
                            </h3>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>🔧 Técnico: {tecnico?.nome || 'Não atribuído'}</p>
                            <p>📅 Executado em: {manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}</p>
                            <p>🏢 Equipamentos: {manutencao.equipamentos_ids?.length || 0}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAprovarManutencao(manutencao)}
                          className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
                        >
                          Revisar e Aprovar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seção de Histórico de PMOCs Concluídos */}
        <Card className="mb-8 shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                📋 Histórico de PMOCs Concluídos
              </CardTitle>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="w-full sm:w-64">
                  <Label htmlFor="filtro-cliente-historico" className="sr-only">Filtrar por cliente</Label>
                  <select
                    id="filtro-cliente-historico"
                    aria-label="Filtrar histórico por cliente"
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors"
                  >
                    <option value="">Todos os Clientes</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {manutencoesConcluidas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {filtroCliente 
                  ? "Nenhum PMOC concluído para este cliente" 
                  : "Nenhum PMOC concluído ainda"}
              </div>
            ) : (
              <div className="divide-y">
                {manutencoesConcluidas.map((manutencao) => {
                  const cliente = clientes.find(c => c.id === manutencao.cliente_id);
                  const tecnico = tecnicos.find(t => t.id === manutencao.tecnico_id);

                  return (
                    <div key={manutencao.id} className="p-4 hover:bg-muted transition-colors">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {cliente?.nome || 'Cliente não identificado'}
                            </h3>
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Concluído
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>🔧 Técnico: {tecnico?.nome || 'Não identificado'}</p>
                            <p>📅 Executado em: {manutencao.data_execucao ? format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</p>
                            <p>🏢 Equipamentos: {manutencao.equipamentos_ids?.length || 0}</p>
                            {manutencao.data_aprovacao_empresa && (
                              <p>✅ Aprovado em: {format(new Date(manutencao.data_aprovacao_empresa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Button
                            onClick={() => handleVisualizarManutencao(manutencao)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            👁️ Ver
                          </Button>
                          <Button
                            onClick={() => handleBaixarPDFManutencao(manutencao)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                          <Button
                            onClick={() => handleDeleteManutencao(manutencao)}
                            variant="outline"
                            size="sm"
                            disabled={deleteManutencaoMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deleteManutencaoMutation.isPending ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <>🗑️</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
    </PageShell>
  );
}
