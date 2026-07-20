-- =============================================================
-- 0004 — Cobrança com Stripe (assinaturas dos planos)
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- =============================================================

-- Vínculo da empresa com o Stripe
alter table empresa add column if not exists stripe_customer_id text;
alter table empresa add column if not exists stripe_subscription_id text;

create index if not exists idx_empresa_stripe_customer on empresa(stripe_customer_id);
create index if not exists idx_empresa_stripe_subscription on empresa(stripe_subscription_id);

-- Log de eventos de webhook do Stripe (idempotência + auditoria):
-- o mesmo evento pode ser reenviado pelo Stripe; o unique garante que
-- só processamos uma vez.
create table if not exists pagamento_evento (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  tipo text not null,
  empresa_id uuid references empresa(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table pagamento_evento enable row level security;

-- Só o admin global enxerga o log pela API; o webhook grava via service_role
-- (que ignora RLS).
drop policy if exists pagamento_evento_select on pagamento_evento;
create policy pagamento_evento_select on pagamento_evento
  for select using (is_admin_global());
