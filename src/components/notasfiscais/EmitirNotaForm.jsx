import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, FileText, Info } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Registro das NFS-e que a empresa emitiu no portal da prefeitura (ou no
// sistema do contador). O ClimaPro ainda NÃO emite nota: não há integração
// com nenhum provedor de NFS-e. Este formulário só guarda o número, o código
// de verificação e o link do PDF para o controle financeiro ficar no mesmo
// lugar que o chamado e o cliente.
export default function EmitirNotaForm({ configuracaoFiscal, clientes, empresa, user, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    empresa_id: user.empresa_id,
    cliente_id: "",
    numero_nota: "",
    codigo_verificacao: "",
    arquivo_pdf_url: "",
    descricao_servico: "",
    valor_bruto: 0,
    data_emissao: new Date().toISOString().split('T')[0],
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

  const registrarNotaMutation = useMutation({
    mutationFn: async (data) => {
      const totalRetencoes = Object.values(data.retencoes).reduce((sum, val) => sum + val, 0);
      return base44.entities.NotaFiscal.create({
        ...data,
        valor_liquido: data.valor_bruto - totalRetencoes,
        status: 'emitida',
        data_emissao: new Date(`${data.data_emissao}T12:00:00`).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notas-fiscais']);
      toast({ description: "Nota fiscal registrada!", variant: "default" });
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao registrar nota:", error);
      toast({ description: `Erro ao registrar a nota: ${error.message || 'tente novamente.'}`, variant: "destructive" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    registrarNotaMutation.mutate(formData);
  };

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);

  return (
    <Card className="shadow-lg border-none mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Registrar Nota Fiscal Emitida
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">O ClimaPro não emite a nota para você.</p>
              <p className="mt-1">
                Emita a NFS-e no portal da sua prefeitura (ou com seu contador) e registre aqui o número e o
                código de verificação. Assim o controle financeiro fica junto do chamado e do cliente.
              </p>
            </div>
          </div>

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

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número da nota *</Label>
              <Input
                value={formData.numero_nota}
                onChange={(e) => setFormData({...formData, numero_nota: e.target.value})}
                placeholder="Como aparece na NFS-e emitida"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Código de verificação</Label>
              <Input
                value={formData.codigo_verificacao}
                onChange={(e) => setFormData({...formData, codigo_verificacao: e.target.value})}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link do PDF da nota</Label>
            <Input
              type="url"
              value={formData.arquivo_pdf_url}
              onChange={(e) => setFormData({...formData, arquivo_pdf_url: e.target.value})}
              placeholder="https://... (opcional, link da prefeitura)"
            />
          </div>

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

            <div className="space-y-2">
              <Label>Data de emissão da nota *</Label>
              <Input
                type="date"
                value={formData.data_emissao}
                onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
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
              disabled={registrarNotaMutation.isPending}
            >
              {registrarNotaMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Registrar Nota
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}