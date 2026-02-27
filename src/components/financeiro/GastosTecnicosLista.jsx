import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Calendar, Eye, Trash2 } from "lucide-react";

export default function GastosTecnicosLista({ movimentacoes, tecnicos, onVerDetalhes, onExcluir }) {
  if (!movimentacoes || movimentacoes.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center text-gray-500">
          Nenhum gasto de técnico registrado ainda
        </CardContent>
      </Card>
    );
  }

  // Agrupar por técnico
  const gastosPorTecnico = tecnicos.map(tecnico => {
    const gastosDoTecnico = movimentacoes.filter(m => 
      m.tecnico_id === tecnico.id && m.tipo === 'despesa' && m.status === 'aprovado'
    );
    const total = gastosDoTecnico.reduce((sum, g) => sum + (parseFloat(g.valor) || 0), 0);
    return {
      tecnico,
      gastos: gastosDoTecnico,
      total
    };
  }).filter(g => g.total > 0).sort((a, b) => b.total - a.total);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Gastos dos Técnicos
          </CardTitle>
          <Badge className="bg-purple-100 text-purple-800">
            Total: R$ {gastosPorTecnico.reduce((sum, g) => sum + g.total, 0).toFixed(2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {gastosPorTecnico.map(({ tecnico, gastos, total }) => (
            <div key={tecnico.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tecnico.nome}</h3>
                    <p className="text-xs text-gray-500">{gastos.length} gasto(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">R$ {total.toFixed(2)}</p>
                  {onVerDetalhes && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onVerDetalhes(tecnico)}
                      className="mt-2"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver Detalhes
                    </Button>
                  )}
                </div>
              </div>

              {/* Últimos 3 gastos */}
              <div className="space-y-2 mt-3 pl-13">
                {gastos.slice(0, 3).map(gasto => (
                  <div key={gasto.id} className="flex justify-between items-center text-sm bg-purple-50 p-2 rounded">
                    <div className="flex items-center gap-2 flex-1">
                      <Calendar className="w-3 h-3 text-purple-600" />
                      <span className="text-gray-600">
                        {format(new Date(gasto.data_movimentacao || gasto.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="text-gray-500">-</span>
                      <span className="text-gray-700">{gasto.categoria}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-700">R$ {parseFloat(gasto.valor).toFixed(2)}</span>
                      {onExcluir && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onExcluir(gasto)}
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir gasto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {gastos.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+{gastos.length - 3} gasto(s) adicional(is)</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}