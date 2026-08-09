import React from "react";
import { LABEL_PERIODICIDADE, PERIODICIDADES_PMOC, gerarCronogramaAnual } from "@/lib/pmocChecklist";
import { ChevronRight } from "lucide-react";

export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Grade do cronograma anual (equipamento × 12 meses), compartilhada entre o
// painel do cliente na página PMOC e o modal do Plano Anual. Cada mês é um
// único rótulo com a periodicidade calculada automaticamente — as opções de
// alteração só aparecem ao clicar nele (é um <select> estilizado como chip);
// escolher um valor reposiciona o calendário do ano inteiro.
export default function CronogramaAnualGrid({ equipamentos, ano, onAncorar, salvando, renderInfoEquipamento, visitas, onAlterarData, somenteLeitura }) {
  const scrollRef = React.useRef(null);
  const [showScrollHint, setShowScrollHint] = React.useState(true);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const chegouAoFim = element.scrollLeft + element.clientWidth >= element.scrollWidth - 24;
    setShowScrollHint(!chegouAoFim);
  };

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-xs font-medium text-indigo-700 lg:hidden">
        Deslize para ver os pr&oacute;ximos meses <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </p>
      <div className="relative rounded-lg border bg-card">
        <div ref={scrollRef} onScroll={handleScroll} className="scrollbar-thin overflow-x-auto" tabIndex={0} role="region" aria-label={`Cronograma anual de ${ano}. Use a rolagem horizontal para ver os 12 meses.`}>
          <table className="min-w-[1160px] w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="sticky left-0 z-20 min-w-[190px] border-r bg-muted p-3 font-semibold shadow-[6px_0_12px_-10px_rgba(15,23,42,0.8)]">Equipamento</th>
            {MESES_ABREV.map((m, idx) => {
              const visita = visitas?.[idx];
              return (
                <th key={m} className="p-2 font-medium text-center align-top">
                  <div>{m}</div>
                  {visita && (
                    onAlterarData ? (
                      <button
                        type="button"
                        onClick={() => onAlterarData(idx)}
                        title={`Alterar a data da visita de ${m} de ${ano}`}
                        aria-label={`Visita de ${m} de ${ano} no dia ${visita.data.getDate()}. Clique para alterar a data.`}
                        className={`mt-1 w-full rounded px-1 py-0.5 text-[11px] font-semibold underline-offset-2 hover:underline ${
                          visita.remarcada ? 'text-amber-700' : 'text-indigo-700'
                        }`}
                      >
                        dia {visita.data.getDate()}{visita.remarcada ? ' *' : ''}
                      </button>
                    ) : (
                      <div className={`mt-1 text-[11px] font-semibold ${visita.remarcada ? 'text-amber-700' : 'text-indigo-700'}`}>
                        dia {visita.data.getDate()}{visita.remarcada ? ' *' : ''}
                      </div>
                    )
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {equipamentos.map((eq) => {
            const cronograma = gerarCronogramaAnual(eq, ano);
            return (
              <tr key={eq.id} className="border-t">
                <td className="sticky left-0 z-10 min-w-[190px] border-r bg-card p-3 shadow-[6px_0_12px_-10px_rgba(15,23,42,0.8)]">
                  {renderInfoEquipamento ? renderInfoEquipamento(eq) : (
                    <>
                      <p className="font-medium text-foreground">{eq.numero_equipamento || '—'}</p>
                      <p className="text-xs text-muted-foreground">{eq.marca} {eq.modelo}</p>
                    </>
                  )}
                </td>
                {cronograma.map((m, idx) => (
                  <td key={m.mes} className="p-1 text-center align-middle">
                    {somenteLeitura ? (
                      <div
                        className={`flex h-11 w-full min-w-[80px] items-center justify-center rounded-md px-2 text-center text-xs font-semibold leading-tight ${
                          m.cicloProfundo ? 'bg-purple-100 text-purple-800' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {LABEL_PERIODICIDADE[m.periodicidade]}
                      </div>
                    ) : (
                    <select
                      value={m.periodicidade}
                      onChange={(e) => onAncorar(eq, idx, e.target.value)}
                      disabled={salvando}
                      aria-label={`Planejamento de ${eq.numero_equipamento || 'equipamento'} em ${MESES_ABREV[idx]} de ${ano}. Alterar este valor reposiciona o calend\u00e1rio anual.`}
                      title="Alterar este mês redefine a âncora e recalcula o calendário inteiro"
                      className={`h-11 w-full min-w-[80px] cursor-pointer appearance-none rounded-md border border-transparent px-2 text-center text-xs font-semibold leading-tight transition-colors focus-visible:border-primary ${
                        m.cicloProfundo
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      {PERIODICIDADES_PMOC.map((p) => (
                        <option key={p} value={p}>{LABEL_PERIODICIDADE[p]}</option>
                      ))}
                    </select>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
        </div>
        {showScrollHint ? <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-indigo-200/70 to-transparent" aria-hidden="true" /> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {somenteLeitura
          ? 'Cada mês mostra o tipo de manutenção previsto.'
          : 'Ao trocar a periodicidade de um mês, o sistema usa esse mês como nova âncora e recalcula o ano inteiro.'}
        {visitas ? ' O dia no cabeçalho é a data da visita; um asterisco marca o mês remarcado.' : ''}
      </p>
    </div>
  );
}
