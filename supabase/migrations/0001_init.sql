-- ClimaPro — schema inicial (migração Base44 -> Supabase/Postgres)
-- Multi-tenant desde o início: toda tabela de negócio tem empresa_id + RLS.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- EMPRESA (raiz do tenant)
-- ============================================================
create table empresa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug_empresa text not null unique,
  logo_url text,
  cnpj text not null,
  telefone text,
  email_contato text,
  endereco text,
  plano text not null default 'free' check (plano in ('free','essencial','profissional','corporativo','enterprise')),
  data_vencimento_plano date,
  limite_chamados_mes integer not null default 5,
  limite_tecnicos integer not null default 1,
  limite_empresas integer not null default 1,
  status text not null default 'ativa' check (status in ('ativa','suspensa','inativa')),
  status_pagamento text not null default 'ativo' check (status_pagamento in ('ativo','pendente','bloqueado')),
  usuario_principal_email text,
  modulos_ativos jsonb not null default '{
    "chamados": true, "clientes": true, "equipamentos": true, "tecnicos": true,
    "pmoc": true, "agenda": true, "ponto_eletronico": true,
    "financeiro": false, "notas_fiscais": false, "multiempresa": false,
    "api": false, "white_label": false
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_empresa_updated before update on empresa
  for each row execute function set_updated_at();

