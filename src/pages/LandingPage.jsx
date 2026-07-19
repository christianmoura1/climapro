
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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
  TrendingUp,
  Lock,
  Sparkles,
  PlayCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    window.__climapro_initialized = true;
  }, []);

  const handleComecarAgora = async () => {
    setIsLoading(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      navigate(createPageUrl(isAuth ? "Welcome" : "InitialChoice"));
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
      description: "Controle completo de solicitações, do início ao fim, com Kanban visual.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Calendar,
      title: "PMOC Automatizado",
      description: "Cronogramas automáticos de manutenção preventiva por equipamento.",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      icon: Users,
      title: "Controle de Técnicos",
      description: "Gerencie equipe, desempenho e gastos operacionais em um só lugar.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Calendar,
      title: "Agenda Integrada",
      description: "Visualização diária, semanal e mensal com sincronização de rotas.",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: DollarSign,
      title: "Financeiro Completo",
      description: "Receitas, despesas e relatórios detalhados por técnico e período.",
      color: "from-teal-500 to-teal-600"
    },
    {
      icon: FileText,
      title: "Nota Fiscal Eletrônica",
      description: "Emissão automática de NFS-e integrada ao fechamento do serviço.",
      color: "from-pink-500 to-pink-600"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "Gratuito",
      description: "Ideal para começar",
      features: ["Até 5 chamados/mês", "1 técnico", "1 cliente", "Agenda básica", "Suporte por email"],
      highlighted: false
    },
    {
      name: "Essencial",
      price: "R$ 49,90/mês",
      description: "Para pequenas empresas",
      features: ["Chamados ilimitados", "Até 2 técnicos", "Até 3 clientes", "Agenda avançada", "Suporte prioritário"],
      highlighted: false
    },
    {
      name: "Profissional",
      price: "R$ 99,90/mês",
      description: "Para empresas em crescimento",
      features: ["Chamados ilimitados", "Até 5 técnicos", "Até 10 clientes", "PMOC completo", "Controle financeiro", "Relatórios avançados"],
      highlighted: true
    },
    {
      name: "Corporativo",
      price: "R$ 149,90/mês",
      description: "Solução completa multiempresa",
      features: ["Chamados ilimitados", "Até 15 técnicos", "Até 30 clientes", "Até 3 empresas", "Emissão de notas fiscais", "Suporte 24/7"],
      highlighted: false
    },
    {
      name: "Enterprise",
      price: "Sob consulta",
      description: "Recursos ilimitados",
      features: ["Recursos ilimitados", "Técnicos ilimitados", "Clientes ilimitados", "Empresas ilimitadas", "API completa", "White Label", "Suporte dedicado"],
      highlighted: false,
      premium: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <Snowflake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">ClimaPro</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">CRM Operacional</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
              <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            </nav>
            <Button onClick={handleComecarAgora} disabled={isLoading} className="rounded-full px-5 shadow-sm">
              {isLoading ? "Carregando..." : "Acessar Sistema"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-40 -right-32 w-[420px] h-[420px] rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[380px] h-[380px] rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-6 bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Multi-empresa, com dados isolados de verdade
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.05]">
              O CRM operacional para{" "}
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                refrigeração e climatização
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Chamados, PMOC, técnicos, agenda, financeiro e notas fiscais em um só sistema.
              Profissional, seguro e fácil de usar desde o primeiro dia.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Button
                onClick={handleComecarAgora}
                size="lg"
                className="rounded-full text-base px-8 h-12 shadow-md hover:shadow-lg transition-shadow"
                disabled={isLoading}
              >
                {isLoading ? "Carregando..." : "Começar Gratuitamente"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full text-base px-8 h-12"
                onClick={() => document.getElementById("funcionalidades")?.scrollIntoView({ behavior: "smooth" })}
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Ver Funcionalidades
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-emerald-600" /> Dados isolados por empresa</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-600" /> Setup em minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-purple-600" /> Sem cartão no plano grátis</span>
            </motion.div>
          </motion.div>

          {/* Product preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-blue-900/10 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Chamados Pendentes", value: "12", color: "text-orange-600", bg: "bg-orange-100" },
                  { label: "Chamados Finalizados", value: "48", color: "text-emerald-600", bg: "bg-emerald-100" },
                  { label: "PMOCs Ativos", value: "9", color: "text-blue-600", bg: "bg-blue-100" },
                  { label: "Lucro Mensal", value: "R$ 8.4k", color: "text-purple-600", bg: "bg-purple-100" }
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-border p-4">
                    <div className={`w-8 h-8 rounded-lg ${kpi.bg} mb-3`} />
                    <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                ))}
                <div className="col-span-2 lg:col-span-4 rounded-xl border border-border p-4 h-32 bg-gradient-to-br from-blue-50 to-purple-50 flex items-end gap-2 px-6">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h3 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
              Funcionalidades completas
            </h3>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Tudo que sua empresa de refrigeração precisa, sem depender de planilhas soltas.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeUp}>
                <Card className="h-full border-none shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 rounded-2xl">
                  <CardContent className="p-7">
                    <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 shadow-sm`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid lg:grid-cols-3 gap-10"
          >
            {[
              { icon: Shield, title: "100% Seguro", desc: "Cada empresa tem seus dados totalmente isolados, com autenticação e permissões por perfil.", color: "bg-blue-600" },
              { icon: TrendingUp, title: "Mais Produtividade", desc: "Automatize lembretes de manutenção e fluxos de aprovação — menos tempo em tarefas manuais.", color: "bg-emerald-600" },
              { icon: Zap, title: "Fácil de Usar", desc: "Interface pensada pro dia a dia de técnicos em campo, sem curva de aprendizado.", color: "bg-purple-600" }
            ].map((pillar) => (
              <motion.div key={pillar.title} variants={fadeUp} className="text-center">
                <div className={`w-14 h-14 ${pillar.color} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md`}>
                  <pillar.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold text-foreground mb-2">{pillar.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{pillar.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h3 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">Planos e preços</h3>
            <p className="text-lg text-muted-foreground">Escolha o plano ideal para o tamanho da sua empresa</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5"
          >
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={fadeUp}>
                <Card
                  className={`h-full rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                    plan.highlighted
                      ? "border-2 border-blue-600 shadow-xl scale-[1.03]"
                      : plan.premium
                      ? "border-2 border-purple-700 shadow-sm"
                      : "border border-border shadow-sm hover:shadow-md"
                  }`}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    {plan.highlighted && (
                      <Badge className="mb-4 w-fit bg-blue-600 rounded-full">Mais Popular</Badge>
                    )}
                    {plan.premium && (
                      <Badge className="mb-4 w-fit bg-purple-700 rounded-full">Premium</Badge>
                    )}
                    <h4 className="text-lg font-bold text-foreground mb-1">{plan.name}</h4>
                    <p className="text-muted-foreground mb-4 text-sm">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    </div>
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full rounded-full ${
                        plan.highlighted ? "" : plan.premium ? "bg-purple-700 hover:bg-purple-800" : ""
                      }`}
                      variant={plan.highlighted || plan.premium ? "default" : "outline"}
                      onClick={handleComecarAgora}
                      disabled={isLoading}
                    >
                      Começar Agora
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative"
        >
          <h3 className="text-3xl lg:text-5xl font-bold tracking-tight text-white mb-5">
            Pronto para transformar sua gestão?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Crie sua empresa agora e comece a usar em minutos — sem cartão de crédito.
          </p>
          <Button
            size="lg"
            onClick={handleComecarAgora}
            disabled={isLoading}
            className="rounded-full bg-white text-blue-700 hover:bg-blue-50 text-base px-8 h-12 shadow-lg"
          >
            {isLoading ? "Carregando..." : "Começar Gratuitamente"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
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
            <p>&copy; {new Date().getFullYear()} ClimaPro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
