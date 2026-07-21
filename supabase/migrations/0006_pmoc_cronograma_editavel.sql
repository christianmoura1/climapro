-- 0006 — Plano Anual editável: por padrão o cronograma continua 100%
-- calculado a partir da periodicidade do equipamento, mas o usuário pode
-- forçar um mês específico a ter (ou não ter) o ciclo profundo, sem precisar
-- trocar a periodicidade toda. Chave "AAAA-M" (mês 1-12, sem zero à
-- esquerda) -> boolean; ausência de chave = usa o cálculo automático.
alter table equipamento add column if not exists cronograma_pmoc_overrides jsonb not null default '{}';
