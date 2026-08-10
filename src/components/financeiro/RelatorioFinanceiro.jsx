import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

export default function RelatorioFinanceiro({ lancamentos, empresa, onClose }) {
  const [dataInicio, setDataInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);

  const lancamentosFiltrados = lancamentos.filter(l => {
    const dataLanc = new Date(l.data_lancamento);
    return dataLanc >= new Date(dataInicio) && dataLanc <= new Date(dataFim);
  });

  const receitas = lancamentosFiltrados
    .filter(l => l.tipo === 'entrada')
    .reduce((sum, l) => sum + l.valor, 0);

  const despesas = lancamentosFiltrados
    .filter(l => l.tipo === 'saida')
    .reduce((sum, l) => sum + l.valor, 0);

  const saldo = receitas - despesas;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Relatório Financeiro</h1>
              <p className="text-muted-foreground mt-1">{empresa?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-none mb-6">
          <CardHeader>
            <CardTitle>Filtrar Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none mb-6">
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Receitas</p>
                <p className="text-3xl font-bold text-green-600">R$ {receitas.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Despesas</p>
                <p className="text-3xl font-bold text-red-600">R$ {despesas.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Saldo</p>
                <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  R$ {saldo.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Detalhamento dos Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lancamentosFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lançamento encontrado no período selecionado
                </p>
              ) : (
                lancamentosFiltrados.map(lancamento => (
                  <div key={lancamento.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(lancamento.data_lancamento), "dd/MM/yyyy")}
                      </span>
                      <p className="font-medium">{lancamento.descricao}</p>
                      <span className="text-xs text-muted-foreground">{lancamento.categoria}</span>
                    </div>
                    <span className={`font-bold text-lg ${lancamento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {lancamento.tipo === 'entrada' ? '+' : '-'} R$ {lancamento.valor.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}