import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Eye, User } from "lucide-react";
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

export default function AprovarMovimentacoes({ movimentacoes, tecnicos }) {
  const [movSelecionada, setMovSelecionada] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [atribuindoMovimentacao, setAtribuindoMovimentacao] = useState(null);
  const queryClient = useQueryClient();

  const aprovarMutation = useMutation({
    mutationFn: async (movimentacaoId) => {
      const mov = movimentacoes.find(m => m.id === movimentacaoId);
      if (!mov) throw new Error("Movimentação não encontrada");

      console.log("[AprovarMov] Iniciando aprovação da movimentação:", mov);

      // 1. Atualizar status da movimentação
      const movAtualizada = await base44.entities.MovimentacaoTecnico.update(movimentacaoId, {
        status: 'aprovado',
        data_resposta: new Date().toISOString()
      });

      console.log("[AprovarMov] Movimentação atualizada:", movAtualizada);

      // 2. ⚠️ NÃO criar lançamento no Financeiro da empresa!
      // Os gastos do técnico já foram pagos com créditos enviados anteriormente.
      // Criar Financeiro aqui causaria duplicação nas despesas operacionais.

      // 3. Criar apenas lançamento do técnico (para controle do técnico)
      const lancamentoTecnico = await base44.entities.LancamentoTecnico.create({
        empresa_id: mov.empresa_id,
        tecnico_id: mov.tecnico_id,
        tipo: mov.tipo,
        categoria: mov.categoria,
        descricao: mov.descricao,
        valor: parseFloat(mov.valor),
        data_lancamento: mov.data_movimentacao,
        comprovante_url: mov.comprovante_url,
        chamado_id: mov.chamado_id
      });

      console.log("[AprovarMov] Lançamento do técnico criado:", lancamentoTecnico);

      return { mov, lancamentoTecnico };
    },
    onSuccess: async ({ mov }) => {
      console.log("[AprovarMov] Aprovação bem-sucedida, invalidando queries...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-pendentes'] });
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-tecnicos'] });
      await queryClient.invalidateQueries({ queryKey: ['lancamentos-tecnico'] });
      await queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      
      await queryClient.refetchQueries({ queryKey: ['movimentacoes-tecnicos'] });
      
      setAtribuindoMovimentacao(null);
      
      console.log("[AprovarMov] Queries invalidadas, enviando notificações...");
      
      try {
        const tecnico = tecnicos.find(t => t.id === mov.tecnico_id);
        if (tecnico?.email) {
          await base44.integrations.Core.SendEmail({
            to: tecnico.email,
            subject: "✅ Movimentação Aprovada - ClimaPro",
            body: `Olá ${tecnico.nome},

Sua movimentação foi aprovada pela empresa!

Tipo: ${mov.tipo === 'entrada' ? 'Entrada' : 'Despesa'}
Valor: R$ ${parseFloat(mov.valor).toFixed(2)}
Categoria: ${mov.categoria}
Data: ${format(new Date(mov.data_movimentacao), 'dd/MM/yyyy', { locale: ptBR })}

O valor já foi processado e reflete no seu saldo.

Atenciosamente,
ClimaPro`
          });
        }

        if (tecnico?.telefone) {
          const telefone = tecnico.telefone.replace(/\D/g, '');
          const mensagem = `✅ *MOVIMENTAÇÃO APROVADA*

Sua movimentação de R$ ${parseFloat(mov.valor).toFixed(2)} foi aprovada!

Acesse seu painel para mais detalhes:
https://geradordepmoc.com.br/TecnicoDashboard`;
          
          const whatsappUrl = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
          window.open(whatsappUrl, '_blank');
        }
      } catch (error) {
        console.error("[AprovarMov] Erro ao enviar notificação:", error);
      }
      
      alert("✅ Movimentação aprovada com sucesso!\n\nO gasto foi registrado no controle do técnico.");
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error) => {
      console.error("[AprovarMov] Erro ao aprovar movimentação:", error);
      setAtribuindoMovimentacao(null);
      toast({ description: "❌ Erro ao aprovar movimentação: " + error.message, variant: "destructive" });
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({ movimentacaoId, motivo }) => {
      const mov = movimentacoes.find(m => m.id === movimentacaoId);
      if (!mov) throw new Error("Movimentação não encontrada");

      await base44.entities.MovimentacaoTecnico.update(movimentacaoId, {
        status: 'rejeitado',
        data_resposta: new Date().toISOString(),
        motivo_rejeicao: motivo
      });

      return { mov };
    },
    onSuccess: async ({ mov }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await queryClient.invalidateQueries(['movimentacoes-pendentes']);
      await queryClient.invalidateQueries(['movimentacoes-tecnico']);
      
      try {
        const tecnico = tecnicos.find(t => t.id === mov.tecnico_id);
        if (tecnico?.email) {
          await base44.integrations.Core.SendEmail({
            to: tecnico.email,
            subject: "❌ Movimentação Rejeitada - ClimaPro",
            body: `Olá ${tecnico.nome},

Sua movimentação foi rejeitada pela empresa.

Tipo: ${mov.tipo === 'entrada' ? 'Entrada' : 'Despesa'}
Valor: R$ ${parseFloat(mov.valor).toFixed(2)}
Categoria: ${mov.categoria}
Data: ${format(new Date(mov.data_movimentacao), 'dd/MM/yyyy', { locale: ptBR })}

Motivo da rejeição: ${motivoRejeicao}

Entre em contato com a empresa para mais informações.

Atenciosamente,
ClimaPro`
          });
        }
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);
      }
      
      setShowRejectDialog(false);
      setMotivoRejeicao("");
      setMovSelecionada(null);
      toast({ description: "❌ Movimentação rejeitada.", variant: "destructive" });
    },
    onError: (error) => {
      console.error("Erro ao rejeitar movimentação:", error);
      toast({ description: "❌ Erro ao rejeitar movimentação. Tente novamente.", variant: "destructive" });
    }
  });

  const handleRejeitar = () => {
    if (!motivoRejeicao.trim()) {
      toast({ description: "⚠️ Por favor, informe o motivo da rejeição.", variant: "warning" });
      return;
    }
    rejeitarMutation.mutate({ movimentacaoId: movSelecionada.id, motivo: motivoRejeicao });
  };

  const pendentes = movimentacoes.filter(m => m.status === 'pendente');
  const valorTotalPendente = pendentes.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);

  if (movimentacoes.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="shadow-lg border-none mb-8">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Movimentações Pendentes de Aprovação
            </CardTitle>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-xl font-bold text-orange-600">R$ {valorTotalPendente.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Quantidade</p>
                <p className="text-xl font-bold text-foreground">{pendentes.length}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Técnico</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Comprovante</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movimentacoes.map((mov) => {
                  const tecnico = tecnicos.find(t => t.id === mov.tecnico_id);
                  return (
                    <tr key={mov.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {tecnico?.nome || 'Técnico não encontrado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {mov.data_movimentacao 
                          ? format(new Date(mov.data_movimentacao), "dd/MM/yyyy", { locale: ptBR })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={mov.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Despesa'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground capitalize">
                        {mov.categoria}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                        {mov.descricao || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                        <span className={mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                          R$ {(parseFloat(mov.valor) || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {mov.comprovante_url ? (
                          <a
                            href={mov.comprovante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center justify-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setAtribuindoMovimentacao(mov.id);
                              aprovarMutation.mutate(mov.id);
                            }}
                            disabled={aprovarMutation.isPending && atribuindoMovimentacao === mov.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {aprovarMutation.isPending && atribuindoMovimentacao === mov.id ? (
                              <>Aprovando...</>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMovSelecionada(mov);
                              setShowRejectDialog(true);
                            }}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
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

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Por favor, informe o motivo da rejeição. O técnico receberá essa informação.
            </p>
            <div className="space-y-2">
              <Label>Motivo da Rejeição *</Label>
              <Input
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Ex: Comprovante ilegível"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setMotivoRejeicao("");
              setMovSelecionada(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRejeitar}
              disabled={rejeitarMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}