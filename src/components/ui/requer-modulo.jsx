import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";
import { useEmpresa } from "@/hooks/useEmpresa";
import { NOME_MODULO, planoQueLibera } from "@/lib/planos";

// Trava de módulo por plano. Até agora modulos_ativos só filtrava o menu
// lateral, então digitar /Estoque na barra de endereço entrava em qualquer
// plano — o recurso estava vendido mas não estava fechado.
export default function RequerModulo({ modulo, children }) {
  const { temModulo, isLoading } = useEmpresa();

  if (isLoading) return <PageLoading />;
  if (temModulo(modulo)) return children;

  const nome = NOME_MODULO[modulo] || modulo;
  const plano = planoQueLibera(modulo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
      <div className="max-w-2xl mx-auto pt-12">
        <Card className="shadow-xl border-2 border-indigo-200">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-3">
              {nome} não está no seu plano
            </h1>

            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {plano
                ? `Este módulo faz parte do plano ${plano.nome}, a partir de ${plano.preco}.`
                : 'Fale com a gente para liberar este módulo na sua conta.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                <Link to={createPageUrl("Planos")}>
                  Ver planos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={createPageUrl("Dashboard")}>Voltar ao início</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
