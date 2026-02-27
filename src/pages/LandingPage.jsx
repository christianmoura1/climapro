
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Snowflake,
  ClipboardList,
  Calendar,
  Users,
  DollarSign,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  // Marcar inicialização
  React.useEffect(() => {
    console.log('[CLIMAPRO-BOOT] Landing Page carregada');
    window.__climapro_initialized = true;
  }, []);

  const handleComecarAgora = async () => {
    setIsLoading(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        // Se já está autenticado, redirecionar para Welcome
        navigate(createPageUrl("Welcome"));
      } else {
        // Se não está autenticado, mostrar opções de entrada
        navigate(createPageUrl("InitialChoice"));
      }
    } catch (error) {
      console.error('[CLIMAPRO-BOOT] Erro ao verificar autenticação:', error);
      navigate(createPageUrl("InitialChoice"));
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: ClipboardList,
      title: "Gestão de Chamados",
      description: "Controle completo de solicitações, do início ao fim",
      color: "bg-blue-500"
    },
    {
      icon: Calendar,
      title: "PMOC Automatizado",
      description: "Cronogramas automáticos de manutenção preventiva",
      color: "bg-green-500"
    },
    {
      icon: Users,
      title: "Controle de Técnicos",
      description: "Gerencie equipe, desempenho e gastos operacionais",
      color: "bg-purple-500"
    },
    {
      icon: Calendar,
      title: "Agenda Integrada",
      description: "Visualização e sincronização com Google Calendar",
      color: "bg-orange-500"
    },
    {
      icon: DollarSign,
      title: "Financeiro Completo",
      description: "Receitas, despesas e relatórios detalhados",
      color: "bg-emerald-500"
    },
    {
      icon: FileText,
      title: "Nota Fiscal Eletrônica",
      description: "Emissão automática de NFS-e integrada",
      color: "bg-pink-500"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "Gratuito",
      description: "Ideal para começar",
      features: [
        "Até 5 chamados/mês",
        "1 técnico",
        "1 cliente",
        "Agenda básica",
        "Suporte por email"
      ],
      highlighted: false
    },
    {
      name: "Essencial",
      price: "R$ 49,90/mês",
      description: "Para pequenas empresas",
      features: [
        "Chamados ilimitados",
        "Até 2 técnicos",
        "Até 3 clientes",
        "Agenda avançada",
        "Suporte prioritário"
      ],
      highlighted: false
    },
    {
      name: "Profissional",
      price: "R$ 99,90/mês",
      description: "Para empresas em crescimento",
      features: [
        "Chamados ilimitados",
        "Até 5 técnicos",
        "Até 10 clientes",
        "PMOC completo",
        "Controle financeiro",
        "Relatórios avançados"
      ],
      highlighted: true
    },
    {
      name: "Corporativo",
      price: "R$ 149,90/mês",
      description: "Solução completa multiempresa",
      features: [
        "Chamados ilimitados",
        "Até 15 técnicos",
        "Até 30 clientes",
        "Até 3 empresas",
        "Emissão de notas fiscais",
        "Suporte 24/7"
      ],
      highlighted: false
    },
    {
      name: "Enterprise",
      price: "Sob consulta",
      description: "Recursos ilimitados",
      features: [
        "Recursos ilimitados",
        "Técnicos ilimitados",
        "Clientes ilimitados",
        "Empresas ilimitadas",
        "API completa",
        "White Label",
        "Suporte dedicado"
      ],
      highlighted: false,
      premium: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Snowflake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ClimaPro</h1>
                <p className="text-xs text-gray-500">CRM Operacional</p>
              </div>
            </div>
            <Button
              onClick={handleComecarAgora}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Carregando..." : "Acessar Sistema"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
              <Zap className="w-3 h-3 mr-1" />
              Sistema completo para sua empresa
            </Badge>
            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              O CRM Operacional completo para<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                empresas de refrigeração e climatização
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Gerencie chamados, PMOC, técnicos, agenda, financeiro e notas fiscais em um só sistema.
              Profissional, seguro e fácil de usar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleComecarAgora}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
                disabled={isLoading}
              >
                {isLoading ? "Carregando..." : "Começar Agora"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8"
                onClick={handleComecarAgora}
                disabled={isLoading}
              >
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades Completas
            </h3>
            <p className="text-xl text-gray-600">
              Tudo que você precisa para gerenciar sua empresa de refrigeração
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(function(feature, index) {
              var Icon = feature.icon;
              return (
                <Card key={index} className="h-full hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-white to-gray-50">
                  <CardContent className="p-6">
                    <div className={"w-12 h-12 " + feature.color + " rounded-xl flex items-center justify-center mb-4"}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">100% Seguro</h4>
              <p className="text-gray-600">
                Seus dados protegidos com criptografia e isolamento total entre empresas
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Aumente a Produtividade</h4>
              <p className="text-gray-600">
                Automatize processos e economize até 10 horas por semana
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Fácil de Usar</h4>
              <p className="text-gray-600">
                Interface intuitiva e suporte dedicado para sua equipe
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planos e Preços
            </h3>
            <p className="text-xl text-gray-600">
              Escolha o plano ideal para o tamanho da sua empresa
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {plans.map(function(plan, index) {
              return (
                <Card key={index} className={(plan.highlighted ? 'border-2 border-blue-600 shadow-2xl' : plan.premium ? 'border-2 border-purple-900' : 'border-gray-200')}>
                  <CardContent className="p-6">
                    {plan.highlighted && (
                      <Badge className="mb-4 bg-blue-600">Mais Popular</Badge>
                    )}
                    {plan.premium && (
                      <Badge className="mb-4 bg-purple-900">Premium</Badge>
                    )}
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h4>
                    <p className="text-gray-600 mb-4 text-sm">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price}
                      </span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map(function(feature, i) {
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      className={(plan.highlighted ? 'bg-blue-600 hover:bg-blue-700' : plan.premium ? 'bg-purple-900 hover:bg-purple-950' : '') + ' w-full'}
                      variant={plan.highlighted || plan.premium ? 'default' : 'outline'}
                      onClick={handleComecarAgora}
                      disabled={isLoading}
                    >
                      Começar Agora
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Pronto para transformar sua gestão?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a dezenas de empresas que já utilizam o ClimaPro
          </p>
          <Button
            size="lg"
            onClick={handleComecarAgora}
            disabled={isLoading}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8"
          >
            {isLoading ? "Carregando..." : "Começar Gratuitamente"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Snowflake className="w-6 h-6" />
                <span className="font-bold text-lg">ClimaPro</span>
              </div>
              <p className="text-gray-400 text-sm">
                O CRM completo para empresas de refrigeração e climatização
              </p>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Produto</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Funcionalidades</li>
                <li>Planos e Preços</li>
                <li>Demonstração</li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Empresa</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Sobre Nós</li>
                <li>Contato</li>
                <li>Blog</li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Política de Privacidade</li>
                <li>Termos de Uso</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 ClimaPro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
