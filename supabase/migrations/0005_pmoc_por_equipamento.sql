-- 0005 — PMOC dinâmico por equipamento: cada equipamento ganha sua própria
-- periodicidade (em vez de um lote fixo por registro de PMOC), com checagem
-- mensal obrigatória + ciclo profundo próprio. Migração 100% aditiva — não
-- apaga nem reescreve nenhum PMOC/execução já existente.

alter table equipamento add column if not exists periodicidade_pmoc text
  check (periodicidade_pmoc in ('mensal','bimestral','trimestral','semestral','anual'));
alter table equipamento add column if not exists pmoc_ativo boolean not null default false;

-- Backfill: herda periodicidade/ativação dos PMOCs existentes (equipamentos_ids[])
update equipamento e
set periodicidade_pmoc = p.periodicidade, pmoc_ativo = true
from pmoc p
where e.id = any(p.equipamentos_ids) and e.periodicidade_pmoc is null;

-- Backfill: última manutenção por equipamento a partir do histórico já concluído
update equipamento e
set ultima_manutencao = sub.max_data
from (
  select unnest(m.equipamentos_ids) as equipamento_id, max(m.data_execucao) as max_data
  from manutencao_pmoc m
  where m.status = 'concluida'
  group by unnest(m.equipamentos_ids)
) sub
where sub.equipamento_id = e.id;

-- Backfill: próxima manutenção calculada (última manutenção ou instalação + periodicidade)
update equipamento
set proxima_manutencao = (
  coalesce(ultima_manutencao, data_instalacao, current_date) + case periodicidade_pmoc
    when 'mensal' then interval '1 month'
    when 'bimestral' then interval '2 months'
    when 'trimestral' then interval '3 months'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '1 year'
  end
)::date
where periodicidade_pmoc is not null;

-- Marca, por execução, quais equipamentos tiveram o ciclo profundo concluído
-- (não só a checagem mensal) — usado na aprovação para saber quais datas avançar.
alter table manutencao_pmoc add column if not exists equipamentos_ciclo_profundo uuid[] not null default '{}';

create index if not exists idx_equipamento_pmoc_ativo on equipamento(cliente_id) where pmoc_ativo = true;
