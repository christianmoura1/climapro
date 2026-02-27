import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProximosPMOCs({ pmocs }) {
  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Próximas Manutenções PMOC</CardTitle>
          <Link to={createPageUrl("PMOC")}>
            <span className="text-sm text-blue-600 hover:underline">Ver todos</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {pmocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum PMOC cadastrado ainda
          </div>
        ) : (
          <div className="divide-y">
            {pmocs.map((pmoc) => (
              <div key={pmoc.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900">
                      PMOC {pmoc.periodicidade}
                    </span>
                  </div>
                  <Badge className={pmoc.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {pmoc.status}
                  </Badge>
                </div>
                {pmoc.proxima_manutencao && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
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