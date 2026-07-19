import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function GastosTecnicosPendentes({ gastos, tecnicos, onAprovar, onRejeitar }) {
  return (
    <Card className="mb-8 shadow-lg border-2 border-yellow-200">
      <CardHeader className="bg-yellow-50">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          Gastos Pendentes de Aprovação ({gastos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {gastos.map((gasto) => {
            const tecnico = tecnicos.find(t => t.id === gasto.tecnico_id);
            return (
              <div key={gasto.id} className="p-4 hover:bg-muted transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-foreground">{tecnico?.nome}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {gasto.tipo_gasto}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{gasto.descricao}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Data: {format(new Date(gasto.data_gasto), "dd/MM/yyyy")}</span>
                      <span className="font-bold text-orange-600">R$ {gasto.valor.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => onAprovar(gasto.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRejeitar(gasto.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}