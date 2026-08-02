import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Building2, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";
import { ErrorState, PageHeader, PageShell } from "@/components/ui/page-shell";
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

  const { data: empresa, isLoading, error: empresaError, refetch: refetchEmpresa } = useQuery({
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

  if (empresaError) {
    return (
      <PageShell innerClassName="max-w-4xl">
        <PageHeader title="Configurações da empresa" description="Dados exibidos nos documentos e contatos" backTo={createPageUrl("Dashboard")} />
        <ErrorState
          title="Não foi possível carregar os dados da empresa"
          description="As informações continuam salvas. Verifique a conexão e tente novamente."
          onRetry={refetchEmpresa}
        />
      </PageShell>
    );
  }

  return (
    <PageShell innerClassName="max-w-4xl">
        <PageHeader title="Configurações da empresa" eyebrow="Identidade operacional" description="Dados usados nos contatos e documentos" backTo={createPageUrl("Dashboard")} />

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
                <Label htmlFor="empresa-logo">Logo da empresa (documentos e relatórios)</Label>
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
                        aria-label="Remover logo"
                        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <label htmlFor="empresa-logo" className="cursor-pointer">
                      <input
                        type="file"
                        id="empresa-logo"
                        accept="image/*"
                        onChange={handleLogoChange}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
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
                <Label htmlFor="empresa-nome">Nome da empresa *</Label>
                <Input
                  id="empresa-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  disabled={uploadingLogo}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa-cnpj">CNPJ *</Label>
                  <Input
                    id="empresa-cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    required
                    disabled={uploadingLogo}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa-telefone">Telefone/WhatsApp *</Label>
                  <Input
                    id="empresa-telefone"
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
                <Label htmlFor="empresa-email">Email de contato</Label>
                <Input
                  id="empresa-email"
                  type="email"
                  value={formData.email_contato}
                  onChange={(e) => setFormData({...formData, email_contato: e.target.value})}
                  placeholder="contato@empresa.com"
                  disabled={uploadingLogo}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa-endereco">Endereço</Label>
                <Input
                  id="empresa-endereco"
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
                    Os dados informados serão exibidos no Plano Anual e no Caderno de Manutenção.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel-tecnico-nome">Nome do responsável técnico</Label>
                    <Input
                      id="responsavel-tecnico-nome"
                      value={formData.responsavel_tecnico_nome}
                      onChange={(e) => setFormData({...formData, responsavel_tecnico_nome: e.target.value})}
                      placeholder="Ex: João da Silva"
                      disabled={uploadingLogo}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsavel-tecnico-registro">Registro profissional (CREA/CFT)</Label>
                    <Input
                      id="responsavel-tecnico-registro"
                      value={formData.responsavel_tecnico_registro}
                      onChange={(e) => setFormData({...formData, responsavel_tecnico_registro: e.target.value})}
                      placeholder="Ex: CREA-SP 123456789"
                      disabled={uploadingLogo}
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 -mx-6 grid grid-cols-2 gap-3 border-t bg-card px-6 py-4 sm:flex sm:justify-end">
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
    </PageShell>
  );
}