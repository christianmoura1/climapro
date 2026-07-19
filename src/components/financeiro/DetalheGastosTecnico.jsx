import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, FileText, Calendar, Image as ImageIcon, Trash2 } from "lucide-react";

export default function DetalheGastosTecnico({ tecnico, gastos, onVoltar, onExcluir }) {
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.valor) || 0), 0);

  // Agrupar por categoria
  const gastosPorCategoria = {};
  gastos.forEach(gasto => {
    const cat = gasto.categoria || 'outro';
    if (!gastosPorCategoria[cat]) {
      gastosPorCategoria[cat] = {
        total: 0,
        quantidade: 0,
        gastos: []
      };
    }
    gastosPorCategoria[cat].total += parseFloat(gasto.valor) || 0;
    gastosPorCategoria[cat].quantidade += 1;
    gastosPorCategoria[cat].gastos.push(gasto);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gastos do Técnico</h1>
              <p className="text-muted-foreground mt-1">{tecnico.nome}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total de Gastos</p>
            <p className="text-3xl font-bold text-purple-600">R$ {totalGastos.toFixed(2)}</p>
          </div>
        </div>

        {/* Resumo por Categoria */}
        <Card className="shadow-lg border-none mb-8">
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(gastosPorCategoria).map(([categoria, dados]) => (
                <div key={categoria} className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 capitalize">{categoria.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold text-purple-900">R$ {dados.total.toFixed(2)}</p>
                  <p className="text-xs text-purple-700 mt-1">{dados.quantidade} gasto(s)</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lista Detalhada de Gastos */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Histórico Completo ({gastos.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {gastos.map(gasto => (
                <div key={gasto.id} className="p-4 hover:bg-muted">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800 capitalize">
                          {gasto.categoria?.replace('_', ' ') || 'Outro'}
                        </Badge>
                        <Badge variant="outline" className={
                          gasto.status === 'aprovado' ? 'border-green-500 text-green-700' :
                          gasto.status === 'pendente' ? 'border-yellow-500 text-yellow-700' :
                          'border-red-500 text-red-700'
                        }>
                          {gasto.status}
                        </Badge>
                      </div>
                      
                      <p className="font-semibold text-foreground mb-1">{gasto.descricao || 'Sem descrição'}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(gasto.data_movimentacao || gasto.created_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {gasto.chamado_id && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Chamado #{gasto.chamado_id.substring(0, 8)}</span>
                          </div>
                        )}
                      </div>

                      {gasto.comprovante_url && (
                        <div className="mt-2">
                          <a
                            href={gasto.comprovante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <ImageIcon className="w-3 h-3" />
                            Ver Comprovante
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4 flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold text-purple-600">R$ {parseFloat(gasto.valor).toFixed(2)}</p>
                      {onExcluir && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExcluir(gasto)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}