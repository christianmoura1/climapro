import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EmpresasInadimplentes({ empresas, onEnviarLembrete, onConfirmarPagamento }) {
  if (empresas.length === 0) return null;

  const precos = {
    intermediario: 59.90,
    avancado: 99.90
  };

  return (
    <Card className="shadow-lg border-2 border-red-200 bg-red-50 mb-8">
      <CardHeader className="bg-red-100 border-b border-red-200">
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          Empresas em Atraso ({empresas.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {empresas.map((empresa) => (
            <div key={empresa.id} className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-foreground">{empresa.nome}</h4>
                    <Badge className={
                      empresa.status_pagamento === 'bloqueado' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-orange-100 text-orange-800'
                    }>
                      {empresa.status_pagamento === 'bloqueado' ? '🚫 Bloqueado' : '⚠️ Pendente'}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Plano:</span>
                      <span className="ml-2 font-medium">{empresa.plano}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="ml-2 font-medium text-red-600">R$ {precos[empresa.plano]}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vencimento:</span>
                      <span className="ml-2 font-medium">
                        {empresa.data_vencimento_plano 
                          ? format(new Date(empresa.data_vencimento_plano), "dd/MM/yyyy", { locale: ptBR })
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contato:</span>
                      <span className="ml-2 font-medium">{empresa.telefone || empresa.email_contato}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEnviarLembrete(empresa)}
                    title="Enviar lembrete via WhatsApp/Email"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Lembrete
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onConfirmarPagamento(empresa.id)}
                    title="Confirmar recebimento do pagamento"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirmar Pagamento
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}