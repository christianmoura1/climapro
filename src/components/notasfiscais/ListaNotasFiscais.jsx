import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  emitida: { color: "bg-green-100 text-green-800", label: "Emitida" },
  cancelada: { color: "bg-red-100 text-red-800", label: "Cancelada" },
  processando: { color: "bg-yellow-100 text-yellow-800", label: "Processando" },
  erro: { color: "bg-red-100 text-red-800", label: "Erro" }
};

export default function ListaNotasFiscais({ notas, clientes }) {
  if (notas.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium mb-2">Nenhuma nota fiscal emitida ainda</p>
          <p className="text-muted-foreground text-sm">Clique em "Emitir Nota" para começar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle>Notas Fiscais Emitidas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data Emissão</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notas.map((nota) => {
                const cliente = clientes.find(c => c.id === nota.cliente_id);
                const status = statusConfig[nota.status] || statusConfig.processando;
                
                return (
                  <tr key={nota.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {nota.numero_nota || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {cliente?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {nota.descricao_servico}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {nota.data_emissao 
                        ? format(new Date(nota.data_emissao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-foreground">
                      R$ {nota.valor_bruto.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {nota.status === 'emitida' && nota.arquivo_pdf_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(nota.arquivo_pdf_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {nota.status === 'emitida' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja cancelar esta nota fiscal?")) {
                                alert("Função de cancelamento será implementada");
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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