import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Trash2 } from "lucide-react";

export default function LancamentosList({ lancamentos, tecnicos, onDelete }) {
  if (!lancamentos || lancamentos.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center text-gray-500">
          Nenhum lançamento registrado ainda
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (lancamento) => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir este lançamento?\n\n` +
      `Tipo: ${lancamento.tipo === 'entrada' ? 'Entrada' : 'Saída'}\n` +
      `Descrição: ${lancamento.descricao}\n` +
      `Valor: R$ ${(parseFloat(lancamento.valor) || 0).toFixed(2)}\n\n` +
      `Esta ação não pode ser desfeita.`
    );
    
    if (confirmacao && onDelete) {
      onDelete(lancamento.id);
    }
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle>Histórico de Lançamentos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lancamentos.map((lancamento) => {
                const tecnico = tecnicos.find(t => t.id === lancamento.tecnico_id);
                return (
                  <tr key={lancamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lancamento.data_lancamento 
                        ? format(new Date(lancamento.data_lancamento), "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lancamento.tipo === 'entrada' ? (
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Entrada
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Saída
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lancamento.categoria || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {lancamento.descricao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tecnico?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                      <span className={lancamento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                        R$ {(parseFloat(lancamento.valor) || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant="outline" className={
                        lancamento.status === 'pago' ? 'border-green-500 text-green-700' :
                        lancamento.status === 'pendente' ? 'border-yellow-500 text-yellow-700' :
                        'border-gray-500 text-gray-700'
                      }>
                        {lancamento.status || 'pendente'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(lancamento)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}