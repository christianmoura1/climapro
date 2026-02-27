import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

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

  const handleEnviarEmail = async () => {
    if (empresa?.email_contato) {
      const relatorioTexto = `
RELATÓRIO FINANCEIRO - ${empresa.nome}
Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}

RESUMO:
Receitas: R$ ${receitas.toFixed(2)}
Despesas: R$ ${despesas.toFixed(2)}
Saldo: R$ ${saldo.toFixed(2)}

LANÇAMENTOS:
${lancamentosFiltrados.map(l => 
  `${format(new Date(l.data_lancamento), "dd/MM/yyyy")} - ${l.tipo === 'entrada' ? '+' : '-'} R$ ${l.valor.toFixed(2)} - ${l.descricao}`
).join('\n')}

Relatório gerado automaticamente pelo ClimaPro.
      `;

      await base44.integrations.Core.SendEmail({
        to: empresa.email_contato,
        subject: `Relatório Financeiro - ${format(new Date(), "MMMM yyyy", { locale: ptBR })}`,
        body: relatorioTexto
      });

      alert("Relatório enviado por e-mail com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatório Financeiro</h1>
              <p className="text-gray-600 mt-1">{empresa?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEnviarEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar por E-mail
            </Button>
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
                <p className="text-sm text-gray-600 mb-1">Receitas</p>
                <p className="text-3xl font-bold text-green-600">R$ {receitas.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Despesas</p>
                <p className="text-3xl font-bold text-red-600">R$ {despesas.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Saldo</p>
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
                <p className="text-center text-gray-500 py-8">
                  Nenhum lançamento encontrado no período selecionado
                </p>
              ) : (
                lancamentosFiltrados.map(lancamento => (
                  <div key={lancamento.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(lancamento.data_lancamento), "dd/MM/yyyy")}
                      </span>
                      <p className="font-medium">{lancamento.descricao}</p>
                      <span className="text-xs text-gray-500">{lancamento.categoria}</span>
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