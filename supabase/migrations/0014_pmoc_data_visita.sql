-- Data da visita do PMOC.
--
-- O cronograma anual já sabia o MÊS de cada visita e a periodicidade que vence
-- nele, mas nunca o dia. A Agenda chutava dia 10 para todo mundo
-- (DIA_PLACEHOLDER em src/lib/pmocAgenda.js), e nem o cliente nem o técnico
-- viam data nenhuma no PMOC — só "Nunca executado".

-- Dia fixo da visita mensal daquele cliente. Nulo cai no dia do cadastro do
-- cliente, o que espalha as visitas pelo mês em vez de empilhar todo mundo no
-- mesmo dia. Dia 31 em mês curto é ajustado para o último dia do mês na hora
-- de calcular, não aqui.
alter table cliente
  add column if not exists dia_execucao_pmoc smallint
  check (dia_execucao_pmoc is null or dia_execucao_pmoc between 1 and 31);

-- Exceção de um mês só. A empresa mexe na data de setembro sem bagunçar os
-- outros 11 meses: só o mês alterado ganha linha aqui, o resto continua saindo
-- do dia fixo do cliente.
create table if not exists pmoc_agendamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  mes_referencia date not null,
  data_visita date not null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (cliente_id, mes_referencia)
);
create index if not exists idx_pmocagend_empresa on pmoc_agendamento(empresa_id);
create index if not exists idx_pmocagend_cliente on pmoc_agendamento(cliente_id);

drop trigger if exists trg_pmocagend_updated on pmoc_agendamento;
create trigger trg_pmocagend_updated before update on pmoc_agendamento
  for each row execute function set_updated_at();

alter table pmoc_agendamento enable row level security;

-- Quem enxerga a data é todo mundo que participa da visita: a empresa, o
-- técnico da empresa e o cliente daquele contrato. Remarcar, só a empresa.
drop policy if exists pmocagend_select on pmoc_agendamento;
create policy pmocagend_select on pmoc_agendamento for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

drop policy if exists pmocagend_insert on pmoc_agendamento;
create policy pmocagend_insert on pmoc_agendamento for insert
  with check (same_empresa(empresa_id) and is_admin_empresa());

drop policy if exists pmocagend_update on pmoc_agendamento;
create policy pmocagend_update on pmoc_agendamento for update
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());

drop policy if exists pmocagend_delete on pmoc_agendamento;
create policy pmocagend_delete on pmoc_agendamento for delete
  using (same_empresa(empresa_id) and is_admin_empresa());

notify pgrst, 'reload schema';
