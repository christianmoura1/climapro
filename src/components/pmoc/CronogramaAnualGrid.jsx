import React from "react";
import { LABEL_PERIODICIDADE, PERIODICIDADES_PMOC, gerarCronogramaAnual } from "@/lib/pmocChecklist";

export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Grade do cronograma anual (equipamento × 12 meses), compartilhada entre o
// painel do cliente na página PMOC e o modal do Plano Anual — um único lugar
// define como o plano aparece e como se edita a periodicidade mês a mês.
export default function CronogramaAnualGrid({ equipamentos, ano, onExecutar, onAncorar, salvando, renderInfoEquipamento }) {
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
                  <td key={m.mes} className="p-1 text-center align-top">
                    <button
                      type="button"
                      title="Clique para executar a manutenção deste mês"
                      onClick={() => onExecutar()}
                      className={`w-full min-w-[76px] rounded px-1.5 py-1.5 text-[10px] font-semibold leading-tight capitalize transition-colors ${
                        m.cicloProfundo
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      {LABEL_PERIODICIDADE[m.periodicidade]}
                    </button>
                    <select
                      value={m.periodicidade}
                      onChange={(e) => onAncorar(eq, idx, e.target.value)}
                      disabled={salvando}
                      title="Definir a periodicidade deste mês (reposiciona o calendário inteiro)"
                      className="mt-1 w-full min-w-[76px] h-6 rounded border border-input bg-white text-[9px] px-1 capitalize"
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
