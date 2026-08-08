import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, AlertTriangle, Package, Wallet } from "lucide-react";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";
import { ErrorState, FilterEmptyState, PageHeader, PageShell } from "@/components/ui/page-shell";

import PecaForm, { CATEGORIAS_PECA } from "../components/estoque/PecaForm";
import PecasList, { estoqueBaixo } from "../components/estoque/PecasList";
import MovimentacaoModal from "../components/estoque/MovimentacaoModal";
import HistoricoPeca from "../components/estoque/HistoricoPeca";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function EstoquePage() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [movimentando, setMovimentando] = useState(null);
  const [vendoHistorico, setVendoHistorico] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [soReposicao, setSoReposicao] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const ehAdminGlobal = user?.role === 'admin' && !user?.empresa_id;

  const { data: pecas = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pecas', user?.empresa_id],
    queryFn: () => (ehAdminGlobal
      ? base44.entities.Peca.list('nome')
      : base44.entities.Peca.filter({ empresa_id: user.empresa_id }, 'nome')),
    enabled: !!user,
  });

  // Chamados abertos, para vincular a baixa da peça ao atendimento.
  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados-abertos-estoque', user?.empresa_id],
    queryFn: async () => {
      const todos = ehAdminGlobal
        ? await base44.entities.Chamado.list('-created_date', 100)
        : await base44.entities.Chamado.filter({ empresa_id: user.empresa_id }, '-created_date', 100);
      return todos.filter((c) => c.status !== 'cancelado');
    },
    enabled: !!user,
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: () => (ehAdminGlobal
      ? base44.entities.Tecnico.list()
      : base44.entities.Tecnico.filter({ empresa_id: user.empresa_id })),
    enabled: !!user,
  });

  const { data: movimentacoes = [], isLoading: carregandoMovs } = useQuery({
    queryKey: ['movimentacoes-peca', vendoHistorico?.id],
    queryFn: () => base44.entities.MovimentacaoPeca.filter(
      { peca_id: vendoHistorico.id },
      '-data_movimentacao'
    ),
    enabled: !!vendoHistorico,
  });

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ['pecas'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes-peca'] });
  };

  const createMutation = useMutation({
    mutationFn: (dados) => base44.entities.Peca.create({ ...dados, empresa_id: user.empresa_id }),
    onSuccess: () => {
      invalidarTudo();
      setShowForm(false);
      toast({ description: "✅ Peça cadastrada!", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao cadastrar: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dados }) => {
      // custo_medio é mantido pelo trigger a partir das entradas; mandar daqui
      // sobrescreveria a média ponderada com o valor que estava na tela.
      const { custo_medio, ...resto } = dados;
      return base44.entities.Peca.update(id, resto);
    },
    onSuccess: () => {
      invalidarTudo();
      setShowForm(false);
      setEditando(null);
      toast({ description: "✅ Peça atualizada!", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao salvar: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Peca.delete(id),
    onSuccess: () => {
      invalidarTudo();
      toast({ description: "✅ Peça excluída.", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao excluir: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const movimentarMutation = useMutation({
    mutationFn: (dados) => base44.entities.MovimentacaoPeca.create({ ...dados, empresa_id: user.empresa_id }),
    onSuccess: () => {
      invalidarTudo();
      setMovimentando(null);
      toast({ description: "✅ Movimentação registrada!", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao movimentar: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const excluirMovMutation = useMutation({
    mutationFn: (id) => base44.entities.MovimentacaoPeca.delete(id),
    onSuccess: () => {
      invalidarTudo();
      toast({ description: "✅ Movimentação excluída e saldo ajustado.", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao excluir: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const handleSubmit = (dados) => {
    if (editando) updateMutation.mutate({ id: editando.id, dados });
    else createMutation.mutate(dados);
  };

  const handleDelete = (peca) => {
    if (confirm(`Excluir "${peca.nome}"?\n\n⚠️ O histórico de movimentações também será apagado. Se quiser só tirar da lista, edite e desmarque "Item ativo".`)) {
      deleteMutation.mutate(peca.id);
    }
  };

  const filtradas = pecas.filter((p) => {
    const termo = busca.toLowerCase();
    const casaBusca = !termo
      || p.nome?.toLowerCase().includes(termo)
      || p.codigo?.toLowerCase().includes(termo)
      || p.localizacao?.toLowerCase().includes(termo);
    const casaCategoria = !filtroCategoria || p.categoria === filtroCategoria;
    const casaReposicao = !soReposicao || estoqueBaixo(p);
    return casaBusca && casaCategoria && casaReposicao;
  });

  if (!user) return <PageLoading />;

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Estoque" description="Peças e materiais" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar o estoque"
          description="Os registros continuam salvos. Verifique a conexão e tente novamente."
          onRetry={refetch}
        />
      </PageShell>
    );
  }

  const ativas = pecas.filter((p) => p.ativo);
  const precisamRepor = ativas.filter(estoqueBaixo);
  const valorEmEstoque = ativas.reduce(
    (soma, p) => soma + (Number(p.saldo_atual) || 0) * (Number(p.custo_medio) || 0),
    0
  );

  return (
    <PageShell>
      <PageHeader
        title="Estoque"
        eyebrow="Peças e materiais"
        description={`${ativas.length} ${ativas.length === 1 ? 'item ativo' : 'itens ativos'}`}
        backTo={createPageUrl("Dashboard")}
        actions={
          <Button
            onClick={() => { setShowForm(!showForm); setEditando(null); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Peça
          </Button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm border-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Itens ativos</p>
              <p className="text-2xl font-bold text-foreground">{ativas.length}</p>
            </div>
            <Package className="w-8 h-8 text-indigo-500" />
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-none ${precisamRepor.length > 0 ? 'ring-2 ring-amber-300' : ''}`}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Precisam repor</p>
              <p className={`text-2xl font-bold ${precisamRepor.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {precisamRepor.length}
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${precisamRepor.length > 0 ? 'text-amber-500' : 'text-muted-foreground/40'}`} />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor em estoque</p>
              <p className="text-2xl font-bold text-green-700">{moeda(valorEmEstoque)}</p>
            </div>
            <Wallet className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <PecaForm
          peca={editando}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditando(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <label htmlFor="busca-pecas" className="sr-only">Buscar peças</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            id="busca-pecas"
            placeholder="Buscar por nome, código ou local..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtro-categoria">Categoria</Label>
          <select
            id="filtro-categoria"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORIAS_PECA).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant={soReposicao ? "default" : "outline"}
            className={`w-full ${soReposicao ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            onClick={() => setSoReposicao(!soReposicao)}
            aria-pressed={soReposicao}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {soReposicao ? 'Mostrando só reposição' : 'Só o que precisa repor'}
          </Button>
        </div>
      </div>

      {!isLoading && pecas.length > 0 && filtradas.length === 0 ? (
        <Card className="shadow-sm">
          <FilterEmptyState onClear={() => { setBusca(""); setFiltroCategoria(""); setSoReposicao(false); }} />
        </Card>
      ) : (
        <PecasList
          pecas={filtradas}
          isLoading={isLoading}
          onMovimentar={setMovimentando}
          onEdit={(p) => { setEditando(p); setShowForm(true); }}
          onDelete={handleDelete}
          onHistorico={setVendoHistorico}
        />
      )}

      {movimentando && (
        <MovimentacaoModal
          peca={movimentando}
          chamados={chamados}
          tecnicos={tecnicos}
          onConfirmar={(dados) => movimentarMutation.mutate(dados)}
          onClose={() => setMovimentando(null)}
          isLoading={movimentarMutation.isPending}
        />
      )}

      {vendoHistorico && (
        <HistoricoPeca
          peca={pecas.find((p) => p.id === vendoHistorico.id) || vendoHistorico}
          movimentacoes={movimentacoes}
          chamados={chamados}
          tecnicos={tecnicos}
          isLoading={carregandoMovs}
          onExcluir={(mov) => {
            if (confirm('Excluir esta movimentação? O saldo será ajustado de volta.')) {
              excluirMovMutation.mutate(mov.id);
            }
          }}
          onClose={() => setVendoHistorico(null)}
        />
      )}
    </PageShell>
  );
}
