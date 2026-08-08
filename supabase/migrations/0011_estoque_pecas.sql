-- Estoque de peças e materiais.
--
-- O status 'aguardando_pecas' já existia no chamado, mas não havia onde dizer
-- qual peça, quanto custou nem se tem no estoque. Em climatização isso pesa no
-- custo do serviço: gás, filtro, capacitor, contatora, compressor.
--
-- O saldo fica materializado em peca.saldo_atual e é mantido por trigger a
-- partir das movimentações. As movimentações são a fonte da verdade e ficam
-- como histórico; o saldo é cache, para a listagem não precisar somar tudo a
-- cada abertura de tela.

create table if not exists peca (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  codigo text,
  nome text not null,
  categoria text not null default 'peca'
    check (categoria in ('peca','material','gas','ferramenta','outro')),
  -- un, kg, m, L: gás e cabo não se contam por unidade inteira
  unidade text not null default 'un',
  saldo_atual numeric not null default 0,
  estoque_minimo numeric not null default 0,
  custo_medio numeric not null default 0,
  preco_venda numeric,
  localizacao text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_peca_empresa on peca(empresa_id);
create index if not exists idx_peca_ativo on peca(empresa_id, ativo);
create unique index if not exists idx_peca_codigo_empresa
  on peca(empresa_id, codigo) where codigo is not null and codigo <> '';

create trigger trg_peca_updated before update on peca
  for each row execute function set_updated_at();

create table if not exists movimentacao_peca (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  peca_id uuid not null references peca(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  -- Em 'ajuste' a quantidade é o saldo contado no inventário, não a diferença.
  quantidade numeric not null,
  custo_unitario numeric,
  chamado_id uuid references chamado(id) on delete set null,
  tecnico_id uuid references tecnico(id) on delete set null,
  observacao text,
  data_movimentacao timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_mov_peca_empresa on movimentacao_peca(empresa_id);
create index if not exists idx_mov_peca_peca on movimentacao_peca(peca_id, data_movimentacao desc);
create index if not exists idx_mov_peca_chamado on movimentacao_peca(chamado_id);

-- Aplica a movimentação no saldo. Em entrada, recalcula também o custo médio
-- ponderado, que é o número que interessa para precificar o serviço depois.
create or replace function aplicar_movimentacao_peca() returns trigger
language plpgsql as $$
declare
  saldo_anterior numeric;
  custo_anterior numeric;
  novo_saldo numeric;
begin
  select saldo_atual, custo_medio into saldo_anterior, custo_anterior
    from peca where id = new.peca_id for update;

  if new.tipo = 'entrada' then
    novo_saldo := saldo_anterior + new.quantidade;
    if new.custo_unitario is not null and novo_saldo > 0 then
      update peca set
        saldo_atual = novo_saldo,
        custo_medio = ((saldo_anterior * custo_anterior) + (new.quantidade * new.custo_unitario)) / novo_saldo
      where id = new.peca_id;
    else
      update peca set saldo_atual = novo_saldo where id = new.peca_id;
    end if;

  elsif new.tipo = 'saida' then
    update peca set saldo_atual = saldo_anterior - new.quantidade where id = new.peca_id;

  else -- ajuste: a quantidade informada passa a ser o saldo
    update peca set saldo_atual = new.quantidade where id = new.peca_id;
  end if;

  return new;
end;
$$;

create trigger trg_movimentacao_peca_aplica after insert on movimentacao_peca
  for each row execute function aplicar_movimentacao_peca();

-- Excluir uma movimentação desfaz o efeito dela no saldo. Ajuste não tem como
-- ser desfeito sozinho (o saldo anterior se perdeu), então fica como está e o
-- usuário registra um ajuste novo.
create or replace function reverter_movimentacao_peca() returns trigger
language plpgsql as $$
begin
  if old.tipo = 'entrada' then
    update peca set saldo_atual = saldo_atual - old.quantidade where id = old.peca_id;
  elsif old.tipo = 'saida' then
    update peca set saldo_atual = saldo_atual + old.quantidade where id = old.peca_id;
  end if;
  return old;
end;
$$;

create trigger trg_movimentacao_peca_reverte after delete on movimentacao_peca
  for each row execute function reverter_movimentacao_peca();

-- RLS no padrão do resto: admin da empresa administra, técnico consulta e dá
-- baixa (ele é quem usa a peça no atendimento), cliente não vê nada.
alter table peca enable row level security;
alter table movimentacao_peca enable row level security;

create policy peca_select on peca for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'));
create policy peca_insert on peca for insert
  with check (same_empresa(empresa_id) and is_admin_empresa());
create policy peca_update on peca for update
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());
create policy peca_delete on peca for delete
  using (same_empresa(empresa_id) and is_admin_empresa());

create policy mov_peca_select on movimentacao_peca for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'));
create policy mov_peca_insert on movimentacao_peca for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'));
create policy mov_peca_delete on movimentacao_peca for delete
  using (same_empresa(empresa_id) and is_admin_empresa());

notify pgrst, 'reload schema';
