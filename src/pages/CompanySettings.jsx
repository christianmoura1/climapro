import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Building2, Upload, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";

export default function CompanySettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: empresa, isLoading } = useQuery({
    queryKey: ['minha-empresa', user?.empresa_id],
    queryFn: async () => {
      const empresas = await base44.entities.Empresa.list();
      return empresas.find(e => e.id === user.empresa_id);
    },
    enabled: !!user?.empresa_id
  });

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email_contato: "",
    endereco: "",
    logo_url: "",
    responsavel_tecnico_nome: "",
    responsavel_tecnico_registro: ""
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (empresa) {
      setFormData({
        nome: empresa.nome || "",
        cnpj: empresa.cnpj || "",
        telefone: empresa.telefone || "",
        email_contato: empresa.email_contato || "",
        endereco: empresa.endereco || "",
        logo_url: empresa.logo_url || "",
        responsavel_tecnico_nome: empresa.responsavel_tecnico_nome || "",
        responsavel_tecnico_registro: empresa.responsavel_tecnico_registro || ""
      });
    }
  }, [empresa]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ description: '⚠️ Por favor, selecione apenas arquivos de imagem (PNG, JPG, etc)', variant: "warning" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ description: '⚠️ A imagem deve ter no máximo 2MB', variant: "warning" });
      return;
    }

    setUploadingLogo(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: result.file_url }));
      toast({ description: '✅ Logo carregada com sucesso! Lembre-se de clicar em "Salvar Alterações" para confirmar.', variant: "success" });
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      toast({ description: '❌ Erro ao fazer upload da logo. Tente novamente.', variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Empresa.update(empresa.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['minha-empresa']);
      toast({ description: "✅ Dados da empresa atualizados com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao atualizar:", error);
      toast({ description: "❌ Erro ao atualizar dados. Tente novamente.", variant: "destructive" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!user || isLoading) {
    return (
      <PageLoading />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações da Empresa</h1>
            <p className="text-muted-foreground mt-1">Gerencie os dados da sua empresa</p>
          </div>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo Upload Section - Simplificado */}
              <div className="space-y-2">
                <Label>Logo da Empresa (para documentos e relatórios)</Label>
                <div className="flex flex-col gap-4">
                  {formData.logo_url && (
                    <div className="relative w-48 h-32 border-2 border-border rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <img
                        src={formData.logo_url}
                        alt="Logo da empresa"
                        className="max-w-full max-h-full object-contain p-2"
                        onError={(e) => {
                          console.error('Erro ao carregar logo:', formData.logo_url);
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        {uploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Fazendo upload...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>{formData.logo_url ? 'Alterar logo' : 'Escolher logo'}</span>
                          </>
                        )}
                      </span>
                    </label>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    📌 PNG, JPG até 2MB. Recomendado: proporção larga (ex: 200x80px)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  disabled={uploadingLogo}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    required
                    disabled={uploadingLogo}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone/WhatsApp *</Label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    required
                    disabled={uploadingLogo}
                  />
                  <p className="text-sm text-muted-foreground">
                    📱 Este número receberá notificações via WhatsApp quando clientes abrirem chamados
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email de Contato</Label>
                <Input
                  type="email"
                  value={formData.email_contato}
                  onChange={(e) => setFormData({...formData, email_contato: e.target.value})}
                  placeholder="contato@empresa.com"
                  disabled={uploadingLogo}
                />
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  placeholder="Rua, número, bairro, cidade - UF"
                  disabled={uploadingLogo}
                />
              </div>

              <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div>
                  <Label className="text-purple-900 font-semibold">Responsável Técnico (PMOC)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A Portaria GM nº 3.523/98 exige identificar o responsável técnico habilitado nos
                    documentos do PMOC — sai impresso no Plano Anual e no Caderno de Manutenção.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Responsável Técnico</Label>
                    <Input
                      value={formData.responsavel_tecnico_nome}
                      onChange={(e) => setFormData({...formData, responsavel_tecnico_nome: e.target.value})}
                      placeholder="Ex: João da Silva"
                      disabled={uploadingLogo}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Registro Profissional (CREA/CFT)</Label>
                    <Input
                      value={formData.responsavel_tecnico_registro}
                      onChange={(e) => setFormData({...formData, responsavel_tecnico_registro: e.target.value})}
                      placeholder="Ex: CREA-SP 123456789"
                      disabled={uploadingLogo}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Dashboard"))}
                  disabled={updateMutation.isPending || uploadingLogo}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateMutation.isPending || uploadingLogo}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📱 Como funcionam as Notificações</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ Quando um cliente abre um chamado → WhatsApp da empresa é aberto automaticamente</li>
              <li>✅ Quando você atribui um chamado a um técnico → WhatsApp do técnico é aberto automaticamente</li>
              <li>✅ A mensagem já vem pronta, basta clicar em ENVIAR</li>
              <li>✅ Certifique-se de cadastrar os números de telefone com DDD correto</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}