-- ============================================================
-- TECNICO
-- ============================================================
create table tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  especialidade text check (especialidade in ('refrigeracao','climatizacao','ambos')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  total_atendimentos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_tecnico_empresa on tecnico(empresa_id);
create trigger trg_tecnico_updated before update on tecnico
  for each row execute function set_updated_at();

-- ============================================================
-- CLIENTE (+ filhos: estabelecimentos, documentos)
-- ============================================================
create table cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nome text not null,
  email text,
  telefone text not null,
  whatsapp text,
  endereco text,
  latitude double precision,
  longitude double precision,
  tipo_estabelecimento text check (tipo_estabelecimento in ('residencial','comercial','industrial','hospitalar','outro')),
  observacoes text,
  tem_acesso_portal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_cliente_empresa on cliente(empresa_id);
create trigger trg_cliente_updated before update on cliente
  for each row execute function set_updated_at();

create table cliente_estabelecimento (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  nome text,
  endereco text,
  latitude double precision,
  longitude double precision,
  tipo text,
  observacoes text,
  created_at timestamptz not null default now()
);
create index idx_cliente_estab_cliente on cliente_estabelecimento(cliente_id);

create table cliente_documento (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  nome text,
  tipo text check (tipo in ('laudo','contrato','orcamento','pmoc','outro')),
  url text,
  data_upload timestamptz not null default now(),
  tecnico_responsavel text
);
create index idx_cliente_doc_cliente on cliente_documento(cliente_id);

-- ============================================================
-- PROFILES (extensão de auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresa(id) on delete set null,
  tipo_usuario text not null default 'admin_empresa' check (tipo_usuario in ('admin_global','admin_empresa','tecnico','cliente')),
  tecnico_id uuid references tecnico(id) on delete set null,
  cliente_id uuid references cliente(id) on delete set null,
  full_name text,
  email text,
  telefone text,
  cpf text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  ultimo_acesso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_empresa on profiles(empresa_id);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Toda conta nova no Supabase Auth ganha automaticamente uma linha em profiles
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Helpers de RLS (security definer p/ evitar recursão)
-- ============================================================
create or replace function auth_empresa_id() returns uuid
language sql stable security definer set search_path = public as
$$ select empresa_id from profiles where id = auth.uid() $$;

create or replace function auth_tipo_usuario() returns text
language sql stable security definer set search_path = public as
$$ select tipo_usuario from profiles where id = auth.uid() $$;

create or replace function auth_tecnico_id() returns uuid
language sql stable security definer set search_path = public as
$$ select tecnico_id from profiles where id = auth.uid() $$;

create or replace function auth_cliente_id() returns uuid
language sql stable security definer set search_path = public as
$$ select cliente_id from profiles where id = auth.uid() $$;

create or replace function is_admin_global() returns boolean
language sql stable as
$$ select coalesce(auth_tipo_usuario() = 'admin_global', false) $$;

create or replace function is_admin_empresa() returns boolean
language sql stable as
$$ select coalesce(auth_tipo_usuario() in ('admin_global','admin_empresa'), false) $$;

create or replace function same_empresa(target_empresa_id uuid) returns boolean
language sql stable as
$$ select is_admin_global() or target_empresa_id = auth_empresa_id() $$;

-- ============================================================
-- EQUIPAMENTO
-- ============================================================
create table equipamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete restrict,
  numero_equipamento text,
  tipo text not null check (tipo in ('ar_condicionado','camara_fria','geladeira','freezer','chiller','outro')),
  marca text not null,
  modelo text not null,
  capacidade text,
  localizacao text,
  estabelecimento_nome text,
  data_instalacao date,
  numero_serie text,
  foto_url text,
  ultima_manutencao date,
  proxima_manutencao date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_equipamento_empresa on equipamento(empresa_id);
create index idx_equipamento_cliente on equipamento(cliente_id);
create trigger trg_equipamento_updated before update on equipamento
  for each row execute function set_updated_at();

-- ============================================================
-- CHAMADO
-- ============================================================
create table chamado (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete restrict,
  tecnico_id uuid references tecnico(id) on delete set null,
  equipamento_id uuid references equipamento(id) on delete set null,
  equipamentos_ids uuid[] not null default '{}',
  numero_chamado text,
  titulo text not null,
  descricao text not null,
  local text,
  tipo_problema text check (tipo_problema in ('manutencao_preventiva','manutencao_corretiva','instalacao','emergencia','outro')),
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  status text not null default 'pendente' check (status in ('pendente','em_andamento','aguardando_pecas','aguardando_aprovacao_empresa','finalizado','cancelado')),
  data_abertura timestamptz not null default now(),
  data_agendamento timestamptz,
  data_finalizacao timestamptz,
  data_lembrete_proxima_manutencao date,
  hora_lembrete_proxima_manutencao text,
  lembrete_manutencao_enviado boolean not null default false,
  fotos_anexos text[] not null default '{}',
  fotos_finalizacao text[] not null default '{}',
  videos_finalizacao text[] not null default '{}',
  nome_cliente_confirmacao text,
  assinatura_cliente text,
  observacoes_tecnico text,
  observacoes_empresa text,
  motivo_reabertura text,
  valor_servico numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_chamado_empresa on chamado(empresa_id);
create index idx_chamado_cliente on chamado(cliente_id);
create index idx_chamado_tecnico on chamado(tecnico_id);
create index idx_chamado_lembrete on chamado(lembrete_manutencao_enviado, data_lembrete_proxima_manutencao);
create trigger trg_chamado_updated before update on chamado
  for each row execute function set_updated_at();

-- ============================================================
-- PMOC + MANUTENCAO_PMOC
-- ============================================================
create table pmoc (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete restrict,
  equipamentos_ids uuid[] not null default '{}',
  tecnico_responsavel_id uuid references tecnico(id) on delete set null,
  periodicidade text check (periodicidade in ('mensal','bimestral','trimestral','semestral','anual')),
  mes_referencia date not null,
  data_inicio date,
  data_execucao_programada date,
  proxima_manutencao date,
  status text not null default 'aguardando_execucao' check (status in ('aguardando_execucao','em_execucao','aguardando_aprovacao_empresa','aguardando_validacao_cliente','concluido','reaberto','pausado','cancelado')),
  atividades jsonb not null default '[]'::jsonb,
  observacoes text,
  observacoes_empresa text,
  motivo_reabertura text,
  data_aprovacao_empresa timestamptz,
  aprovado_por text,
  data_validacao_cliente timestamptz,
  validado_por_cliente text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_pmoc_empresa on pmoc(empresa_id);
create index idx_pmoc_cliente on pmoc(cliente_id);
create trigger trg_pmoc_updated before update on pmoc
  for each row execute function set_updated_at();

create table manutencao_pmoc (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  pmoc_id uuid not null references pmoc(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete restrict,
  tecnico_id uuid references tecnico(id) on delete set null,
  equipamentos_ids uuid[] not null default '{}',
  data_programada date not null,
  data_execucao timestamptz,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','aguardando_aprovacao_empresa','aguardando_validacao_cliente','concluida','reaberta','cancelada')),
  checklists_por_equipamento jsonb not null default '{}'::jsonb,
  fotos_por_equipamento jsonb not null default '{}'::jsonb,
  observacoes_tecnico text,
  observacoes_empresa text,
  observacoes_cliente text,
  assinatura_tecnico text,
  assinatura_cliente text,
  nome_responsavel_local text,
  nome_cliente_confirmacao text,
  latitude double precision,
  longitude double precision,
  endereco text,
  problemas_encontrados text,
  servicos_adicionais text,
  duracao_minutos integer,
  data_aprovacao_empresa timestamptz,
  aprovado_por_empresa text,
  data_validacao_cliente timestamptz,
  validado_por_cliente text,
  motivo_reabertura text,
  pdf_url text,
  lancamento_financeiro_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_manutpmoc_empresa on manutencao_pmoc(empresa_id);
create index idx_manutpmoc_pmoc on manutencao_pmoc(pmoc_id);
create trigger trg_manutpmoc_updated before update on manutencao_pmoc
  for each row execute function set_updated_at();

-- ============================================================
-- AGENDA_EVENTO
-- ============================================================
create table agenda_evento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  chamado_id uuid references chamado(id) on delete set null,
  pmoc_id uuid references pmoc(id) on delete set null,
  cliente_id uuid not null references cliente(id) on delete restrict,
  tecnico_id uuid references tecnico(id) on delete set null,
  titulo text not null,
  descricao text,
  tipo text not null default 'manual' check (tipo in ('chamado','pmoc','reuniao','manual')),
  origem text not null default 'manual' check (origem in ('manual','automatico','google_calendar')),
  data_inicio timestamptz not null,
  data_fim timestamptz,
  endereco text,
  latitude double precision,
  longitude double precision,
  status text not null default 'pendente' check (status in ('pendente','confirmado','em_andamento','concluido','cancelado')),
  cor text not null default '#3b82f6',
  recorrente boolean not null default false,
  frequencia_recorrencia text check (frequencia_recorrencia in ('diaria','semanal','mensal','trimestral','semestral','anual')),
  google_calendar_event_id text,
  notificacao_enviada boolean not null default false,
  confirmado_por_tecnico boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_agenda_empresa on agenda_evento(empresa_id);
create trigger trg_agenda_updated before update on agenda_evento
  for each row execute function set_updated_at();

-- ============================================================
-- FINANCEIRO
-- ============================================================
create table financeiro (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  categoria text not null check (categoria in ('servico','pecas','combustivel','alimentacao','salario','aluguel','equipamento','outro')),
  descricao text,
  valor numeric not null,
  data_lancamento date not null default current_date,
  forma_pagamento text check (forma_pagamento in ('dinheiro','pix','cartao_credito','cartao_debito','boleto','transferencia')),
  chamado_id uuid references chamado(id) on delete set null,
  tecnico_id uuid references tecnico(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_financeiro_empresa on financeiro(empresa_id);
create trigger trg_financeiro_updated before update on financeiro
  for each row execute function set_updated_at();

-- ============================================================
-- GASTO_TECNICO / LANCAMENTO_TECNICO / MOVIMENTACAO_TECNICO
-- ============================================================
create table gasto_tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  chamado_id uuid references chamado(id) on delete set null,
  tipo_gasto text check (tipo_gasto in ('combustivel','alimentacao','pedagio','estacionamento','outro')),
  valor numeric not null,
  data_gasto date not null default current_date,
  comprovante_url text,
  descricao text,
  status_aprovacao text not null default 'pendente' check (status_aprovacao in ('pendente','aprovado','rejeitado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_gastotec_empresa on gasto_tecnico(empresa_id);
create trigger trg_gastotec_updated before update on gasto_tecnico
  for each row execute function set_updated_at();

create table lancamento_tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','despesa')),
  categoria text check (categoria in ('orcamento','reembolso','combustivel','alimentacao','estacionamento','pedagio','outro')),
  descricao text,
  valor numeric not null,
  data_lancamento date not null default current_date,
  comprovante_url text,
  chamado_id uuid references chamado(id) on delete set null,
  pode_editar boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_lanctec_empresa on lancamento_tecnico(empresa_id);
create trigger trg_lanctec_updated before update on lancamento_tecnico
  for each row execute function set_updated_at();

create table movimentacao_tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','despesa')),
  categoria text check (categoria in ('reembolso','combustivel','alimentacao','estacionamento','pedagio','outro')),
  descricao text,
  valor numeric not null,
  data_movimentacao date not null default current_date,
  comprovante_url text,
  chamado_id uuid references chamado(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  data_envio timestamptz,
  data_resposta timestamptz,
  motivo_rejeicao text,
  aprovado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_movtec_empresa on movimentacao_tecnico(empresa_id);
create trigger trg_movtec_updated before update on movimentacao_tecnico
  for each row execute function set_updated_at();

-- ============================================================
-- ORCAMENTO_TECNICO / VALOR_TECNICO / CREDITO_TECNICO
-- ============================================================
create table orcamento_tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  mes_referencia date not null,
  valor_orcamento numeric not null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  data_envio timestamptz,
  data_resposta timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_orctec_empresa on orcamento_tecnico(empresa_id);
create trigger trg_orctec_updated before update on orcamento_tecnico
  for each row execute function set_updated_at();

create table valor_tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  mes_referencia date not null,
  chamados_executados integer not null default 0,
  valor_por_chamado numeric,
  total_mes numeric,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_valtec_empresa on valor_tecnico(empresa_id);
create trigger trg_valtec_updated before update on valor_tecnico
  for each row execute function set_updated_at();

create table credito_tecnico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  valor numeric not null,
  descricao text not null,
  tipo text not null default 'adiantamento' check (tipo in ('adiantamento','reembolso','orcamento','bonus','outro')),
  status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  data_envio timestamptz not null default now(),
  data_resposta timestamptz,
  motivo_rejeicao text,
  origem text not null default 'empresa',
  enviado_por_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_creditec_empresa on credito_tecnico(empresa_id);
create trigger trg_creditec_updated before update on credito_tecnico
  for each row execute function set_updated_at();

-- ============================================================
-- NOTA_FISCAL / CONFIGURACAO_FISCAL
-- ============================================================
create table nota_fiscal (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  chamado_id uuid references chamado(id) on delete set null,
  financeiro_id uuid references financeiro(id) on delete set null,
  cliente_id uuid not null references cliente(id) on delete restrict,
  numero_nota text,
  codigo_verificacao text,
  valor_bruto numeric not null,
  valor_liquido numeric,
  descricao_servico text not null,
  data_emissao timestamptz,
  data_prestacao date,
  tipo text not null default 'nfse' check (tipo in ('nfse','nfe')),
  status text not null default 'processando' check (status in ('emitida','cancelada','processando','erro')),
  retencoes jsonb not null default '{}'::jsonb,
  observacoes text,
  arquivo_pdf_url text,
  arquivo_xml_url text,
  motivo_cancelamento text,
  log_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_notafiscal_empresa on nota_fiscal(empresa_id);
create trigger trg_notafiscal_updated before update on nota_fiscal
  for each row execute function set_updated_at();

create table configuracao_fiscal (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  inscricao_municipal text,
  endereco_completo text,
  cidade text,
  codigo_ibge text,
  email_fiscal text,
  aliquota_iss numeric,
  cnae text,
  regime_tributario text check (regime_tributario in ('simples_nacional','lucro_presumido','lucro_real')),
  provedor_nfse text not null default 'nfeio' check (provedor_nfse in ('nfeio','plugnotas','enotas','prefeitura')),
  token_api_nfse text,
  emissao_automatica boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create unique index idx_configfiscal_empresa on configuracao_fiscal(empresa_id);
create trigger trg_configfiscal_updated before update on configuracao_fiscal
  for each row execute function set_updated_at();

-- ============================================================
-- GOOGLE_CALENDAR_CONFIG / LOG_ACAO / PONTO_ELETRONICO
-- ============================================================
create table google_calendar_config (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text,
  calendar_id text,
  sincronizacao_ativa boolean not null default true,
  ultima_sincronizacao timestamptz,
  tipo_usuario text check (tipo_usuario in ('empresa','tecnico')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_gcalconfig_empresa on google_calendar_config(empresa_id);
create trigger trg_gcalconfig_updated before update on google_calendar_config
  for each row execute function set_updated_at();

create table log_acao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  tipo_usuario text,
  acao text not null,
  entidade_afetada text,
  entidade_id text,
  data_hora timestamptz not null default now(),
  ip_address text,
  detalhes text
);
create index idx_logacao_empresa on log_acao(empresa_id);
create index idx_logacao_data on log_acao(data_hora desc);

create table ponto_eletronico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tecnico_id uuid not null references tecnico(id) on delete cascade,
  chamado_id uuid references chamado(id) on delete set null,
  tipo_registro text not null check (tipo_registro in ('entrada','saida_almoco','retorno','saida_final')),
  data_hora timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  endereco text,
  status text not null default 'normal' check (status in ('normal','editado','aprovado_manual')),
  observacoes text,
  editado_por text,
  foto_comprovante text,
  created_at timestamptz not null default now()
);
create index idx_ponto_empresa on ponto_eletronico(empresa_id);
create index idx_ponto_tecnico on ponto_eletronico(tecnico_id);

-- ============================================================
-- RLS: ativar em tudo
-- ============================================================
alter table empresa enable row level security;
alter table profiles enable row level security;
alter table tecnico enable row level security;
alter table cliente enable row level security;
alter table cliente_estabelecimento enable row level security;
alter table cliente_documento enable row level security;
alter table equipamento enable row level security;
alter table chamado enable row level security;
alter table pmoc enable row level security;
alter table manutencao_pmoc enable row level security;
alter table agenda_evento enable row level security;
alter table financeiro enable row level security;
alter table gasto_tecnico enable row level security;
alter table lancamento_tecnico enable row level security;
alter table movimentacao_tecnico enable row level security;
alter table orcamento_tecnico enable row level security;
alter table valor_tecnico enable row level security;
alter table credito_tecnico enable row level security;
alter table nota_fiscal enable row level security;
alter table configuracao_fiscal enable row level security;
alter table google_calendar_config enable row level security;
alter table log_acao enable row level security;
alter table ponto_eletronico enable row level security;

-- EMPRESA: todo usuário autenticado vê só a própria empresa; só admin_global cria/edita outras
create policy empresa_select on empresa for select
  using (is_admin_global() or id = auth_empresa_id());
create policy empresa_update on empresa for update
  using (is_admin_global() or (id = auth_empresa_id() and is_admin_empresa()))
  with check (is_admin_global() or (id = auth_empresa_id() and is_admin_empresa()));
create policy empresa_insert on empresa for insert
  with check (auth.uid() is not null); -- autosignup de empresa vem na fase seguinte; por ora só exige sessão válida
create policy empresa_delete on empresa for delete
  using (is_admin_global());

-- PROFILES: usuário vê/edita o próprio perfil; admin da empresa vê perfis da empresa
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin_global() or (is_admin_empresa() and empresa_id = auth_empresa_id()));
create policy profiles_update on profiles for update
  using (id = auth.uid() or is_admin_global())
  with check (id = auth.uid() or is_admin_global());
create policy profiles_insert on profiles for insert
  with check (id = auth.uid());

-- Padrão "mesma empresa, leitura livre, escrita por admin/dono do registro" — tabelas simples
create policy tecnico_select on tecnico for select using (same_empresa(empresa_id));
create policy tecnico_insert on tecnico for insert with check (same_empresa(empresa_id) and is_admin_empresa());
create policy tecnico_update on tecnico for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or id = auth_tecnico_id()))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or id = auth_tecnico_id()));
create policy tecnico_delete on tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy cliente_select on cliente for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico' or id = auth_cliente_id()));
create policy cliente_insert on cliente for insert with check (same_empresa(empresa_id) and is_admin_empresa());
create policy cliente_update on cliente for update
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());
create policy cliente_delete on cliente for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy cliente_estab_all on cliente_estabelecimento for all
  using (exists (select 1 from cliente c where c.id = cliente_id and same_empresa(c.empresa_id)))
  with check (exists (select 1 from cliente c where c.id = cliente_id and same_empresa(c.empresa_id) and is_admin_empresa()));

create policy cliente_doc_all on cliente_documento for all
  using (exists (select 1 from cliente c where c.id = cliente_id and same_empresa(c.empresa_id)))
  with check (exists (select 1 from cliente c where c.id = cliente_id and same_empresa(c.empresa_id) and is_admin_empresa()));

create policy equipamento_all on equipamento for all
  using (same_empresa(empresa_id))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'));

-- CHAMADO: leitura/escrita por dono do registro (técnico/cliente) ou admin da empresa
create policy chamado_select on chamado for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );
create policy chamado_insert on chamado for insert
  with check (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );
create policy chamado_update on chamado for update
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa() or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
    )
  )
  with check (
    same_empresa(empresa_id) and (
      is_admin_empresa() or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
    )
  );
create policy chamado_delete on chamado for delete using (same_empresa(empresa_id) and is_admin_empresa());

-- PMOC / MANUTENCAO_PMOC: mesmo padrão de chamado
create policy pmoc_select on pmoc for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (auth_tipo_usuario() = 'tecnico' and tecnico_responsavel_id = auth_tecnico_id())
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );
create policy pmoc_write on pmoc for insert with check (same_empresa(empresa_id) and is_admin_empresa());
create policy pmoc_update on pmoc for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or (auth_tipo_usuario() = 'tecnico' and tecnico_responsavel_id = auth_tecnico_id())))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or (auth_tipo_usuario() = 'tecnico' and tecnico_responsavel_id = auth_tecnico_id())));
create policy pmoc_delete on pmoc for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy manutpmoc_select on manutencao_pmoc for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );
create policy manutpmoc_insert on manutencao_pmoc for insert with check (same_empresa(empresa_id) and is_admin_empresa());
create policy manutpmoc_update on manutencao_pmoc for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())));
create policy manutpmoc_delete on manutencao_pmoc for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy agenda_all on agenda_evento for all
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  )
  with check (same_empresa(empresa_id));

