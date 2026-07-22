-- 0006 — Plano Anual editável: âncora explícita do ciclo profundo. Escolher
-- uma periodicidade num mês, direto na tela do Plano Anual, grava aqui uma
-- data de referência dentro daquele mês — os outros 11 meses continuam
-- calculados automaticamente a partir dela (ex: trimestral ancorado em Março
-- também acerta Junho/Setembro/Dezembro sozinho, sem precisar tocar em cada
-- um). Sem âncora, cai no fallback já existente (próxima/última manutenção,
-- depois instalação).
alter table equipamento add column if not exists ciclo_ancora_pmoc date;
