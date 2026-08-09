import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ehIlimitado } from "@/lib/planos";

// Empresa do usuário logado, com os helpers de plano. Fica em react-query para
// as várias telas que precisam disso compartilharem a mesma busca em vez de
// cada uma refazer o Empresa.list().
export function useEmpresa() {
  const { data: user } = useQuery({
    queryKey: ['usuario-atual'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const ehAdminGlobal = user?.role === 'admin' && !user?.empresa_id;

  const { data: empresa, isLoading } = useQuery({
    queryKey: ['empresa', user?.empresa_id],
    queryFn: async () => {
      const empresas = await base44.entities.Empresa.list();
      return empresas.find((e) => e.id === user.empresa_id) || null;
    },
    enabled: !!user?.empresa_id,
    staleTime: 5 * 60 * 1000,
  });

  const modulos = empresa?.modulos_ativos || {};

  // Admin global atravessa qualquer bloqueio: é quem dá suporte e precisa
  // enxergar a conta do cliente como ela é.
  const temModulo = (nome) => ehAdminGlobal || modulos[nome] === true;

  const limite = (nome) => {
    const valor = empresa?.[nome];
    return valor == null ? null : Number(valor);
  };

  const atingiuLimite = (nome, usoAtual) => {
    if (ehAdminGlobal) return false;
    const max = limite(nome);
    if (max == null || ehIlimitado(max)) return false;
    return usoAtual >= max;
  };

  return {
    user,
    empresa,
    isLoading: isLoading || !user,
    ehAdminGlobal,
    plano: empresa?.plano || 'free',
    modulos,
    temModulo,
    limite,
    atingiuLimite,
    // Inadimplente continua enxergando tudo, mas não grava nada. Perder acesso
    // ao histórico por causa de uma fatura atrasada seria pior para os dois
    // lados — inclusive para receber depois.
    somenteLeitura: !ehAdminGlobal && empresa?.status_pagamento === 'bloqueado',
  };
}
