
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

export default function CreditosPendentes({ creditos, user, tecnico }) {
  const [creditoSelecionado, setCreditoSelecionado] = React.useState(null);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = React.useState("");
  const queryClient = useQueryClient();

  const aprovarCreditoMutation = useMutation({
    mutationFn: async (creditoId) => {
      const credito = creditos.find(c => c.id === creditoId);
      if (!credito) throw new Error("Crédito não encontrado");

      // 1. Atualizar status do crédito para aprovado
      await base44.entities.CreditoTecnico.update(creditoId, {
        status: 'aprovado',
        data_resposta: new Date().toISOString()
      });

      // 2. Criar lançamento no financeiro do técnico
      const lancamento = await base44.entities.LancamentoTecnico.create({
        empresa_id: credito.empresa_id,
        tecnico_id: credito.tecnico_id,
        tipo: 'entrada',
        categoria: 'orcamento', // Changed from 'reembolso'
        descricao: credito.descricao || 'Crédito aprovado da empresa', // Improved description handling
        valor: credito.valor,
        data_lancamento: new Date().toISOString(), // Changed to full ISO string
        pode_editar: false // New field
      });

      console.log("[CreditosPendentes] Lançamento criado para técnico:", lancamento);

      // 3. Criar lançamento no financeiro da empresa (opcional)
      try {
        await base44.entities.Financeiro.create({
          empresa_id: credito.empresa_id,
          tecnico_id: credito.tecnico_id,
          tipo: 'saida', // Corrected from outline's 'entrada', should be company expense
          categoria: 'outro', // Changed from 'salario' to 'outro' as per outline
          descricao: `Crédito aprovado por ${tecnico.nome}`, // New description
          valor: credito.valor,
          data_lancamento: new Date().toISOString(), // Changed to full ISO string
          status: 'pago' // Kept from existing code
        });
        console.log("[CreditosPendentes] Lançamento criado no financeiro da empresa");
      } catch (error) {
        console.error("[CreditosPendentes] Erro ao criar lançamento na empresa:", error);
      }

      // 4. Removed the 'Criar orçamento aprovado' step as per outline

      return { credito, lancamento }; // Return object with both
    },
    onSuccess: async ({ credito, lancamento }) => { // Updated to receive object
      await queryClient.invalidateQueries(['creditos-pendentes']);
      await queryClient.invalidateQueries(['lancamentos-tecnico']);
      await queryClient.invalidateQueries(['orcamentos-aprovados']); // Still invalidating even if not created directly here
      await queryClient.invalidateQueries(['financeiro']); // Added for company finance invalidation

      // Notificar empresa
      try {
        const empresas = await base44.entities.Empresa.list();
        const empresa = empresas.find(e => e.id === credito.empresa_id);
        
        if (empresa?.email_contato) {
          await base44.integrations.Core.SendEmail({
            to: empresa.email_contato,
            subject: `✅ Crédito Aprovado - ${tecnico.nome}`, // Updated subject
            body: `O técnico ${tecnico.nome} aprovou um crédito:

💰 Valor: R$ ${parseFloat(credito.valor).toFixed(2)}
📝 Descrição: ${credito.descricao}
📅 Data de aprovação: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

O valor foi creditado automaticamente no saldo do técnico.

ClimaPro` // Updated body
          });
        }
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);
      }

      toast({ description: `✅ Crédito aprovado com sucesso!

💰 R$ ${parseFloat(credito.valor).toFixed(2)} foi adicionado ao seu saldo.`, variant: "success" }); // Updated alert message
    },
    onError: (error) => {
      console.error("Erro ao aprovar crédito:", error);
      toast({ description: "❌ Erro ao aprovar crédito. Tente novamente.", variant: "destructive" }); // Updated alert message
    }
  });

  const rejeitarCreditoMutation = useMutation({
    mutationFn: async ({ creditoId, motivo }) => {
      await base44.entities.CreditoTecnico.update(creditoId, {
        status: 'rejeitado',
        data_resposta: new Date().toISOString(),
        motivo_rejeicao: motivo
      });

      return creditos.find(c => c.id === creditoId); // Simplified to find and return
    },
    onSuccess: async (credito) => {
      await queryClient.invalidateQueries(['creditos-pendentes']);
      setShowRejectDialog(false);
      setCreditoSelecionado(null); // Keep using creditoSelecionado
      setMotivoRejeicao("");

      // Notificar empresa
      try {
        const empresas = await base44.entities.Empresa.list();
        const empresa = empresas.find(e => e.id === credito.empresa_id);
        
        if (empresa?.email_contato) {
          await base44.integrations.Core.SendEmail({
            to: empresa.email_contato,
            subject: `❌ Crédito Rejeitado - ${tecnico.nome}`, // Updated subject
            body: `O técnico ${tecnico.nome} rejeitou um crédito:

💰 Valor: R$ ${parseFloat(credito.valor).toFixed(2)}
📝 Descrição: ${credito.descricao}
❌ Motivo: ${credito.motivo_rejeicao || 'Não informado'}

ClimaPro` // Updated body
          });
        }
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);
      }

      toast({ description: "Crédito rejeitado.", variant: "default" }); // Updated alert message
    },
    onError: (error) => {
      console.error("Erro ao rejeitar crédito:", error);
      toast({ description: `❌ Erro ao rejeitar crédito: ${error.message}`, variant: "destructive" });
    }
  });

  const handleRejeitar = (credito) => {
    setCreditoSelecionado(credito);
    setShowRejectDialog(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    rejeitarCreditoMutation.mutate({
      creditoId: creditoSelecionado.id,
      motivo: motivoRejeicao
    });
  };

  const tipoLabels = {
    adiantamento: "Adiantamento",
    reembolso: "Reembolso",
    orcamento: "Orçamento de Campo",
    bonus: "Bônus",
    outro: "Outro"
  };

  if (creditos.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="shadow-lg border-2 border-yellow-200 mb-6">
        <CardHeader className="bg-yellow-50">
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="w-5 h-5" />
            💸 Créditos Pendentes de Aprovação ({creditos.length})
          </CardTitle>
          <p className="text-sm text-yellow-700 mt-2">
            Você tem créditos enviados pela empresa aguardando sua aprovação. Revise e confirme para que os valores sejam adicionados ao seu saldo.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {creditos.map((credito) => (
                  <tr key={credito.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {format(new Date(credito.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800">
                        {tipoLabels[credito.tipo] || credito.tipo}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground max-w-xs">
                      {credito.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                      R$ {parseFloat(credito.valor).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => aprovarCreditoMutation.mutate(credito.id)}
                          disabled={aprovarCreditoMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejeitar(credito)}
                          disabled={rejeitarCreditoMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Crédito</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmReject}>
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Você está prestes a rejeitar um crédito de <strong>R$ {creditoSelecionado?.valor}</strong>. 
                  Por favor, informe o motivo (opcional).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Motivo da Rejeição (opcional)</Label>
                <Textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Ex: Não realizei este serviço, valor incorreto..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
