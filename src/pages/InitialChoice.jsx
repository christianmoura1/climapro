import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Snowflake, LogIn, Building2, ArrowRight } from "lucide-react";

export default function InitialChoice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se usuário já está autenticado
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          // Se já está autenticado, redirecionar para Welcome (que fará o roteamento correto)
          navigate(createPageUrl("Welcome"));
          return;
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleEntrarSistema = () => {
    // Redirecionar para login do Base44, mas SEMPRE redirecionar para Welcome após login
    // Isso garante que Welcome faça o roteamento correto baseado no tipo de usuário
    base44.auth.redirectToLogin(createPageUrl("Welcome"));
  };

  const handleCriarEmpresa = () => {
    // Redirecionar para login com parâmetro indicando criação de empresa
    const urlWithParam = `${createPageUrl("Welcome")}?action=criar_empresa`;
    base44.auth.redirectToLogin(urlWithParam);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full shadow-2xl border-none">
        <CardContent className="p-12">
          {/* Logo e Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Snowflake className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Bem-vindo ao ClimaPro! 🌬️
            </h1>
            <p className="text-lg text-muted-foreground">
              Escolha se deseja entrar no sistema ou cadastrar sua empresa
            </p>
          </div>

          {/* Opções */}
          <div className="space-y-4">
            {/* Entrar no Sistema */}
            <button
              onClick={handleEntrarSistema}
              className="w-full group"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-8 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                      <LogIn className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Entrar no Sistema</h3>
                      <p className="text-blue-100">
                        Acesse sua conta como técnico, cliente ou administrador
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </button>

            {/* Criar Nova Empresa */}
            <button
              onClick={handleCriarEmpresa}
              className="w-full group"
            >
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl p-8 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Criar Nova Empresa</h3>
                      <p className="text-purple-100">
                        Cadastre sua empresa e comece a usar o sistema
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          {/* Informações adicionais */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              Já possui conta mas esqueceu a senha? 
              <button 
                onClick={handleEntrarSistema}
                className="text-blue-600 hover:text-blue-700 font-medium ml-1"
              >
                Clique aqui para recuperar
              </button>
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-blue-600 font-bold text-2xl mb-1">100%</div>
              <div className="text-muted-foreground text-sm">Seguro</div>
            </div>
            <div>
              <div className="text-purple-600 font-bold text-2xl mb-1">24/7</div>
              <div className="text-muted-foreground text-sm">Disponível</div>
            </div>
            <div>
              <div className="text-green-600 font-bold text-2xl mb-1">Grátis</div>
              <div className="text-muted-foreground text-sm">Teste 30 dias</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}