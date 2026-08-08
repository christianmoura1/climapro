import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ConfiguracaoFiscalForm({ configuracao, empresa, user, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    empresa_id: user.empresa_id,
    razao_social: configuracao?.razao_social || empresa?.nome || "",
    nome_fantasia: configuracao?.nome_fantasia || "",
    cnpj: configuracao?.cnpj || empresa?.cnpj || "",
    inscricao_municipal: configuracao?.inscricao_municipal || "",
    endereco_completo: configuracao?.endereco_completo || empresa?.endereco || "",
    cidade: configuracao?.cidade || "",
    codigo_ibge: configuracao?.codigo_ibge || "",
    email_fiscal: configuracao?.email_fiscal || empresa?.email_contato || "",
    aliquota_iss: configuracao?.aliquota_iss || 5,
    cnae: configuracao?.cnae || "",
    regime_tributario: configuracao?.regime_tributario || "simples_nacional",
    provedor_nfse: configuracao?.provedor_nfse || "nfeio",
    token_api_nfse: configuracao?.token_api_nfse || "",
    emissao_automatica: configuracao?.emissao_automatica || false
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (configuracao) {
        return base44.entities.ConfiguracaoFiscal.update(configuracao.id, data);
      } else {
        return base44.entities.ConfiguracaoFiscal.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracao-fiscal']);
      toast({ description: "Configuração fiscal salva com sucesso!", variant: "default" });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações Fiscais</h1>
            <p className="text-muted-foreground mt-1">Dados para emissão de notas fiscais</p>
          </div>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social *</Label>
                  <Input
                    value={formData.razao_social}
                    onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Inscrição Municipal *</Label>
                  <Input
                    value={formData.inscricao_municipal}
                    onChange={(e) => setFormData({...formData, inscricao_municipal: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço Completo *</Label>
                <Input
                  value={formData.endereco_completo}
                  onChange={(e) => setFormData({...formData, endereco_completo: e.target.value})}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Código IBGE *</Label>
                  <Input
                    value={formData.codigo_ibge}
                    onChange={(e) => setFormData({...formData, codigo_ibge: e.target.value})}
                    placeholder="Ex: 3550308"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Fiscal *</Label>
                <Input
                  type="email"
                  value={formData.email_fiscal}
                  onChange={(e) => setFormData({...formData, email_fiscal: e.target.value})}
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Alíquota ISS (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.aliquota_iss}
                    onChange={(e) => setFormData({...formData, aliquota_iss: parseFloat(e.target.value)})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CNAE *</Label>
                  <Input
                    value={formData.cnae}
                    onChange={(e) => setFormData({...formData, cnae: e.target.value})}
                    placeholder="Ex: 4322-3/01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Regime Tributário *</Label>
                  <Select
                    value={formData.regime_tributario}
                    onValueChange={(value) => setFormData({...formData, regime_tributario: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Emissão automática</h3>
                <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                  O ClimaPro ainda não emite NFS-e. Emita a nota no portal da sua prefeitura ou com o seu
                  contador e registre o número aqui, na tela de Notas Fiscais. Os dados acima servem para o
                  seu controle e para preencher os relatórios.
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}