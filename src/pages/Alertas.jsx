import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarClock,
  Cpu,
  FileSignature,
  UserX,
  Check,
  BellOff,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PageLoading } from "@/components/ui/page-loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useAlertas } from "@/hooks/useAlertas";

// Para onde o alerta leva. Alerta que não tem para onde ir vira só reclamação:
// o valor está em abrir já na tela onde dá para resolver.
const CONFIG_TIPO = {
  pmoc_atrasado: { icone: CalendarClock, rotulo: 'PMOC atrasado', pagina: 'PMOC' },
  pmoc_proximo: { icone: CalendarClock, rotulo: 'Visita chegando', pagina: 'PMOC' },
  equipamento_recorrente: { icone: Cpu, rotulo: 'Equipamento repetindo defeito', pagina: 'Equipamentos' },
  orcamento_parado: { icone: FileSignature, rotulo: 'Orçamento sem resposta', pagina: 'Orcamentos' },
  cliente_sumido: { icone: UserX, rotulo: 'Cliente sem movimento', pagina: 'Clientes' },
};

const CONFIG_SEVERIDADE = {
  alta: { cor: 'border-red-300 bg-red-50', badge: 'bg-red-600 text-white', rotulo: 'Alta' },
  media: { cor: 'border-amber-300 bg-amber-50', badge: 'bg-amber-500 text-white', rotulo: 'Média' },
  baixa: { cor: 'border-border bg-card', badge: 'bg-muted text-foreground', rotulo: 'Baixa' },
};

const ORDEM_SEVERIDADE = { alta: 0, media: 1, baixa: 2 };

export default function Alertas() {
  const { alertas, abertos, isLoading, mudarStatus } = useAlertas();
  const [verResolvidos, setVerResolvidos] = useState(false);

  if (isLoading) return <PageLoading />;

  const lista = (verResolvidos
    ? alertas.filter((a) => a.status === 'resolvido' || a.status === 'dispensado')
    : abertos
  ).sort((a, b) => {
    const porSeveridade = ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade];
    if (porSeveridade !== 0) return porSeveridade;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <PageShell>
      <PageHeader
        title="Alertas"
        eyebrow="Atenção"
        description={
          abertos.length > 0
            ? `${abertos.length} ponto(s) esperando uma decisão sua`
            : 'Nada pedindo atenção agora'
        }
        backTo={createPageUrl("Dashboard")}
        actions={
          <Button variant="outline" onClick={() => setVerResolvidos((v) => !v)} className="w-full sm:w-auto">
            {verResolvidos ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
            {verResolvidos ? 'Ver abertos' : 'Ver encerrados'}
          </Button>
        }
      />

      {lista.length === 0 ? (
        <Card className="shadow-sm border-none rounded-xl">
          <EmptyState
            icon={AlertTriangle}
            title={verResolvidos ? 'Nenhum alerta encerrado' : 'Nada pedindo atenção'}
            description={
              verResolvidos
                ? 'Alertas que você resolveu ou dispensou aparecem aqui.'
                : 'O sistema revisa PMOC atrasado, equipamento repetindo defeito, orçamento parado e cliente sem movimento uma vez por dia. Quando algo aparecer, você vê aqui.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((alerta) => {
            const tipo = CONFIG_TIPO[alerta.tipo] || { icone: AlertTriangle, rotulo: alerta.tipo, pagina: 'Dashboard' };
            const sev = CONFIG_SEVERIDADE[alerta.severidade] || CONFIG_SEVERIDADE.baixa;
            const Icone = tipo.icone;
            const encerrado = alerta.status === 'resolvido' || alerta.status === 'dispensado';

            return (
              <Card key={alerta.id} className={`border-2 shadow-sm ${encerrado ? 'border-border bg-muted/30' : sev.cor}`}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-1 items-start gap-3">
                    <Icone className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" aria-hidden="true" />
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{alerta.titulo}</p>
                        {!encerrado && <Badge className={sev.badge}>{sev.rotulo}</Badge>}
                        {alerta.status === 'novo' && (
                          <Badge variant="outline" className="border-indigo-300 text-indigo-700">novo</Badge>
                        )}
                        {alerta.status === 'dispensado' && (
                          <Badge variant="outline" className="text-muted-foreground">dispensado</Badge>
                        )}
                        {alerta.status === 'resolvido' && (
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700">resolvido</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80">{alerta.descricao}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tipo.rotulo} · detectado em {format(new Date(alerta.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {!encerrado && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="bg-card">
                        <Link
                          to={createPageUrl(tipo.pagina)}
                          onClick={() => {
                            if (alerta.status === 'novo') {
                              mudarStatus.mutate({ id: alerta.id, status: 'lido' });
                            }
                          }}
                        >
                          Resolver
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => mudarStatus.mutate({ id: alerta.id, status: 'resolvido' })}
                        aria-label={`Marcar como resolvido: ${alerta.titulo}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => mudarStatus.mutate({ id: alerta.id, status: 'dispensado' })}
                        aria-label={`Dispensar: ${alerta.titulo}`}
                      >
                        <BellOff className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        A revisão roda uma vez por dia, de manhã. Alerta dispensado não volta, e alerta que
        deixou de fazer sentido se fecha sozinho.
      </p>
    </PageShell>
  );
}
