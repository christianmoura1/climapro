
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CheckCircle, 
  Crown, 
  Zap,
  AlertTriangle,
  MessageCircle,
  CreditCard,
  Users,
  Building2,
  ClipboardList,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const planosDisponiveis = [
  {
    id: "free",
    nome: "Free",
    preco: "Gratuito",
    valor: 0,
    cor: "bg-gray-500",
    corClara: "bg-muted",
    icone: Zap,
    limites: {
      tecnicos: 1,
      clientes: 1,
      empresas: 1,
      chamados: "5/mês"
    },
    features: [
      "Até 5 chamados por mês",
      "1 técnico",
      "1 cliente",
      "Agenda básica",
      "Suporte por email"
    ],
    modulos: ["Chamados", "Clientes", "Agenda"]
  },
  {
    id: "essencial",
    nome: "Essencial",
    preco: "R$ 49,90/mês",
    valor: 49.90,
    cor: "bg-blue-600",
    corClara: "bg-blue-100",
    icone: Users,
    limites: {
      tecnicos: 2,
      clientes: 3,
      empresas: 1,
      chamados: "ilimitado"
    },
    features: [
      "Chamados ilimitados",
      "Até 2 técnicos",
      "Até 3 clientes",
      "Agenda avançada",
      "Suporte prioritário"
    ],
    modulos: ["Chamados", "Clientes", "Técnicos", "Agenda"],
    popular: false
  },
  {
    id: "profissional",
    nome: "Profissional",
    preco: "R$ 99,90/mês",
    valor: 99.90,
    cor: "bg-green-600",
    corClara: "bg-green-100",
    icone: Building2,
    limites: {
      tecnicos: 5,
      clientes: 10,
      empresas: 1,
      chamados: "ilimitado"
    },
    features: [
      "Chamados ilimitados",
      "Até 5 técnicos",
      "Até 10 clientes",
      "PMOC completo",
      "Controle financeiro",
      "Relatórios avançados"
    ],
    modulos: ["Chamados", "Clientes", "Técnicos", "PMOC", "Financeiro", "Agenda"],
    popular: true
  },
  {
    id: "corporativo",
    nome: "Corporativo",
    preco: "R$ 149,90/mês",
    valor: 149.90,
    cor: "bg-orange-600",
    corClara: "bg-orange-100",
    icone: ClipboardList,
    limites: {
      tecnicos: 15,
      clientes: 30,
      empresas: 3,
      chamados: "ilimitado"
    },
    features: [
      "Chamados ilimitados",
      "Até 15 técnicos",
      "Até 30 clientes",
      "Até 3 empresas",
      "Emissão de notas fiscais",
      "Multiempresa",
      "Suporte 24/7"
    ],
    modulos: ["Todos os módulos", "Notas Fiscais", "Multiempresa"],
    popular: false
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Sob consulta",
    valor: null,
    cor: "bg-purple-900",
    corClara: "bg-purple-100",
    icone: Crown,
    limites: {
      tecnicos: "ilimitado",
      clientes: "ilimitado",
      empresas: "ilimitado",
      chamados: "ilimitado"
    },
    features: [
      "Recursos ilimitados",
      "Técnicos ilimitados",
      "Clientes ilimitados",
      "Empresas ilimitadas",
      "API completa",
      "White Label",
      "Suporte dedicado"
    ],
    modulos: ["Todos os módulos", "API", "White Label", "Consultoria"],
    destaque: true
  }
];

