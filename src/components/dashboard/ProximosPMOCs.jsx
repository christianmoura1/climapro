import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMonths } from "date-fns";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { statusManutencao, STATUS_MANUTENCAO_CONFIG } from "@/lib/pmocChecklist";

const ORDEM_STATUS = { atrasado: 0, vence_em_breve: 1, nunca_executado: 2, em_dia: 3 };

function parseDataLocal(valor) {
  return valor ? new Date(`${valor.slice(0, 10)}T00:00:00`) : null;
}

// Próximas visitas do PMOC por EQUIPAMENTO (modelo atual: todo equipamento
// ativo tem checagem mensal; a próxima visita é sempre a próxima rodada
// mensal do cliente) — substitui o widget antigo baseado no registro "pmoc"
// legado, cujo status vivia em "aguardando execução" por design.
export default function ProximosPMOCs({ equipamentos = [], clientes = [] }) {
  const clientePorId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const itens = equipamentos
    .map((eq) => {
      const proxima = eq.proxima_manutencao
        ? parseDataLocal(eq.proxima_manutencao)
        : (eq.ultima_manutencao ? addMonths(parseDataLocal(eq.ultima_manutencao), 1) : null);
      return {
        equipamento: eq,
        cliente: clientePorId[eq.cliente_id],
        proxima,
        status: statusManutencao(eq.proxima_manutencao, eq.ultima_manutencao),
      };
    })
    .sort((a, b) => {
      const porStatus = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status];
      if (porStatus !== 0) return porStatus;
      return (a.proxima?.getTime() || Infinity) - (b.proxima?.getTime() || Infinity);
    })
    .slice(0, 5);

  return (
    <Card className="shadow-sm border-none rounded-xl">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">Próximas Manutenções PMOC</CardTitle>
          <Link to={createPageUrl("PMOC")}>
            <span className="text-sm text-primary font-medium hover:underline">Ver todos</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {itens.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum equipamento no PMOC"
            description='Ligue o toggle "Incluir no PMOC" em um equipamento para acompanhar aqui.'
          />
        ) : (
          <div className="divide-y">
            {itens.map(({ equipamento, cliente, proxima, status }) => (
              <div key={equipamento.id} className="p-4 hover:bg-muted/60 transition-colors">
                <div className="flex justify-between items-start mb-1 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground text-sm truncate">
                      {equipamento.numero_equipamento || equipamento.modelo}
                      {cliente ? ` — ${cliente.nome}` : ''}
                    </span>
                  </div>
                  <Badge variant="outline" className={`${STATUS_MANUTENCAO_CONFIG[status].cor} shrink-0`}>
                    {STATUS_MANUTENCAO_CONFIG[status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {proxima
                    ? `Próxima visita: ${format(proxima, "dd/MM/yyyy")}`
                    : 'Nenhuma visita registrada ainda'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
