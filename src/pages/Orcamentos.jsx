import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";
import { ErrorState, FilterEmptyState, PageHeader, PageShell } from "@/components/ui/page-shell";

import OrcamentoForm from "../components/orcamentos/OrcamentoForm";
import OrcamentosList, { STATUS_ORCAMENTO, statusEfetivo } from "../components/orcamentos/OrcamentosList";

export default function OrcamentosPage() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const ehAdminGlobal = user?.role === 'admin' && !user?.empresa_id;

  const { data: orcamentos = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orcamentos', user?.empresa_id],
    queryFn: () => (ehAdminGlobal
      ? base44.entities.Orcamento.list('-created_date')
      : base44.entities.Orcamento.filter({ empresa_id: user.empresa_id }, '-created_date')),
    enabled: !!user,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: () => (ehAdminGlobal
      ? base44.entities.Cliente.list()
      : base44.entities.Cliente.filter({ empresa_id: user.empresa_id })),
    enabled: !!user,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['orcamentos'] });

  const createMutation = useMutation({
    mutationFn: (dados) => base44.entities.Orcamento.create({ ...dados, empresa_id: user.empresa_id }),
    onSuccess: () => {
      invalidar();
      setShowForm(false);
      toast({ description: "✅ Orçamento criado! Envie o link para o cliente aprovar.", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao criar: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Orcamento.update(id, dados),
    onSuccess: () => {
      invalidar();
      setShowForm(false);
      setEditando(null);
      toast({ description: "✅ Orçamento atualizado!", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao salvar: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Orcamento.delete(id),
    onSuccess: () => {
      invalidar();
      toast({ description: "✅ Orçamento excluído.", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao excluir: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  // Publica o link: só a partir daqui a Edge Function pública devolve o
  // orçamento (rascunho fica invisível para quem tiver o token).
  const enviarMutation = useMutation({
    mutationFn: (orcamento) => base44.entities.Orcamento.update(orcamento.id, {
      status: 'enviado',
      data_envio: new Date().toISOString(),
    }),
    onSuccess: (_, orcamento) => {
      invalidar();
      copiarLink(orcamento);
      toast({ description: "✅ Orçamento liberado e link copiado. Mande para o cliente.", variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao enviar: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const gerarChamadoMutation = useMutation({
    mutationFn: async (orcamento) => {
      const chamado = await base44.entities.Chamado.create({
        empresa_id: orcamento.empresa_id,
        cliente_id: orcamento.cliente_id,
        equipamentos_ids: orcamento.equipamentos_ids || [],
        numero_chamado: `CH${Date.now()}`,
        titulo: orcamento.titulo,
        descricao: `Orçamento ${orcamento.numero_orcamento} aprovado por ${orcamento.nome_aprovador || 'cliente'}.\n\n${orcamento.descricao || ''}`.trim(),
        tipo_problema: 'manutencao_corretiva',
        prioridade: 'media',
        status: 'pendente',
        valor_servico: orcamento.valor_total,
      });
      await base44.entities.Orcamento.update(orcamento.id, { chamado_gerado_id: chamado.id });
      return chamado;
    },
    onSuccess: (chamado) => {
      invalidar();
      toast({ description: `✅ Chamado ${chamado.numero_chamado} criado a partir do orçamento.`, variant: "success" });
    },
    onError: (e) => toast({ description: `❌ Erro ao gerar chamado: ${e.message || 'tente novamente.'}`, variant: "destructive" }),
  });

  const copiarLink = (orcamento) => {
    const url = `${window.location.origin}/orcamento/${orcamento.token_publico}`;
    navigator.clipboard?.writeText(url).then(
      () => toast({ description: "🔗 Link copiado para a área de transferência.", variant: "success" }),
      () => window.prompt("Copie o link do orçamento:", url)
    );
  };

  const handleSubmit = (dados) => {
    if (editando) updateMutation.mutate({ id: editando.id, dados });
    else createMutation.mutate(dados);
  };

  const handleDelete = (orcamento) => {
    if (confirm(`Excluir o orçamento ${orcamento.numero_orcamento}?\n\n⚠️ Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(orcamento.id);
    }
  };

  const filtrados = orcamentos.filter((o) => {
    const cliente = clientes.find((c) => c.id === o.cliente_id);
    const termo = busca.toLowerCase();
    const casaBusca = !termo
      || o.titulo?.toLowerCase().includes(termo)
      || o.numero_orcamento?.toLowerCase().includes(termo)
      || cliente?.nome?.toLowerCase().includes(termo);
    const casaStatus = !filtroStatus || statusEfetivo(o) === filtroStatus;
    return casaBusca && casaStatus;
  });

  if (!user) return <PageLoading />;

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Orçamentos" description="Propostas enviadas aos clientes" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar os orçamentos"
          description="Os registros continuam salvos. Verifique a conexão e tente novamente."
          onRetry={refetch}
        />
      </PageShell>
    );
  }

  const aguardando = orcamentos.filter((o) => statusEfetivo(o) === 'enviado').length;

  return (
    <PageShell>
      <PageHeader
        title="Orçamentos"
        eyebrow="Comercial"
        description={
          aguardando > 0
            ? `${orcamentos.length} orçamento${orcamentos.length !== 1 ? 's' : ''} · ${aguardando} aguardando resposta do cliente`
            : `${orcamentos.length} orçamento${orcamentos.length !== 1 ? 's' : ''}`
        }
        backTo={createPageUrl("Dashboard")}
        actions={
          <Button
            onClick={() => { setShowForm(!showForm); setEditando(null); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Orçamento
          </Button>
        }
      />

      {showForm && (
        <OrcamentoForm
          orcamento={editando}
          clientes={clientes}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditando(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <label htmlFor="busca-orcamentos" className="sr-only">Buscar orçamentos</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            id="busca-orcamentos"
            placeholder="Buscar por número, título ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-status-orcamentos">Status</Label>
          <select
            id="filtro-status-orcamentos"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_ORCAMENTO).map(([valor, cfg]) => (
              <option key={valor} value={valor}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!isLoading && orcamentos.length > 0 && filtrados.length === 0 ? (
        <Card className="shadow-sm">
          <FilterEmptyState onClear={() => { setBusca(""); setFiltroStatus(""); }} />
        </Card>
      ) : (
        <OrcamentosList
          orcamentos={filtrados}
          clientes={clientes}
          isLoading={isLoading}
          onEdit={(o) => { setEditando(o); setShowForm(true); }}
          onDelete={handleDelete}
          onEnviar={(o) => enviarMutation.mutate(o)}
          onCopiarLink={copiarLink}
          onGerarChamado={(o) => gerarChamadoMutation.mutate(o)}
        />
      )}
    </PageShell>
  );
}