export default function PlanosPage() {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.empresa_id) {
          const empresas = await base44.entities.Empresa.list();
          const minhaEmpresa = empresas.find(e => e.id === currentUser.empresa_id);
          setEmpresa(minhaEmpresa);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();
  }, []);

  const { data: chamadosMes = [] } = useQuery({
    queryKey: ['chamados-mes'],
    queryFn: async () => {
      const chamados = await base44.entities.Chamado.list();
      const inicioMes = new Date();
      inicioMes.setDate(1);
      return chamados.filter(c => new Date(c.created_date) >= inicioMes);
    },
    enabled: !!empresa
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', empresa?.id],
    queryFn: () => base44.entities.Tecnico.filter({ empresa_id: empresa.id }),
    enabled: !!empresa
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', empresa?.id],
    queryFn: () => base44.entities.Cliente.filter({ empresa_id: empresa.id }),
    enabled: !!empresa
  });

  const handleSolicitarPlano = async (plano) => {
    if (plano.id === 'enterprise') {
      // Redirecionar para WhatsApp do admin
      const mensagem = `Olá! Gostaria de saber mais sobre o plano Enterprise para minha empresa: ${empresa?.nome}`;
      window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(mensagem)}`, '_blank');
      return;
    }

    // Enviar solicitação para o admin
    await base44.integrations.Core.SendEmail({
      to: "christianmoura2014@gmail.com",
      subject: `Solicitação de Upgrade - ${empresa?.nome}`,
      body: `Empresa: ${empresa?.nome}\nPlano solicitado: ${plano.nome} (${plano.preco})\nPlano atual: ${empresa?.plano}\nContato: ${user?.email}\n\nPor favor, entre em contato para finalizar a contratação.`
    });

    alert(`✅ Solicitação enviada!\n\nEm breve entraremos em contato pelo WhatsApp ou e-mail para finalizar a contratação do plano ${plano.nome}.`);
  };

  const planoAtual = planosDisponiveis.find(p => p.id === empresa?.plano) || planosDisponiveis[0];
  
  // Calcular uso atual
  const chamadosUsados = chamadosMes.length;
  const tecnicosUsados = tecnicos.length;

  // Verificar se atingiu limites
  const limitesChamados = empresa?.limite_chamados_mes || 5;
  const limitesTecnicos = empresa?.limite_tecnicos || 1;

  const atingiuLimiteChamados = chamadosUsados >= limitesChamados && limitesChamados !== 999999;
  const atingiuLimiteTecnicos = tecnicosUsados >= limitesTecnicos && limitesTecnicos !== 999999;

  const atingiuAlgumLimite = atingiuLimiteChamados || atingiuLimiteTecnicos;

  // Sugerir próximo plano lógico
  const sugerirProximoPlano = () => {
    const planoAtualIndex = planosDisponiveis.findIndex(p => p.id === empresa?.plano);
    if (planoAtualIndex < planosDisponiveis.length - 1) {
      return planosDisponiveis[planoAtualIndex + 1];
    }
    return null;
  };

  const planoSugerido = sugerirProximoPlano();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planos e Assinaturas</h1>
            <p className="text-muted-foreground mt-1">Escolha o melhor plano para sua empresa</p>
          </div>
        </div>

        {/* Alerta de Limite Atingido */}
        {atingiuAlgumLimite && planoSugerido && (
          <Card className="mb-8 border-2 border-orange-500 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    ⚠️ Limite do Plano Atingido!
                  </h3>
                  <p className="text-foreground mb-4">
                    {atingiuLimiteChamados && `Você atingiu o limite de ${limitesChamados} chamados/mês. `}
                    {atingiuLimiteTecnicos && `Você atingiu o limite de ${limitesTecnicos} técnicos. `}
                    <strong>Faça upgrade para continuar utilizando o ClimaPro!</strong>
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        const element = document.getElementById(`plano-${planoSugerido.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Ver Plano Recomendado
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {empresa && planoAtual && (
          <Card className="mb-8 shadow-lg border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Seu Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Plano</p>
                  <Badge className={`${planoAtual.cor} text-white text-lg px-4 py-1`}>
                    {planoAtual.nome}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Chamados este mês</p>
                  <p className={`text-2xl font-bold ${atingiuLimiteChamados ? 'text-red-600' : 'text-foreground'}`}>
                    {chamadosUsados} / {limitesChamados === 999999 ? '∞' : limitesChamados}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Técnicos</p>
                  <p className={`text-2xl font-bold ${atingiuLimiteTecnicos ? 'text-red-600' : 'text-foreground'}`}>
                    {tecnicosUsados} / {limitesTecnicos === 999999 ? '∞' : limitesTecnicos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grade de Planos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {planosDisponiveis.map((plano, index) => {
            const isPlanoAtual = plano.id === empresa?.plano;
            const Icon = plano.icone;
            const isSugerido = planoSugerido?.id === plano.id;
            
            return (
              <Card 
                key={plano.id}
                id={`plano-${plano.id}`}
                className={`shadow-lg hover:shadow-2xl transition-all ${
                  plano.popular ? 'border-2 border-blue-600 scale-105' : 'border-none'
                } ${
                  plano.destaque ? 'border-2 border-purple-900' : ''
                } ${
                  isSugerido ? 'ring-4 ring-orange-400 animate-pulse' : ''
                }`}
              >
                <CardHeader className={`${plano.corClara}`}>
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 ${plano.cor} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {plano.popular && (
                      <Badge className="bg-blue-600 text-white">Mais Popular</Badge>
                    )}
                    {plano.destaque && (
                      <Badge className="bg-purple-900 text-white">Premium</Badge>
                    )}
                    {isSugerido && (
                      <Badge className="bg-orange-600 text-white animate-pulse">
                        <Star className="w-3 h-3 mr-1" />
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl mt-4">{plano.nome}</CardTitle>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {plano.preco}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Limites */}
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-foreground mb-3">Limites</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Técnicos:</span>
                        <span className="font-semibold">{plano.limites.tecnicos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clientes:</span>
                        <span className="font-semibold">{plano.limites.clientes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empresas:</span>
                        <span className="font-semibold">{plano.limites.empresas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chamados:</span>
                        <span className="font-semibold">{plano.limites.chamados}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plano.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Módulos */}
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-2">Módulos Inclusos:</h4>
                    <div className="flex flex-wrap gap-2">
                      {plano.modulos.map((modulo, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {modulo}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Botão */}
                  {isPlanoAtual ? (
                    <Button className="w-full bg-gray-500" disabled>
                      <Crown className="w-4 h-4 mr-2" />
                      Plano Atual
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        className={`w-full ${plano.cor} text-white hover:opacity-90 ${
                          isSugerido ? 'ring-2 ring-orange-400' : ''
                        }`}
                        onClick={() => handleSolicitarPlano(plano)}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {isSugerido ? 'Fazer Upgrade Agora' : 'Solicitar Upgrade'}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Entraremos em contato para finalizar
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Formas de Pagamento */}
        <Card className="mt-8 shadow-lg border-none">
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <MessageCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Contato direto com admin</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold">PIX</p>
                  <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <CreditCard className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="font-semibold">Cartão de Crédito</p>
                  <p className="text-sm text-muted-foreground">Recorrência mensal</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
