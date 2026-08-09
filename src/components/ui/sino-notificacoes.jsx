import React from "react";
import { Link } from "react-router-dom";
import { Bell, Check, BellOff, AlertTriangle, CalendarClock, Cpu, FileSignature, UserX, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPageUrl } from "@/utils";
import { useAlertas } from "@/hooks/useAlertas";

// Cada tipo sabe para onde levar. Alerta sem destino vira só reclamação; o
// valor está em abrir já na tela onde dá para agir.
const CONFIG_TIPO = {
  pmoc_atrasado: { icone: CalendarClock, pagina: 'PMOC' },
  pmoc_proximo: { icone: CalendarClock, pagina: 'PMOC' },
  equipamento_recorrente: { icone: Cpu, pagina: 'Equipamentos' },
  orcamento_parado: { icone: FileSignature, pagina: 'Orcamentos' },
  cliente_sumido: { icone: UserX, pagina: 'Clientes' },
  // do cliente: o portal é uma página só, então tudo aponta para lá
  visita_agendada: { icone: CalendarClock, pagina: null },
  orcamento_aguardando_voce: { icone: FileSignature, pagina: null },
  relatorio_disponivel: { icone: FileText, pagina: null },
};

const COR_SEVERIDADE = {
  alta: 'text-red-600',
  media: 'text-amber-600',
  baixa: 'text-muted-foreground',
};

const ORDEM = { alta: 0, media: 1, baixa: 2 };

// Sino de notificações. O mesmo nos três painéis — empresa, técnico e cliente.
// Quem separa o que cada um vê é a policy de RLS em `alerta`: o cliente só
// enxerga o que foi endereçado a ele, e nunca os alertas de operação.
//
// `verTudoEm` é opcional: nos painéis de técnico e cliente não existe página de
// alertas, então o rodapé some em vez de levar para uma rota inexistente.
export default function SinoNotificacoes({ verTudoEm = null, className = "" }) {
  const { abertos, naoLidos, mudarStatus } = useAlertas();
  const [aberto, setAberto] = React.useState(false);

  const lista = [...abertos]
    .sort((a, b) => (ORDEM[a.severidade] - ORDEM[b.severidade]) || (new Date(b.created_at) - new Date(a.created_at)))
    .slice(0, 8);

  const marcarTodosLidos = () => {
    naoLidos.forEach((a) => mudarStatus.mutate({ id: a.id, status: 'lido' }));
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
          aria-label={naoLidos.length > 0 ? `Notificações: ${naoLidos.length} não lida(s)` : 'Notificações'}
        >
          <Bell className="h-5 w-5" />
          {naoLidos.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
              {naoLidos.length > 9 ? '9+' : naoLidos.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold text-foreground">Notificações</p>
          {naoLidos.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={marcarTodosLidos}>
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {lista.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nada por aqui agora.</p>
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y overflow-y-auto">
            {lista.map((alerta) => {
              const tipo = CONFIG_TIPO[alerta.tipo] || { icone: AlertTriangle, pagina: null };
              const Icone = tipo.icone;
              const conteudo = (
                <div className="flex items-start gap-3">
                  <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${COR_SEVERIDADE[alerta.severidade] || ''}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${alerta.status === 'novo' ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                      {alerta.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{alerta.descricao}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {format(new Date(alerta.created_at), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );

              return (
                <li key={alerta.id} className={`px-4 py-3 ${alerta.status === 'novo' ? 'bg-indigo-50/50' : ''}`}>
                  {tipo.pagina ? (
                    <Link
                      to={createPageUrl(tipo.pagina)}
                      onClick={() => {
                        setAberto(false);
                        if (alerta.status === 'novo') mudarStatus.mutate({ id: alerta.id, status: 'lido' });
                      }}
                      className="block hover:opacity-80"
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    conteudo
                  )}

                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => mudarStatus.mutate({ id: alerta.id, status: 'resolvido' })}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Resolvido
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => mudarStatus.mutate({ id: alerta.id, status: 'dispensado' })}
                    >
                      <BellOff className="mr-1 h-3 w-3" />
                      Dispensar
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {verTudoEm && abertos.length > 0 && (
          <div className="border-t p-2">
            <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setAberto(false)}>
              <Link to={createPageUrl(verTudoEm)}>Ver todos ({abertos.length})</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
