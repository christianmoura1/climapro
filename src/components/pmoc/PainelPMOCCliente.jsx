import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlayCircle, BookOpen, Cpu, CalendarRange } from "lucide-react";
import {
  LABEL_PERIODICIDADE,
  statusManutencao,
  STATUS_MANUTENCAO_CONFIG,
} from "@/lib/pmocChecklist";

// Painel dinâmico: mostra TODOS os equipamentos ativos no PMOC de um cliente
// (podem ser 1 ou 50), cada um com sua própria periodicidade, agrupados por
// estabelecimento — é aqui que se enxerga o plano inteiro de uma vez, sem
// precisar recriar registros de PMOC quando o parque de equipamentos muda.
export default function PainelPMOCCliente({ cliente, equipamentos, onExecutarRodada, onGerarCaderno, onVerPlanoAnual }) {
  if (!cliente) return null;

  const grupos = equipamentos.reduce((acc, eq) => {
    const chave = eq.estabelecimento_nome || "Sem estabelecimento";
    if (!acc[chave]) acc[chave] = [];
    acc[chave].push(eq);
    return acc;
  }, {});

  const contagem = equipamentos.reduce(
    (acc, eq) => {
      const status = statusManutencao(eq.proxima_manutencao);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { em_dia: 0, vence_em_breve: 0, atrasado: 0, nunca_executado: 0 }
  );

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              PMOC — {cliente.nome}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {equipamentos.length} equipamento(s) no plano de manutenção
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onVerPlanoAnual(cliente)} disabled={equipamentos.length === 0}>
              <CalendarRange className="w-4 h-4 mr-2" />
              Plano Anual
            </Button>
            <Button variant="outline" onClick={() => onGerarCaderno(cliente)} disabled={equipamentos.length === 0}>
              <BookOpen className="w-4 h-4 mr-2" />
              Gerar Caderno de Manutenção
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => onExecutarRodada(cliente)}
              disabled={equipamentos.length === 0}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Executar Rodada Mensal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {equipamentos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum equipamento deste cliente está com PMOC ativo. Edite um equipamento e defina a
            periodicidade do PMOC para incluí-lo aqui.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 p-4 border-b bg-muted/30">
              {Object.entries(contagem)
                .filter(([, qtd]) => qtd > 0)
                .map(([status, qtd]) => (
                  <Badge key={status} variant="outline" className={STATUS_MANUTENCAO_CONFIG[status].cor}>
                    {qtd} {STATUS_MANUTENCAO_CONFIG[status].label.toLowerCase()}
                  </Badge>
                ))}
            </div>

            <div className="divide-y">
              {Object.entries(grupos).map(([estabelecimento, itens]) => (
                <div key={estabelecimento} className="p-4">
                  <p className="text-sm font-semibold text-indigo-700 mb-3">📍 {estabelecimento}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="pb-2 pr-4 font-medium">Equipamento</th>
                          <th className="pb-2 pr-4 font-medium">Periodicidade</th>
                          <th className="pb-2 pr-4 font-medium">Última manutenção</th>
                          <th className="pb-2 pr-4 font-medium">Próxima manutenção</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((eq) => {
                          const status = statusManutencao(eq.proxima_manutencao);
                          return (
                            <tr key={eq.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">
                                <p className="font-medium text-foreground">{eq.numero_equipamento}</p>
                                <p className="text-xs text-muted-foreground">{eq.marca} {eq.modelo}</p>
                              </td>
                              <td className="py-2 pr-4">{LABEL_PERIODICIDADE[eq.periodicidade_pmoc] || "—"}</td>
                              <td className="py-2 pr-4 text-muted-foreground">
                                {eq.ultima_manutencao ? format(new Date(eq.ultima_manutencao), "dd/MM/yyyy", { locale: ptBR }) : "Nunca"}
                              </td>
                              <td className="py-2 pr-4 text-muted-foreground">
                                {eq.proxima_manutencao ? format(new Date(eq.proxima_manutencao), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className={STATUS_MANUTENCAO_CONFIG[status].cor}>
                                  {STATUS_MANUTENCAO_CONFIG[status].label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
