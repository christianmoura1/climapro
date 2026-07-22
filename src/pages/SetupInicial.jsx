
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ArrowRight, ArrowLeft, Building2, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "@/components/ui/use-toast";
// Removed Select imports as they are replaced by native <select> elements
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SetupInicial() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [empresaData, setEmpresaData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    endereco: ""
  });
  const [tecnicoData, setTecnicoData] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidade: "ambos"
  });
  const [clienteData, setClienteData] = useState({
    nome: "",
    telefone: "",
    email: "",
    endereco: "",
    tipo_estabelecimento: "comercial"
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log("Usuário carregado:", currentUser);

        // BLOQUEAR: Se for admin global, redirecionar
        if (currentUser.role === 'admin') {
          navigate(createPageUrl("AdminPanel"));
          return;
        }

        // BLOQUEAR: Se for técnico ou cliente, redirecionar
        if (currentUser.tipo_usuario === 'tecnico') {
          alert("⚠️ Técnicos não podem criar empresas.\n\nAcesse o sistema pela opção 'Entrar no Sistema'.");
          navigate(createPageUrl("InitialChoice"));
          return;
        }

        if (currentUser.tipo_usuario === 'cliente') {
          alert("⚠️ Clientes não podem criar empresas.\n\nAcesse o sistema pela opção 'Entrar no Sistema'.");
          navigate(createPageUrl("InitialChoice"));
          return;
        }

        // Se já tem empresa, redirecionar
        if (currentUser.empresa_id) {
          navigate(createPageUrl("Dashboard"));
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const setupMutation = useMutation({
    mutationFn: async () => {
      console.log("Iniciando setup com dados:", { empresaData, tecnicoData, clienteData });

      try {
        // 1. Criar empresa + vincular o usuário atual como admin_empresa,
        // atomicamente, via função de banco (evita a referência circular de
        // RLS: o usuário só teria permissão de ler/gravar depois de já ter
        // uma empresa vinculada ao perfil).
        console.log("Criando empresa:", empresaData.nome);

        const { data: empresa, error: empresaError } = await supabase.rpc("criar_empresa_inicial", {
          p_nome: empresaData.nome,
          p_cnpj: empresaData.cnpj,
          p_telefone: empresaData.telefone,
          p_endereco: empresaData.endereco,
        });
        if (empresaError) throw empresaError;

        console.log("Empresa criada:", empresa);

        // 3. Criar técnico
        console.log("Criando técnico");
        await base44.entities.Tecnico.create({
          empresa_id: empresa.id,
          nome: tecnicoData.nome,
          email: tecnicoData.email,
          telefone: tecnicoData.telefone,
          especialidade: tecnicoData.especialidade,
          status: "ativo",
          total_atendimentos: 0
        });

        // 4. Criar cliente
        console.log("Criando cliente");
        await base44.entities.Cliente.create({
          empresa_id: empresa.id,
          nome: clienteData.nome,
          telefone: clienteData.telefone,
          email: clienteData.email,
          endereco: clienteData.endereco,
          tipo_estabelecimento: clienteData.tipo_estabelecimento
        });

        console.log("Setup concluído com sucesso!");
        return empresa;
      } catch (error) {
        console.error("Erro detalhado no setup:", error);
        throw error;
      }
    },
    onSuccess: async (empresa) => {
      console.log("Sucesso! Aguardando antes de redirecionar...");
      // Aguardar 2 segundos antes de redirecionar
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("Redirecionando para Dashboard");
      window.location.href = createPageUrl("Dashboard");
    },
    onError: (error) => {
      console.error("Erro no mutation:", error);
      toast({ description: `Erro ao configurar empresa: ${error.message || "Tente novamente"}`, variant: "destructive" });
    }
  });

  const handleEmpresaNext = (e) => {
    e.preventDefault();
    console.log("handleEmpresaNext chamado com dados:", empresaData);

    if (!empresaData.nome || !empresaData.cnpj || !empresaData.telefone) {
      toast({ description: "Por favor, preencha todos os campos obrigatórios da empresa.", variant: "default" });
      return;
    }

    console.log("Avançando para step 2");
    setStep(2);
  };

  const handleTecnicoNext = (e) => {
    e.preventDefault();
    console.log("handleTecnicoNext chamado com dados:", tecnicoData);

    if (!tecnicoData.nome || !tecnicoData.email || !tecnicoData.telefone) {
      toast({ description: "Por favor, preencha todos os campos obrigatórios do técnico.", variant: "default" });
      return;
    }

    console.log("Avançando para step 3");
    setStep(3);
  };

  const handleClienteSubmit = (e) => {
    e.preventDefault();
    console.log("handleClienteSubmit chamado com dados:", clienteData);

    if (!clienteData.nome || !clienteData.telefone) {
      toast({ description: "Por favor, preencha todos os campos obrigatórios do cliente.", variant: "default" });
      return;
    }

    console.log("Iniciando mutation");
    setupMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  console.log("Renderizando step:", step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full shadow-2xl border-none">
        <CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <CardTitle className="text-3xl font-bold mb-2">
            Bem-vindo ao ClimaPro! 🎉
          </CardTitle>
          <CardDescription className="text-blue-100 text-lg">
            Vamos configurar sua empresa em 3 passos simples
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8 pb-6">
          {/* Progress Steps */}
          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-muted -z-10">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>

            {[1, 2, 3].map((num) => (
              <div key={num} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step >= num ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                <span className="text-xs mt-2 font-medium text-muted-foreground">
                  {num === 1 && "Empresa"}
                  {num === 2 && "Técnico"}
                  {num === 3 && "Cliente"}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1: Dados da Empresa */}
          {step === 1 && (
            <form onSubmit={handleEmpresaNext} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Dados da Empresa</h3>
                  <p className="text-sm text-muted-foreground">Informações básicas da sua empresa</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input
                  value={empresaData.nome}
                  onChange={(e) => setEmpresaData({...empresaData, nome: e.target.value})}
                  placeholder="Ex: Gelax Refrigeração"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input
                    value={empresaData.cnpj}
                    onChange={(e) => setEmpresaData({...empresaData, cnpj: e.target.value})}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={empresaData.telefone}
                    onChange={(e) => setEmpresaData({...empresaData, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={empresaData.endereco}
                  onChange={(e) => setEmpresaData({...empresaData, endereco: e.target.value})}
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Primeiro Técnico */}
          {step === 2 && (
            <form onSubmit={handleTecnicoNext} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Cadastrar Técnico</h3>
                  <p className="text-sm text-muted-foreground">Adicione o primeiro técnico da equipe</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome do Técnico *</Label>
                <Input
                  value={tecnicoData.nome}
                  onChange={(e) => setTecnicoData({...tecnicoData, nome: e.target.value})}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={tecnicoData.email}
                    onChange={(e) => setTecnicoData({...tecnicoData, email: e.target.value})}
                    placeholder="joao@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={tecnicoData.telefone}
                    onChange={(e) => setTecnicoData({...tecnicoData, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Especialidade</Label>
                <select
                  value={tecnicoData.especialidade}
                  onChange={(e) => setTecnicoData({...tecnicoData, especialidade: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="refrigeracao">Refrigeração</option>
                  <option value="climatizacao">Climatização</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Primeiro Cliente */}
          {step === 3 && (
            <form onSubmit={handleClienteSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Cadastrar Cliente</h3>
                  <p className="text-sm text-muted-foreground">Adicione o primeiro cliente</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input
                  value={clienteData.nome}
                  onChange={(e) => setClienteData({...clienteData, nome: e.target.value})}
                  placeholder="Ex: Shopping Center Plaza"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    value={clienteData.telefone}
                    onChange={(e) => setClienteData({...clienteData, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={clienteData.email}
                    onChange={(e) => setClienteData({...clienteData, email: e.target.value})}
                    placeholder="contato@cliente.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Estabelecimento</Label>
                <select
                  value={clienteData.tipo_estabelecimento}
                  onChange={(e) => setClienteData({...clienteData, tipo_estabelecimento: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="hospitalar">Hospitalar</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={clienteData.endereco}
                  onChange={(e) => setClienteData({...clienteData, endereco: e.target.value})}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Finalizando...
                    </>
                  ) : (
                    <>
                      Finalizar Configuração
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {setupMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-semibold mb-2">Erro ao configurar empresa:</p>
              <p className="text-red-600 text-sm">
                {setupMutation.error?.message || "Ocorreu um erro. Por favor, tente novamente."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
