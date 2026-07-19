import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { EmptyState } from "@/components/ui/empty-state";

const statusColor = {
  aguardando_execucao: "bg-blue-100 text-blue-800",
  em_execucao: "bg-amber-100 text-amber-800",
  aguardando_aprovacao_empresa: "bg-orange-100 text-orange-800",
  aguardando_validacao_cliente: "bg-orange-100 text-orange-800",
  concluido: "bg-emerald-100 text-emerald-800",
  reaberto: "bg-red-100 text-red-800",
  pausado: "bg-muted text-foreground",
  cancelado: "bg-muted text-muted-foreground"
};

export default function ProximosPMOCs({ pmocs }) {
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
        {pmocs.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum PMOC ainda"
            description="Cadastre um plano de manutenção preventiva para acompanhar aqui."
          />
        ) : (
          <div className="divide-y">
            {pmocs.map((pmoc) => (
              <div key={pmoc.id} className="p-4 hover:bg-muted/60 transition-colors">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm capitalize">
                      PMOC {pmoc.periodicidade}
                    </span>
                  </div>
                  <Badge className={`${statusColor[pmoc.status] || 'bg-muted text-foreground'} shrink-0`}>
                    {pmoc.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {pmoc.proxima_manutencao && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span>
                      Próxima manutenção: {format(new Date(pmoc.proxima_manutencao), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
