import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useEmpresa } from "@/hooks/useEmpresa";

// Alertas abertos da empresa. Os alertas nascem no banco, numa rotina diária do
// pg_cron (migration 0018) — aqui só se lê e se muda o status.
export function useAlertas() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['alertas', empresa?.id],
    queryFn: () => base44.entities.Alerta.filter({ empresa_id: empresa.id }, '-created_date'),
    enabled: !!empresa?.id,
    // A rotina roda uma vez por dia, mas o alerta pode se resolver sozinho a
    // qualquer momento (o técnico executou, o cliente respondeu). Um minuto de
    // frescor evita mostrar o que já morreu sem ficar batendo no banco.
    staleTime: 60 * 1000,
  });

  const abertos = alertas.filter((a) => a.status === 'novo' || a.status === 'lido');
  const naoLidos = alertas.filter((a) => a.status === 'novo');

  const mudarStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Alerta.update(id, {
      status,
      ...(status === 'lido' ? { visto_em: new Date().toISOString() } : {}),
      ...(status === 'resolvido' ? { resolvido_em: new Date().toISOString() } : {}),
    }),
    onSuccess: () => queryClient.invalidateQueries(['alertas']),
  });

  return { alertas, abertos, naoLidos, isLoading, mudarStatus };
}
