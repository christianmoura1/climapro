import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, CreditCard, Star, Users, Building2, ClipboardList } from "lucide-react";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PLANOS, nomeDoPlano, ehIlimitado, formatarLimite, ILIMITADO } from "@/lib/planos";
import { chamadosDoMes } from "@/lib/limitesPlano";

export default function PlanosPage() {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [processando, setProcessando] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.empresa_id) {
          const empresas = await base44.entities.Empresa.list();
          setEmpresa(empresas.find((e) => e.id === currentUser.empresa_id) || null);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    carregar();
  }, []);

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', empresa?.id],
    queryFn: () => base44.entities.Tecnico.filter({ empresa_id: empresa.id }),
    enabled: !!empresa,
  });

  // Clientes com PMOC: os que têm ao menos um equipamento no plano. É o
  // limite que separa o Free (1 cliente) dos planos pagos.
  // Consumo do mês, para o Free enxergar quanto falta para o teto.
  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados-empresa-planos', empresa?.id],
    queryFn: () => base44.entities.Chamado.filter({ empresa_id: empresa.id }),
    enabled: !!empresa?.id,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-empresa-planos', empresa?.id],
    queryFn: () => base44.entities.Cliente.filter({ empresa_id: empresa.id }),
    enabled: !!empresa?.id,
  });

  const { data: clientesComPmoc = 0 } = useQuery({
    queryKey: ['clientes-com-pmoc', empresa?.id],
    queryFn: async () => {
      const equipamentos = await base44.entities.Equipamento.filter({ empresa_id: empresa.id });
      return new Set(equipamentos.filter((e) => e.pmoc_ativo).map((e) => e.cliente_id)).size;
    },
    enabled: !!empresa,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'sucesso') {
      toast({ description: '🎉 Pagamento confirmado! Seu plano será ativado em instantes.', variant: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkout === 'cancelado') {
      toast({ description: 'Pagamento cancelado. Você pode tentar novamente quando quiser.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Quem já tem assinatura passa pelo Portal de Cobrança para trocar de plano;
  // criar um checkout novo geraria uma segunda assinatura e cobrança dupla.
  const assinar = async (plano) => {
    setProcessando(plano.id);
    try {
      if (empresa?.stripe_subscription_id) {
        const data = await invokeEdgeFunction('portal-cobranca', {});
        window.location.href = data.url;
        return;
      }
      if (plano.id === 'free') {
        toast({ description: 'O Free não exige pagamento — é só usar.' });
        return;
      }
      const data = await invokeEdgeFunction('criar-checkout', { plano: plano.id });
      window.location.href = data.url;
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error);
      toast({ description: `Erro ao iniciar o pagamento: ${error.message || 'tente novamente.'}`, variant: 'destructive' });
    } finally {
      setProcessando(null);
    }
  };

  const abrirPortal = async () => {
    setProcessando('portal');
    try {
      const data = await invokeEdgeFunction('portal-cobranca', {});
      window.location.href = data.url;
    } catch (error) {
      console.error('Erro ao abrir portal:', error);
      toast({ description: `Erro ao abrir o portal: ${error.message || 'tente novamente.'}`, variant: 'destructive' });
      setProcessando(null);
    }
  };

  if (!user) return <PageLoading />;

  const planoAtualId = empresa?.plano || 'free';
  const limiteTecnicos = empresa?.limite_tecnicos ?? 1;
  const limitePmoc = empresa?.limite_clientes_pmoc ?? 1;

  const limiteChamados = empresa?.limite_chamados_mes ?? ILIMITADO;
  const limiteClientes = empresa?.limite_clientes ?? ILIMITADO;
  const chamadosNoMes = chamadosDoMes(chamados);

  const estourouTecnicos = !ehIlimitado(limiteTecnicos) && tecnicos.length >= limiteTecnicos;
  const estourouPmoc = !ehIlimitado(limitePmoc) && clientesComPmoc >= limitePmoc;
  const estourouChamados = !ehIlimitado(limiteChamados) && chamadosNoMes >= limiteChamados;
  const estourouClientes = !ehIlimitado(limiteClientes) && clientes.length >= limiteClientes;

  return (
    <PageShell>
      <PageHeader
        title="Planos"
        eyebrow="Assinatura"
        description={`Você está no plano ${nomeDoPlano(planoAtualId)}`}
        backTo={createPageUrl("Dashboard")}
        actions={empresa?.stripe_subscription_id ? (
          <Button variant="outline" onClick={abrirPortal} disabled={processando === 'portal'} className="w-full sm:w-auto">
            <CreditCard className="w-4 h-4 mr-2" />
            {processando === 'portal' ? 'Abrindo...' : 'Gerenciar assinatura'}
          </Button>
        ) : null}
      />

      {(estourouTecnicos || estourouPmoc || estourouChamados || estourouClientes) && (
        <Card className="mb-6 border-2 border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Seu plano chegou no limite</p>
              <p className="mt-1">
                {estourouChamados && `Você abriu ${chamadosNoMes} de ${formatarLimite(limiteChamados)} chamados deste mês. `}
                {estourouClientes && `Você tem ${clientes.length} de ${formatarLimite(limiteClientes)} clientes. `}
                {estourouTecnicos && `Você usa ${tecnicos.length} de ${formatarLimite(limiteTecnicos)} técnicos. `}
                {estourouPmoc && `Você tem PMOC em ${clientesComPmoc} de ${formatarLimite(limitePmoc)} cliente(s). `}
                Suba de plano para continuar cadastrando.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {empresa && (
        <div className="grid gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="shadow-sm border-none">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Plano atual</p>
              <p className="text-xl font-bold text-foreground">{nomeDoPlano(planoAtualId)}</p>
              {empresa.data_vencimento_plano && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renova em {new Date(`${empresa.data_vencimento_plano}T12:00:00`).toLocaleDateString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>

          {!ehIlimitado(limiteChamados) && (
            <Card className="shadow-sm border-none">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chamados neste mês</p>
                  <p className={`text-xl font-bold ${estourouChamados ? 'text-amber-600' : 'text-foreground'}`}>
                    {chamadosNoMes} / {formatarLimite(limiteChamados)}
                  </p>
                </div>
                <ClipboardList className="w-7 h-7 text-blue-400" />
              </CardContent>
            </Card>
          )}

          {!ehIlimitado(limiteClientes) && (
            <Card className="shadow-sm border-none">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className={`text-xl font-bold ${estourouClientes ? 'text-amber-600' : 'text-foreground'}`}>
                    {clientes.length} / {formatarLimite(limiteClientes)}
                  </p>
                </div>
                <Building2 className="w-7 h-7 text-emerald-400" />
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-none">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Técnicos</p>
                <p className={`text-xl font-bold ${estourouTecnicos ? 'text-amber-600' : 'text-foreground'}`}>
                  {tecnicos.length} / {formatarLimite(limiteTecnicos)}
                </p>
              </div>
              <Users className="w-7 h-7 text-indigo-400" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes com PMOC</p>
                <p className={`text-xl font-bold ${estourouPmoc ? 'text-amber-600' : 'text-foreground'}`}>
                  {clientesComPmoc} / {formatarLimite(limitePmoc)}
                </p>
              </div>
              <Building2 className="w-7 h-7 text-purple-400" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLANOS.map((plano) => {
          const atual = plano.id === planoAtualId;
          return (
            <Card
              key={plano.id}
              className={`relative flex flex-col shadow-lg ${
                plano.destaque ? 'border-2 border-indigo-600' : 'border-none'
              } ${atual ? 'ring-2 ring-green-500' : ''}`}
            >
              {plano.destaque && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Mais escolhido
                </Badge>
              )}
              {atual && (
                <Badge className="absolute -top-3 right-4 bg-green-600 text-white">Seu plano</Badge>
              )}

              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{plano.nome}</CardTitle>
                <p className="text-3xl font-bold text-foreground mt-2">{plano.preco}</p>
                <p className="text-sm text-muted-foreground mt-1">{plano.resumo}</p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1">
                  {plano.inclui.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                  {plano.naoInclui.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-5 ${plano.destaque ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  variant={plano.destaque ? 'default' : 'outline'}
                  disabled={atual || processando === plano.id}
                  onClick={() => assinar(plano)}
                >
                  {atual
                    ? 'Plano atual'
                    : processando === plano.id
                      ? 'Abrindo...'
                      : plano.id === 'free'
                        ? 'Gratuito'
                        : empresa?.stripe_subscription_id
                          ? 'Trocar para este plano'
                          : 'Assinar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Precisa de mais de 10 técnicos ou de algo específico?{' '}
        <a
          href={`https://wa.me/5541992572743?text=${encodeURIComponent(`Olá! Queria falar sobre um plano maior para a ${empresa?.nome || 'minha empresa'}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline"
        >
          Fale com a gente
        </a>
        .
      </p>
    </PageShell>
  );
}