-- Financeiro / fiscal: só admin da empresa
create policy financeiro_all on financeiro for all
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());

create policy notafiscal_all on nota_fiscal for all
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());

create policy configfiscal_all on configuracao_fiscal for all
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());

-- Financeiro do técnico: técnico vê/lança o próprio, admin da empresa vê/aprova tudo
create policy gastotec_select on gasto_tecnico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy gastotec_insert on gasto_tecnico for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy gastotec_update on gasto_tecnico for update
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());
create policy gastotec_delete on gasto_tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy lanctec_select on lancamento_tecnico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy lanctec_insert on lancamento_tecnico for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy lanctec_update on lancamento_tecnico for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and pode_editar)))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and pode_editar)));
create policy lanctec_delete on lancamento_tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy movtec_select on movimentacao_tecnico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy movtec_insert on movimentacao_tecnico for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy movtec_update on movimentacao_tecnico for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and status = 'pendente')))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and status = 'pendente')));
create policy movtec_delete on movimentacao_tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy orctec_select on orcamento_tecnico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy orctec_insert on orcamento_tecnico for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy orctec_update on orcamento_tecnico for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and status = 'pendente')))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and status = 'pendente')));
create policy orctec_delete on orcamento_tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy valtec_select on valor_tecnico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy valtec_write on valor_tecnico for insert with check (same_empresa(empresa_id) and is_admin_empresa());
create policy valtec_update on valor_tecnico for update
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());
create policy valtec_delete on valor_tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

