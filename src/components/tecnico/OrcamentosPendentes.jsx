import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OrcamentosPendentes({ orcamentos, user, tecnico }) {
  const queryClient = useQueryClient();

  const responderOrcamentoMutation = useMutation({
    mutationFn: async ({ orcamentoId, aprovar }) => {
      const orcamento = orcamentos.find(o => o.id === orcamentoId);
      
      await base44.entities.OrcamentoTecnico.update(orcamentoId, {
        status: aprovar ? 'aprovado' : 'rejeitado',
        data_resposta: new Date().toISOString()
      });

      // Se aprovado, criar lançamento de entrada
      if (aprovar) {
        await base44.entities.LancamentoTecnico.create({
          empresa_id: user.empresa_id,
          tecnico_id: tecnico.id,
          tipo: 'entrada',
          categoria: 'orcamento',
          descricao: `Orçamento mensal - ${format(new Date(orcamento.mes_referencia), "MMMM/yyyy", { locale: ptBR })}`,
          valor: orcamento.valor_orcamento,
          data_lancamento: new Date().toISOString().split('T')[0],
          pode_editar: false
        });

        // Notificar empresa
        try {
          const empresas = await base44.entities.Empresa.list();
          const empresa = empresas.find(e => e.id === user.empresa_id);

          if (empresa?.email_contato) {
            await base44.integrations.Core.SendEmail({
              to: empresa.email_contato,
              subject: `✅ Orçamento Aprovado - ${tecnico.nome}`,
              body: `O técnico ${tecnico.nome} aprovou o orçamento mensal!

📋 DETALHES:

Valor: R$ ${orcamento.valor_orcamento.toFixed(2)}
Mês de Referência: ${format(new Date(orcamento.mes_referencia), "MMMM/yyyy", { locale: ptBR })}
Data de Aprovação: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

ClimaPro - Sistema de Gestão`
            });
          }
        } catch (emailError) {
          console.error("Erro ao enviar email:", emailError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orcamentos-pendentes']);
      queryClient.invalidateQueries(['orcamentos-aprovados']);
      queryClient.invalidateQueries(['lancamentos-tecnico']);
      alert("✅ Resposta enviada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao responder orçamento:", error);
      alert("❌ Erro ao processar resposta. Tente novamente.");
    }
  });

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-blue-50 shadow-lg">
      <CardHeader className="bg-blue-100">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Orçamentos Pendentes de Aprovação ({orcamentos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {orcamentos.map((orcamento) => (
            <div key={orcamento.id} className="p-4 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-2">
                    💰 Novo Orçamento Mensal Recebido
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Valor:</strong> R$ {orcamento.valor_orcamento.toFixed(2)}</p>
                    <p><strong>Mês de Referência:</strong> {format(new Date(orcamento.mes_referencia), "MMMM/yyyy", { locale: ptBR })}</p>
                    <p><strong>Enviado em:</strong> {format(new Date(orcamento.data_envio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    {orcamento.observacoes && (
                      <p className="mt-2 p-2 bg-muted rounded"><strong>Observações:</strong> {orcamento.observacoes}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => responderOrcamentoMutation.mutate({ orcamentoId: orcamento.id, aprovar: true })}
                    disabled={responderOrcamentoMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => responderOrcamentoMutation.mutate({ orcamentoId: orcamento.id, aprovar: false })}
                    disabled={responderOrcamentoMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rejeitar
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