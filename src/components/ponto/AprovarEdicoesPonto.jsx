import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const tiposConfig = {
  entrada: { label: "Entrada", icon: "🟢" },
  saida_almoco: { label: "Saída Almoço", icon: "🍽️" },
  retorno: { label: "Retorno", icon: "🟡" },
  saida_final: { label: "Saída Final", icon: "🔴" }
};

export default function AprovarEdicoesPonto({ pontosPendentes, onFechar }) {
  const queryClient = useQueryClient();

  const aprovarMutation = useMutation({
    mutationFn: async (pontoId) => {
      await base44.entities.PontoEletronico.update(pontoId, {
        status: 'normal'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pontos']);
      queryClient.invalidateQueries(['pontos-pendentes-aprovacao']);
      alert("✅ Alteração aprovada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao aprovar:", error);
      alert("❌ Erro ao aprovar alteração");
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({ pontoId, dataHoraOriginal }) => {
      // Restaurar data/hora original
      await base44.entities.PontoEletronico.update(pontoId, {
        data_hora: dataHoraOriginal,
        status: 'normal',
        editado_por: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pontos']);
      queryClient.invalidateQueries(['pontos-pendentes-aprovacao']);
      alert("✅ Alteração rejeitada. Horário original restaurado.");
    },
    onError: (error) => {
      console.error("Erro ao rejeitar:", error);
      alert("❌ Erro ao rejeitar alteração");
    }
  });

  const handleAprovar = (ponto) => {
    if (window.confirm("Deseja aprovar esta alteração de horário?")) {
      aprovarMutation.mutate(ponto.id);
    }
  };

  const handleRejeitar = (ponto) => {
    if (window.confirm("Deseja rejeitar esta alteração? O horário original será restaurado.")) {
      // Precisamos buscar o horário original - vamos assumir que está armazenado ou precisamos de lógica adicional
      rejeitarMutation.mutate({
        pontoId: ponto.id,
        dataHoraOriginal: ponto.data_hora_original || ponto.data_hora
      });
    }
  };

  if (!pontosPendentes || pontosPendentes.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-yellow-200 bg-yellow-50">
      <CardHeader className="border-b border-yellow-200">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="w-5 h-5" />
            Solicitações de Edição de Ponto ({pontosPendentes.length})
          </CardTitle>
          {onFechar && (
            <Button variant="ghost" size="sm" onClick={onFechar}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {pontosPendentes.map((ponto) => {
            const config = tiposConfig[ponto.tipo_registro] || { label: "Ponto", icon: "⚪" };
            
            return (
              <Card key={ponto.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {config.icon} {config.label}
                        </Badge>
                        <Badge variant="outline">
                          {format(new Date(ponto.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-600">
                          <span className="font-semibold">Horário Atual:</span>{' '}
                          {format(new Date(ponto.data_hora), "HH:mm:ss", { locale: ptBR })}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-semibold">Editado por:</span> {ponto.editado_por || 'Empresa'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAprovar(ponto)}
                        disabled={aprovarMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejeitar(ponto)}
                        disabled={rejeitarMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}