create policy creditec_select on credito_tecnico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy creditec_insert on credito_tecnico for insert with check (same_empresa(empresa_id) and is_admin_empresa());
create policy creditec_update on credito_tecnico for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and status = 'pendente')))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or (tecnico_id = auth_tecnico_id() and status = 'pendente')));
create policy creditec_delete on credito_tecnico for delete using (same_empresa(empresa_id) and is_admin_empresa());

-- Google Calendar: só o dono da conexão (ou admin_global)
create policy gcalconfig_all on google_calendar_config for all
  using (is_admin_global() or (same_empresa(empresa_id) and user_id = auth.uid()))
  with check (is_admin_global() or (same_empresa(empresa_id) and user_id = auth.uid()));

-- LogAcao: leitura só admin da empresa; escrita liberada (é auditoria, qualquer ação autenticada grava)
create policy logacao_select on log_acao for select using (same_empresa(empresa_id) and is_admin_empresa());
create policy logacao_insert on log_acao for insert with check (same_empresa(empresa_id));

-- Ponto eletrônico: técnico bate o próprio ponto, admin da empresa vê/edita tudo
create policy ponto_select on ponto_eletronico for select
  using (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy ponto_insert on ponto_eletronico for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or tecnico_id = auth_tecnico_id()));
create policy ponto_update on ponto_eletronico for update
  using (same_empresa(empresa_id) and is_admin_empresa())
  with check (same_empresa(empresa_id) and is_admin_empresa());
create policy ponto_delete on ponto_eletronico for delete using (same_empresa(empresa_id) and is_admin_empresa());
