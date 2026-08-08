-- Orçamento com aprovação do cliente por link público.
--
-- Fluxo: o técnico/empresa monta o orçamento, envia o link para o cliente, e o
-- cliente aprova ou recusa assinando na tela, sem login e sem conta no sistema.
-- Aprovado, vira chamado agendável.
--
-- A tabela orcamento_tecnico que já existe é outra coisa: é o orçamento mensal
-- de gastos do técnico para a empresa aprovar. Esta aqui é da empresa para o
-- cliente final.

create table if not exists orcamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete restrict,
  -- chamado que originou o orçamento (visita de diagnóstico), quando houver
  chamado_origem_id uuid references chamado(id) on delete set null,
  -- chamado criado a partir da aprovação
  chamado_gerado_id uuid references chamado(id) on delete set null,
  equipamentos_ids uuid[] not null default '{}',
  numero_orcamento text,
  titulo text not null,
  descricao text,
  -- [{ descricao, quantidade, valor_unitario }]
  itens jsonb not null default '[]'::jsonb,
  valor_total numeric not null default 0,
  desconto numeric not null default 0,
  validade_ate date,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviado','aprovado','recusado','expirado','cancelado')),
  -- token do link público; 32 chars hex, imprevisível
  token_publico text not null unique default encode(gen_random_bytes(16), 'hex'),
  data_envio timestamptz,
  data_resposta timestamptz,
  nome_aprovador text,
  assinatura_cliente text,
  motivo_recusa text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_orcamento_empresa on orcamento(empresa_id);
create index if not exists idx_orcamento_cliente on orcamento(cliente_id);
create index if not exists idx_orcamento_token on orcamento(token_publico);
create index if not exists idx_orcamento_status on orcamento(empresa_id, status);

create trigger trg_orcamento_updated before update on orcamento
  for each row execute function set_updated_at();

-- Numeração sequencial por empresa (ORC-0001). O cliente vê esse número na
-- proposta, então nada de timestamp gigante como em numero_chamado.
create or replace function gerar_numero_orcamento() returns trigger
language plpgsql as $$
declare
  proximo integer;
begin
  if new.numero_orcamento is null or new.numero_orcamento = '' then
    select coalesce(max(nullif(regexp_replace(numero_orcamento, '\D', '', 'g'), '')::integer), 0) + 1
      into proximo
      from orcamento
     where empresa_id = new.empresa_id;
    new.numero_orcamento := 'ORC-' || lpad(proximo::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_orcamento_numero before insert on orcamento
  for each row execute function gerar_numero_orcamento();

create unique index if not exists idx_orcamento_numero_empresa
  on orcamento(empresa_id, numero_orcamento);

-- RLS no mesmo padrão de chamado: admin da empresa vê tudo, técnico e cliente
-- veem o que é deles. O acesso público do link NÃO passa por aqui — é mediado
-- pelas Edge Functions com service_role, igual ao QR code do equipamento.
alter table orcamento enable row level security;

create policy orcamento_select on orcamento for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

create policy orcamento_insert on orcamento for insert
  with check (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

create policy orcamento_update on orcamento for update
  using (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  )
  with check (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

create policy orcamento_delete on orcamento for delete
  using (same_empresa(empresa_id) and is_admin_empresa());

notify pgrst, 'reload schema';
