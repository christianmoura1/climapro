import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, DollarSign, XCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ConfiguracaoFiscalForm from "../components/notasfiscais/ConfiguracaoFiscalForm";
import EmitirNotaForm from "../components/notasfiscais/EmitirNotaForm";
import ListaNotasFiscais from "../components/notasfiscais/ListaNotasFiscais";

export default function NotasFiscaisPage() {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showEmitir, setShowEmitir] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.empresa_id) {
        const empresas = await base44.entities.Empresa.list();
        const minhaEmpresa = empresas.find(e => e.id === currentUser.empresa_id);
        setEmpresa(minhaEmpresa);
      }
    };
    loadData();
  }, []);

  // Verificar se tem acesso ao módulo de notas fiscais (plano avançado ou admin)
  const temAcesso = empresa?.plano === 'avancado' || user?.email === "christianmoura2014@gmail.com";

  const { data: configuracaoFiscal } = useQuery({
    queryKey: ['configuracao-fiscal', user?.empresa_id],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoFiscal.list();
      return configs.find(c => c.empresa_id === user.empresa_id);
    },
    enabled: !!user?.empresa_id && temAcesso
  });

  const { data: notasFiscais = [] } = useQuery({
    queryKey: ['notas-fiscais', user?.empresa_id],
    queryFn: async () => {
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.NotaFiscal.list('-data_emissao');
      }
      return base44.entities.NotaFiscal.filter(
        { empresa_id: user.empresa_id },
        '-data_emissao'
      );
    },
    enabled: !!user && temAcesso
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', user?.empresa_id],
    queryFn: async () => {
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.Cliente.list();
      }
      return base44.entities.Cliente.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  // Calcular estatísticas
  const totalEmitidas = notasFiscais.filter(n => n.status === 'emitida').length;
  const totalCanceladas = notasFiscais.filter(n => n.status === 'cancelada').length;
  const receitaBruta = notasFiscais
    .filter(n => n.status === 'emitida')
    .reduce((sum, n) => sum + (n.valor_bruto || 0), 0);
  const receitaLiquida = notasFiscais
    .filter(n => n.status === 'emitida')
    .reduce((sum, n) => sum + (n.valor_liquido || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Bloqueio para planos inferiores
  if (!temAcesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Notas Fiscais</h1>
              <p className="text-muted-foreground mt-1">Emissão e gerenciamento de NFS-e</p>
            </div>
          </div>

          <Card className="shadow-2xl border-2 border-indigo-200">
            <CardContent className="p-12 text-center">
              <FileText className="w-20 h-20 text-indigo-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Recurso disponível apenas no Plano Avançado
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                O módulo de Emissão de Notas Fiscais Eletrônicas (NFS-e) está disponível 
                apenas para assinantes do plano Avançado.
              </p>
              <Link to={createPageUrl("Planos")}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6">
                  Ver Planos e Fazer Upgrade
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Verificar se configuração fiscal está completa
  if (!configuracaoFiscal && !showConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Notas Fiscais</h1>
              <p className="text-muted-foreground mt-1">Configure seus dados fiscais primeiro</p>
            </div>
          </div>

          <Card className="shadow-lg border-none">
            <CardContent className="p-12 text-center">
              <Settings className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Configure seus Dados Fiscais
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Antes de emitir notas fiscais, você precisa configurar os dados fiscais 
                da sua empresa (CNPJ, Inscrição Municipal, Token API, etc.).
              </p>
              <Button
                onClick={() => setShowConfig(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4"
              >
                <Settings className="w-5 h-5 mr-2" />
                Configurar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showConfig) {
    return (
      <ConfiguracaoFiscalForm
        configuracao={configuracaoFiscal}
        empresa={empresa}
        user={user}
        onClose={() => setShowConfig(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Notas Fiscais</h1>
              <p className="text-muted-foreground mt-1">Emissão e gerenciamento de NFS-e</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            <Button
              onClick={() => setShowEmitir(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Emitir Nota
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Emitidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{totalEmitidas}</p>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Canceladas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{totalCanceladas}</p>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-600">
                  R$ {receitaBruta.toFixed(2)}
                </p>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Líquida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-blue-600">
                  R$ {receitaLiquida.toFixed(2)}
                </p>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário de Emissão */}
        {showEmitir && (
          <EmitirNotaForm
            configuracaoFiscal={configuracaoFiscal}
            clientes={clientes}
            empresa={empresa}
            user={user}
            onClose={() => setShowEmitir(false)}
          />
        )}

        {/* Lista de Notas Fiscais */}
        <ListaNotasFiscais
          notas={notasFiscais}
          clientes={clientes}
        />
      </div>
    </div>
  );
}