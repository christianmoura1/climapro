import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, Eye, Calendar, AlertTriangle, CheckCircle, Pause, Trash2, AlertCircle as AlertIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const statusConfig = {
  aguardando_execucao: { color: "bg-blue-100 text-blue-800", icon: Calendar, label: "Aguardando Execução" },
  em_execucao: { color: "bg-amber-100 text-amber-800", icon: Calendar, label: "Em Execução" },
  aguardando_aprovacao_empresa: { color: "bg-orange-100 text-orange-800", icon: AlertTriangle, label: "Aguardando Aprovação" },
  aguardando_validacao_cliente: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, label: "Aguardando Cliente" },
  reaberto: { color: "bg-red-100 text-red-800", icon: AlertIcon, label: "Reaberto" },
  pausado: { color: "bg-muted text-foreground", icon: Pause, label: "Pausado" },
  concluido: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle, label: "Concluído" },
  cancelado: { color: "bg-muted text-muted-foreground", icon: AlertIcon, label: "Cancelado" }
};

const statusPadrao = { color: "bg-muted text-foreground", icon: Calendar, label: "—" };

const periodicidadeConfig = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual"
};

export default function PMOCList({ pmocs, clientes, tecnicos, isLoading, onView, onEdit, onDelete }) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm border-none rounded-xl">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (pmocs.length === 0) {
    return (
      <Card className="shadow-sm border-none rounded-xl">
        <EmptyState
          icon={Calendar}
          title="Nenhum PMOC cadastrado"
          description='Clique em "Novo PMOC" para criar o primeiro plano de manutenção preventiva.'
        />
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pmocs.map((pmoc) => {
        const status = statusConfig[pmoc.status] || statusPadrao;
        const StatusIcon = status.icon;
        const cliente = clientes.find(c => c.id === pmoc.cliente_id);
        const tecnico = tecnicos.find(t => t.id === pmoc.tecnico_responsavel_id);

        const proximaManutencao = pmoc.proxima_manutencao ? new Date(pmoc.proxima_manutencao) : null;
        const hoje = new Date();
        const diasRestantes = proximaManutencao 
          ? Math.ceil((proximaManutencao - hoje) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <Card key={pmoc.id} className="shadow-lg border-none hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Badge className={`${status.color} border`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {periodicidadeConfig[pmoc.periodicidade]}
                </Badge>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">
                {cliente?.nome || 'Cliente não identificado'}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Local:</span> {cliente?.endereco || 'N/A'}
                </div>
                {tecnico && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Técnico:</span> {tecnico.nome}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Atividades:</span> {pmoc.atividades?.length || 0} itens
                </div>
              </div>

              {pmoc.status === 'reaberto' && pmoc.motivo_reabertura && (
                <div className="p-3 rounded-lg mb-4 bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-600 font-semibold">Reaberto</p>
                      <p className="text-xs text-red-700 mt-1">
                        {pmoc.motivo_reabertura}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {proximaManutencao && pmoc.status !== 'reaberto' && (
                <div className={`p-3 rounded-lg mb-4 ${
                  diasRestantes <= 7 ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${diasRestantes <= 7 ? 'text-red-500' : 'text-orange-500'}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Próxima manutenção</p>
                      <p className="font-semibold text-foreground">
                        {format(proximaManutencao, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {diasRestantes !== null && (
                        <p className="text-xs text-muted-foreground">
                          {diasRestantes > 0 ? `em ${diasRestantes} dias` : 'ATRASADO'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onView(pmoc)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(pmoc)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(pmoc)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}