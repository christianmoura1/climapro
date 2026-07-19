import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet, Upload, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

export default function ControleFinanceiroTecnico({ user, tecnico, saldoInfo, lancamentos }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "despesa",
    categoria: "combustivel",
    descricao: "",
    valor: "",
    data_movimentacao: new Date().toISOString().split('T')[0],
    comprovante_url: ""
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const queryClient = useQueryClient();

  // Buscar movimentações pendentes/aprovadas/rejeitadas
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-tecnico', tecnico?.id],
    queryFn: () => base44.entities.MovimentacaoTecnico.filter({
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id
    }, '-data_envio'),
    enabled: !!tecnico
  });

  const createMovimentacaoMutation = useMutation({
    mutationFn: (data) => base44.entities.MovimentacaoTecnico.create(data),
    onSuccess: async (novaMovimentacao) => {
      queryClient.invalidateQueries(['movimentacoes-tecnico']);
      setShowForm(false);
      setFormData({
        tipo: "despesa",
        categoria: "combustivel",
        descricao: "",
        valor: "",
        data_movimentacao: new Date().toISOString().split('T')[0],
        comprovante_url: ""
      });
      
      // Enviar notificação para a empresa
      try {
        const empresas = await base44.entities.Empresa.list();
        const empresa = empresas.find(e => e.id === user.empresa_id);
        
        if (empresa?.email_contato) {
          await base44.integrations.Core.SendEmail({
            to: empresa.email_contato,
            subject: `🔔 Nova Movimentação Pendente - ${tecnico.nome}`,
            body: `Olá,

O técnico ${tecnico.nome} enviou uma nova movimentação para aprovação:

Tipo: ${novaMovimentacao.tipo === 'entrada' ? 'Entrada' : 'Despesa'}
Categoria: ${novaMovimentacao.categoria}
Valor: R$ ${parseFloat(novaMovimentacao.valor).toFixed(2)}
Descrição: ${novaMovimentacao.descricao}
Data: ${format(new Date(novaMovimentacao.data_movimentacao), 'dd/MM/yyyy', { locale: ptBR })}

Acesse o painel para aprovar ou rejeitar:
https://climapro.base44.app/Financeiro

Atenciosamente,
ClimaPro`
          });
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
      }
      
      alert("✅ Movimentação enviada para aprovação!\n\nAguarde a análise da empresa.");
    },
    onError: (error) => {
      console.error("Erro ao criar movimentação:", error);
      toast({ description: "❌ Erro ao enviar movimentação. Tente novamente.", variant: "destructive" });
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, comprovante_url: result.file_url });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ description: 'Erro ao fazer upload. Tente novamente.', variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast({ description: "⚠️ Por favor, informe um valor válido.", variant: "warning" });
      return;
    }
    
    createMovimentacaoMutation.mutate({
      ...formData,
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      valor: parseFloat(formData.valor),
      data_envio: new Date().toISOString()
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const movimentacoesPendentes = movimentacoes.filter(m => m.status === 'pendente').length;
  const movimentacoesAprovadas = movimentacoes.filter(m => m.status === 'aprovado').length;
  const movimentacoesRejeitadas = movimentacoes.filter(m => m.status === 'rejeitado').length;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="shadow-lg border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-blue-600">
                R$ {saldoInfo.orcamento.toFixed(2)}
              </p>
              <Wallet className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">
                R$ {saldoInfo.entradas.toFixed(2)}
              </p>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">
                R$ {saldoInfo.despesas.toFixed(2)}
              </p>
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-bold ${saldoInfo.saldo >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                R$ {saldoInfo.saldo.toFixed(2)}
              </p>
              <Wallet className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Status */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-none bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Aguardando Aprovação</p>
                <p className="text-3xl font-bold text-yellow-900">{movimentacoesPendentes}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Aprovadas</p>
                <p className="text-3xl font-bold text-green-900">{movimentacoesAprovadas}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Rejeitadas</p>
                <p className="text-3xl font-bold text-red-900">{movimentacoesRejeitadas}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão Adicionar */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Movimentação
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Registrar Movimentação</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              ℹ️ Esta movimentação será enviada para aprovação da empresa antes de ser processada.
            </p>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="despesa">Despesa</option>
                    <option value="entrada">Entrada</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {formData.tipo === 'despesa' ? (
                      <>
                        <option value="combustivel">Combustível</option>
                        <option value="alimentacao">Alimentação</option>
                        <option value="estacionamento">Estacionamento</option>
                        <option value="pedagio">Pedágio</option>
                        <option value="outro">Outro</option>
                      </>
                    ) : (
                      <>
                        <option value="reembolso">Reembolso</option>
                        <option value="outro">Outro</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.data_movimentacao}
                    onChange={(e) => setFormData({...formData, data_movimentacao: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descreva a movimentação..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Comprovante</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                    id="comprovante-upload"
                  />
                  <label
                    htmlFor="comprovante-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {uploadingFile ? 'Fazendo upload...' : 
                       formData.comprovante_url ? 'Comprovante anexado ✓' : 
                       'Clique para anexar comprovante'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMovimentacaoMutation.isPending}>
                  {createMovimentacaoMutation.isPending ? 'Enviando...' : 'Enviar para Aprovação'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Histórico de Movimentações */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle>Histórico de Movimentações ({movimentacoes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movimentacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma movimentação registrada ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id} className="hover:bg-muted">
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
                        {getStatusBadge(mov.status)}
                        {mov.status === 'rejeitado' && mov.motivo_rejeicao && (
                          <p className="text-xs text-red-600 mt-1">
                            Motivo: {mov.motivo_rejeicao}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {mov.comprovante_url ? (
                          <a
                            href={mov.comprovante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}