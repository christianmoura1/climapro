import React from "react";
import { Calculator, CircleAlert } from "lucide-react";
import { calculatePmocPrice } from "@/marketing/price-calculator";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const fields = [
  { key: "equipment", label: "Equipamentos no contrato", min: 1, step: 1, suffix: "un." },
  { key: "visits", label: "Visitas por ano", min: 0, step: 1, suffix: "visitas" },
  { key: "hours", label: "Horas por visita", min: 0, step: 0.5, suffix: "h" },
  { key: "people", label: "Pessoas por visita", min: 1, step: 1, suffix: "pessoas" },
  { key: "hourlyCost", label: "Custo da hora por pessoa", min: 0, step: 1, prefix: "R$" },
  { key: "distance", label: "Quilômetros por visita (ida e volta)", min: 0, step: 1, suffix: "km" },
  { key: "kmCost", label: "Custo por quilômetro", min: 0, step: 0.1, prefix: "R$" },
  { key: "supplies", label: "Insumos estimados por visita", min: 0, step: 10, prefix: "R$" },
  { key: "overhead", label: "Custos indiretos sobre o direto", min: 0, max: 100, step: 1, suffix: "%" },
  { key: "margin", label: "Margem desejada sobre o preço", min: 0, max: 90, step: 1, suffix: "%" },
];

export const initialCalculatorValues = {
  equipment: 20,
  visits: 4,
  hours: 6,
  people: 1,
  hourlyCost: 45,
  distance: 30,
  kmCost: 1.2,
  supplies: 120,
  overhead: 15,
  margin: 25,
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PriceCalculator() {
  const [values, setValues] = React.useState(initialCalculatorValues);
  const result = calculatePmocPrice(values);

  function updateValue(field, value) {
    const parsed = safeNumber(value);
    const bounded = Math.min(
      Math.max(parsed, field.min ?? Number.NEGATIVE_INFINITY),
      field.max ?? Number.POSITIVE_INFINITY,
    );
    setValues((current) => ({ ...current, [field.key]: bounded }));
  }

  function resetCalculator() {
    setValues(initialCalculatorValues);
  }

  return (
    <div className="m-calculator" id="calculadora">
      <div className="m-calculator__form">
        <div className="m-calculator__title">
          <Calculator aria-hidden="true" />
          <div>
            <span>ESTIMATIVA ANUAL</span>
            <h2>Dados do contrato</h2>
          </div>
        </div>
        <div className="m-calculator__fields">
          {fields.map((field) => (
            <label key={field.key} htmlFor={`calc-${field.key}`}>
              <span>{field.label}</span>
              <div className="m-number-field">
                {field.prefix ? <span>{field.prefix}</span> : null}
                <input
                  id={`calc-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key]}
                  onChange={(event) => updateValue(field, event.target.value)}
                />
                {field.suffix ? <span>{field.suffix}</span> : null}
              </div>
            </label>
          ))}
        </div>
        <button type="button" className="m-text-button" onClick={resetCalculator}>
          Restaurar exemplo
        </button>
      </div>

      <aside className="m-calculator__result" aria-live="polite">
        <span className="m-record__code">REFERÊNCIA CALCULADA</span>
        <p className="m-calculator__price">{currency.format(result.suggestedPrice)}</p>
        <span>para o contrato anual</span>

        <dl>
          <div>
            <dt>Mão de obra</dt>
            <dd>{currency.format(result.labor)}</dd>
          </div>
          <div>
            <dt>Deslocamento</dt>
            <dd>{currency.format(result.travel)}</dd>
          </div>
          <div>
            <dt>Insumos</dt>
            <dd>{currency.format(result.supplies)}</dd>
          </div>
          <div>
            <dt>Custos indiretos</dt>
            <dd>{currency.format(result.overhead)}</dd>
          </div>
          <div className="is-total">
            <dt>Custo estimado</dt>
            <dd>{currency.format(result.totalCost)}</dd>
          </div>
        </dl>

        <div className="m-calculator__references">
          <div>
            <span>Referência mensal</span>
            <strong>{currency.format(result.monthlyReference)}</strong>
          </div>
          <div>
            <span>Por equipamento / ano</span>
            <strong>{currency.format(result.perEquipment)}</strong>
          </div>
        </div>

        <div className="m-calculator__warning">
          <CircleAlert aria-hidden="true" />
          <p>
            Esta conta é uma referência, não uma tabela de mercado. Inclua impostos, peças,
            análises, responsabilidade técnica, risco, sazonalidade e demais custos reais do
            seu escopo.
          </p>
        </div>
      </aside>
    </div>
  );
}
