import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BloqueioModulo({ nomeModulo }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-2xl border-2 border-red-200">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Módulo Desativado
          </h2>
          <p className="text-gray-600 mb-6">
            O módulo <strong>{nomeModulo}</strong> está desativado para sua conta.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Entre em contato com o administrador para ativar este recurso.
          </p>
          <Link to={createPageUrl("Dashboard")}>
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}