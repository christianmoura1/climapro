
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  pendente: { color: "bg-orange-100 text-orange-800", icon: AlertCircle },
  em_andamento: { color: "bg-blue-100 text-blue-800", icon: Clock },
  finalizado: { color: "bg-green-100 text-green-800", icon: CheckCircle }
};

// Função CORRIGIDA para converter UTC para horário de Brasília
const formatarDataBrasil = (dataISO) => {
  if (!dataISO) return 'Data não disponível';
  
  const dataUTC = new Date(dataISO);
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const partes = formatter.formatToParts(dataUTC);
  const valores = {};
  partes.forEach(parte => {
    valores[parte.type] = parte.value;
  });
  
  return `${valores.day}/${valores.month}/${valores.year} ${valores.hour}:${valores.minute}`;
};

export default function RecentChamados({ chamados }) {
  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Chamados Recentes</CardTitle>
          <Link to={createPageUrl("Chamados")}>
            <span className="text-sm text-blue-600 hover:underline">Ver todos</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {chamados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum chamado registrado ainda
          </div>
        ) : (
          <div className="divide-y">
            {chamados.map((chamado) => {
              const StatusIcon = statusConfig[chamado.status]?.icon || AlertCircle;
              return (
                <div key={chamado.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{chamado.titulo}</h4>
                    <Badge className={statusConfig[chamado.status]?.color || ''}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {chamado.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {chamado.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatarDataBrasil(chamado.created_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
