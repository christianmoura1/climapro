-- Captação de lead do cliente final (hotel, condomínio, rede com muitos
-- equipamentos).
--
-- É o primeiro formulário público que grava direto no banco. Como todo acesso
-- sem login no ClimaPro, a escrita passa por Edge Function com service_role;
-- não existe policy de insert para anon aqui.
--
-- O lead não pertence a nenhuma empresa: ele chega para o ClimaPro e depois é
-- encaminhado para quem vai executar. Por isso não tem empresa_id e a leitura é
-- do admin global.

create table if not exists lead (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  organizacao text,
  telefone text not null,
  email text,
  cidade text,
  quantidade_equipamentos integer,
  mensagem text,
  -- de onde veio: caminho da página, e a origem paga quando houver
  origem text,
  utm jsonb not null default '{}'::jsonb,
  status text not null default 'novo'
    check (status in ('novo', 'contatado', 'qualificado', 'descartado', 'convertido')),
  observacoes_internas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_status on lead(status, created_at desc);

drop trigger if exists trg_lead_updated on lead;
create trigger trg_lead_updated before update on lead
  for each row execute function set_updated_at();

alter table lead enable row level security;

-- Só o admin global vê e mexe. A Edge Function grava com service_role e não
-- passa por policy, por isso não existe policy de insert.
drop policy if exists lead_select on lead;
create policy lead_select on lead for select using (is_admin_global());

drop policy if exists lead_update on lead;
create policy lead_update on lead for update
  using (is_admin_global()) with check (is_admin_global());

drop policy if exists lead_delete on lead;
create policy lead_delete on lead for delete using (is_admin_global());

notify pgrst, 'reload schema';
