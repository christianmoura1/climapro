import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { useEmpresa } from "@/hooks/useEmpresa";

// Faixa de cobrança. Até agora status_pagamento só pintava um badge no painel
// admin: o inadimplente continuava usando o sistema inteiro sem ver aviso
// nenhum.
//
// Bloqueado não perde acesso ao histórico — só para de gravar. Tirar do
// operador o cadastro que ele já fez seria pior para os dois lados, inclusive
// para a chance de receber depois.
export default function AvisoPagamento() {
  const { empresa, ehAdminGlobal } = useEmpresa();

  if (!empresa || ehAdminGlobal) return null;

  const status = empresa.status_pagamento;
  if (status !== 'pendente' && status !== 'bloqueado') return null;

  const bloqueado = status === 'bloqueado';

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium print:hidden ${
        bloqueado ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
      }`}
    >
      {bloqueado ? <Lock className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span className="text-center">
        {bloqueado
          ? 'Assinatura em atraso. Seus dados estão salvos, mas o cadastro está bloqueado até a regularização.'
          : 'Há uma fatura em aberto. Regularize para não perder o acesso ao cadastro.'}
      </span>
      <Button asChild size="sm" variant="secondary" className="h-7">
        <Link to={createPageUrl("Planos")}>Regularizar</Link>
      </Button>
    </div>
  );
}
