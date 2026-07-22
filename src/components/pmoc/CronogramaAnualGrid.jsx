import React from "react";
import { LABEL_PERIODICIDADE, PERIODICIDADES_PMOC, gerarCronogramaAnual } from "@/lib/pmocChecklist";

export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Grade do cronograma anual (equipamento × 12 meses), compartilhada entre o
// painel do cliente na página PMOC e o modal do Plano Anual. Cada mês é um
// único rótulo com a periodicidade calculada automaticamente — as opções de
// alteração só aparecem ao clicar nele (é um <select> estilizado como chip);
// escolher um valor reposiciona o calendário do ano inteiro.
export default function CronogramaAnualGrid({ equipamentos, ano, onAncorar, salvando, renderInfoEquipamento }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="p-2 font-medium">Equipamento</th>
            {MESES_ABREV.map((m) => (
              <th key={m} className="p-2 font-medium text-center">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {equipamentos.map((eq) => {
            const cronograma = gerarCronogramaAnual(eq, ano);
            return (
              <tr key={eq.id} className="border-t">
                <td className="p-2">
                  {renderInfoEquipamento ? renderInfoEquipamento(eq) : (
                    <>
                      <p className="font-medium text-foreground">{eq.numero_equipamento || '—'}</p>
                      <p className="text-xs text-muted-foreground">{eq.marca} {eq.modelo}</p>
                    </>
                  )}
                </td>
                {cronograma.map((m, idx) => (
                  <td key={m.mes} className="p-1 text-center align-middle">
                    <select
                      value={m.periodicidade}
                      onChange={(e) => onAncorar(eq, idx, e.target.value)}
                      disabled={salvando}
                      title="Clique para alterar o plano deste mês (reposiciona o calendário inteiro)"
                      className={`w-full min-w-[76px] appearance-none rounded px-1.5 py-1.5 text-[10px] font-semibold leading-tight capitalize text-center cursor-pointer transition-colors border-0 ${
                        m.cicloProfundo
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      {PERIODICIDADES_PMOC.map((p) => (
                        <option key={p} value={p}>{LABEL_PERIODICIDADE[p]}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
