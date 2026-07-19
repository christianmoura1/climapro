import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, FileText } from "lucide-react";

export default function EmitirNotaForm({ configuracaoFiscal, clientes, empresa, user, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    empresa_id: user.empresa_id,
    cliente_id: "",
    descricao_servico: "",
    valor_bruto: 0,
    data_prestacao: new Date().toISOString().split('T')[0],
    observacoes: "",
    retencoes: {
      inss: 0,
      ir: 0,
      pis: 0,
      cofins: 0,
      csll: 0
    }
  });

  const emitirNotaMutation = useMutation({
    mutationFn: async (data) => {
      // Calcular valor líquido
      const totalRetencoes = Object.values(data.retencoes).reduce((sum, val) => sum + val, 0);
      const valorLiquido = data.valor_bruto - totalRetencoes;

      // Criar nota fiscal
      const nota = await base44.entities.NotaFiscal.create({
        ...data,
        valor_liquido: valorLiquido,
        status: 'processando',
        data_emissao: new Date().toISOString()
      });

      // Simular chamada para API de NFS-e
      try {
        // TODO: Integrar com API real aqui
        const cliente = clientes.find(c => c.id === data.cliente_id);
        
        // Simulação (em produção, seria uma chamada real)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const numeroNota = `NFS-${Date.now()}`;
        const codigoVerificacao = Math.random().toString(36).substring(7).toUpperCase();
        
        // Atualizar nota com dados da emissão
        await base44.entities.NotaFiscal.update(nota.id, {
          status: 'emitida',
          numero_nota: numeroNota,
          codigo_verificacao: codigoVerificacao,
          arquivo_pdf_url: `https://exemplo.com/nota/${numeroNota}.pdf`
        });

        // Enviar email para cliente
        if (cliente?.email) {
          await base44.integrations.Core.SendEmail({
            to: cliente.email,
            subject: `Nota Fiscal Emitida - ${empresa.nome}`,
            body: `Olá ${cliente.nome},\n\nSua nota fiscal foi emitida com sucesso.\n\nNúmero: ${numeroNota}\nCódigo de Verificação: ${codigoVerificacao}\nValor: R$ ${data.valor_bruto.toFixed(2)}\n\nBaixe sua nota fiscal: https://exemplo.com/nota/${numeroNota}.pdf\n\nAtenciosamente,\n${empresa.nome}`
          });
        }

        return nota;
      } catch (error) {
        // Atualizar nota com erro
        await base44.entities.NotaFiscal.update(nota.id, {
          status: 'erro',
          log_erro: error.message
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notas-fiscais']);
      alert("Nota fiscal emitida com sucesso!");
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao emitir nota:", error);
      alert("Erro ao emitir nota fiscal. Verifique os dados e tente novamente.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    emitirNotaMutation.mutate(formData);
  };

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);

  return (
    <Card className="shadow-lg border-none mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Emitir Nota Fiscal
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(value) => setFormData({...formData, cliente_id: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome} - {cliente.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clienteSelecionado && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">Dados do Cliente:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Nome:</strong> {clienteSelecionado.nome}</p>
                <p><strong>Email:</strong> {clienteSelecionado.email}</p>
                {clienteSelecionado.telefone && (
                  <p><strong>Telefone:</strong> {clienteSelecionado.telefone}</p>
                )}
                {clienteSelecionado.endereco && (
                  <p><strong>Endereço:</strong> {clienteSelecionado.endereco}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição do Serviço *</Label>
            <Textarea
              value={formData.descricao_servico}
              onChange={(e) => setFormData({...formData, descricao_servico: e.target.value})}
              placeholder="Ex: Manutenção preventiva em ar condicionado..."
              rows={3}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Bruto (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_bruto}
                onChange={(e) => setFormData({...formData, valor_bruto: parseFloat(e.target.value) || 0})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Data da Prestação *</Label>
              <Input
                type="date"
                value={formData.data_prestacao}
                onChange={(e) => setFormData({...formData, data_prestacao: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Retenções (Opcional)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>INSS (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retencoes.inss}
                  onChange={(e) => setFormData({
                    ...formData,
                    retencoes: {...formData.retencoes, inss: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>IR (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retencoes.ir}
                  onChange={(e) => setFormData({
                    ...formData,
                    retencoes: {...formData.retencoes, ir: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>PIS (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retencoes.pis}
                  onChange={(e) => setFormData({
                    ...formData,
                    retencoes: {...formData.retencoes, pis: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>COFINS (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retencoes.cofins}
                  onChange={(e) => setFormData({
                    ...formData,
                    retencoes: {...formData.retencoes, cofins: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>CSLL (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retencoes.csll}
                  onChange={(e) => setFormData({
                    ...formData,
                    retencoes: {...formData.retencoes, csll: parseFloat(e.target.value) || 0}
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>

          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm font-medium text-indigo-900 mb-2">Resumo da Nota:</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Bruto:</span>
                <span className="font-semibold">R$ {formData.valor_bruto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Retenções:</span>
                <span className="text-red-600">
                  - R$ {Object.values(formData.retencoes).reduce((sum, val) => sum + val, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-semibold text-foreground">Valor Líquido:</span>
                <span className="font-bold text-green-600">
                  R$ {(formData.valor_bruto - Object.values(formData.retencoes).reduce((sum, val) => sum + val, 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={emitirNotaMutation.isPending}
            >
              {emitirNotaMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Emitindo...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Emitir Nota Fiscal
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}