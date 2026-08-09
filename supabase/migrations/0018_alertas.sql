-- Central de alertas: o sistema fala primeiro.
--
-- Tudo aqui é conta em cima de dado que já existe, então roda em SQL puro no
-- pg_cron, sem Edge Function e sem modelo de linguagem. Uma vez por dia a
-- função varre as empresas e grava o que merece atenção.
--
-- O que evita virar notificação ignorada:
--
-- 1. `chave` identifica a ocorrência, e o unique com ela faz o insert repetido
--    não fazer nada. Alerta dispensado hoje não volta amanhã.
-- 2. A chave carrega o mês em quase todos os tipos, então uma situação que
--    continua ruim é lembrada uma vez por mês, não todo dia.
-- 3. Alerta que deixou de fazer sentido some sozinho (a rodada foi executada,
--    o cliente respondeu o orçamento) em vez de ficar acumulando.

create table if not exists alerta (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  tipo text not null check (tipo in (
    'pmoc_atrasado', 'pmoc_proximo', 'equipamento_recorrente',
    'orcamento_parado', 'cliente_sumido'
  )),
  -- identifica a ocorrência dentro do tipo; é o que segura a repetição
  chave text not null,
  severidade text not null default 'media' check (severidade in ('alta', 'media', 'baixa')),
  titulo text not null,
  descricao text not null,
  cliente_id uuid references cliente(id) on delete cascade,
  equipamento_id uuid references equipamento(id) on delete cascade,
  orcamento_id uuid references orcamento(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'novo' check (status in ('novo', 'lido', 'resolvido', 'dispensado')),
  visto_em timestamptz,
  resolvido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, tipo, chave)
);

create index if not exists idx_alerta_empresa on alerta(empresa_id);
create index if not exists idx_alerta_status on alerta(empresa_id, status);

drop trigger if exists trg_alerta_updated on alerta;
create trigger trg_alerta_updated before update on alerta
  for each row execute function set_updated_at();

alter table alerta enable row level security;

-- Alerta é assunto da operação: admin e técnico veem, o cliente não. Só a
-- própria empresa marca como lido ou dispensado; criar é da rotina do cron,
-- que roda como dono da função e não passa por policy.
drop policy if exists alerta_select on alerta;
create policy alerta_select on alerta for select
  using (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

drop policy if exists alerta_update on alerta;
create policy alerta_update on alerta for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'));

drop policy if exists alerta_delete on alerta;
create policy alerta_delete on alerta for delete
  using (same_empresa(empresa_id) and is_admin_empresa());

-- Data da visita de PMOC de um cliente num mês, em SQL. Mesma regra de
-- src/lib/pmocDataVisita.js: remarcação do mês vence; senão o dia fixo do
-- cliente, encurtado quando o mês não tem aquele dia; sem dia fixo, o dia do
-- cadastro.
create or replace function data_visita_pmoc(p_cliente_id uuid, p_mes date)
returns date
language sql stable as $$
  select coalesce(
    (select a.data_visita
       from pmoc_agendamento a
      where a.cliente_id = p_cliente_id
        and date_trunc('month', a.mes_referencia) = date_trunc('month', p_mes)),
    (select (date_trunc('month', p_mes)
             + (least(
                  coalesce(c.dia_execucao_pmoc, extract(day from c.created_at)::int),
                  extract(day from (date_trunc('month', p_mes) + interval '1 month - 1 day'))::int
                ) - 1) * interval '1 day')::date
       from cliente c
      where c.id = p_cliente_id)
  );
$$;

-- Real em texto sem depender do locale do banco. to_char com G e D usa
-- lc_numeric, que no Supabase é en_US: R$ 2.400,00 saía como "2,400.00".
create or replace function formatar_reais(v numeric) returns text
language sql immutable as $$
  select replace(
           regexp_replace(
             replace(to_char(round(v, 2), 'FM9999999999990.00'), '.', '#'),
             '(\d)(?=(\d{3})+#)', '\1.', 'g'
           ),
           '#', ','
         );
$$;

create or replace function gerar_alertas() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  criados integer := 0;
  inseridos integer;
  hoje date := current_date;
  mes date := date_trunc('month', current_date)::date;
begin
  -- 1. Visita do mês que passou da data e ninguém executou.
  with pendentes as (
    select e.empresa_id, e.cliente_id, data_visita_pmoc(e.cliente_id, mes) as data_visita
      from equipamento e
     where e.pmoc_ativo
     group by e.empresa_id, e.cliente_id
  )
  insert into alerta (empresa_id, tipo, chave, severidade, titulo, descricao, cliente_id, dados)
  select p.empresa_id,
         'pmoc_atrasado',
         p.cliente_id::text || ':' || to_char(mes, 'YYYY-MM'),
         'alta',
         'PMOC atrasado — ' || c.nome,
         'A visita estava marcada para ' || to_char(p.data_visita, 'DD/MM/YYYY')
           || ' e ainda não foi executada. Já são ' || (hoje - p.data_visita) || ' dia(s) de atraso.',
         p.cliente_id,
         jsonb_build_object('data_visita', p.data_visita, 'dias_atraso', hoje - p.data_visita)
    from pendentes p
    join cliente c on c.id = p.cliente_id
   where p.data_visita < hoje
     and not exists (
       select 1 from manutencao_pmoc m
        where m.cliente_id = p.cliente_id
          and m.status <> 'cancelada'
          and date_trunc('month', coalesce(m.data_execucao, m.created_at)) = date_trunc('month', mes)
     )
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- 2. Visita chegando (até 3 dias). Serve de aviso para organizar a rota.
  with proximas as (
    select e.empresa_id, e.cliente_id, data_visita_pmoc(e.cliente_id, mes) as data_visita,
           count(*) as qtd_equipamentos
      from equipamento e
     where e.pmoc_ativo
     group by e.empresa_id, e.cliente_id
  )
  insert into alerta (empresa_id, tipo, chave, severidade, titulo, descricao, cliente_id, dados)
  select p.empresa_id,
         'pmoc_proximo',
         p.cliente_id::text || ':' || to_char(p.data_visita, 'YYYY-MM-DD'),
         'media',
         'PMOC em ' || to_char(p.data_visita, 'DD/MM') || ' — ' || c.nome,
         p.qtd_equipamentos || ' equipamento(s) para atender. Confirme o técnico e a rota.',
         p.cliente_id,
         jsonb_build_object('data_visita', p.data_visita, 'equipamentos', p.qtd_equipamentos)
    from proximas p
    join cliente c on c.id = p.cliente_id
   where p.data_visita between hoje and hoje + 3
     and not exists (
       select 1 from manutencao_pmoc m
        where m.cliente_id = p.cliente_id
          and m.status <> 'cancelada'
          and date_trunc('month', coalesce(m.data_execucao, m.created_at)) = date_trunc('month', mes)
     )
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- 3. Equipamento com corretiva se repetindo: 3 ou mais chamados em 90 dias.
  --    Chamado voltando no mesmo aparelho quase sempre é peça no fim da vida.
  with recorrentes as (
    select ch.empresa_id, e.id as equipamento_id, e.cliente_id, count(*) as chamados
      from chamado ch
      join equipamento e
        on e.id = ch.equipamento_id or e.id = any(ch.equipamentos_ids)
     where coalesce(ch.data_abertura, ch.created_at) >= now() - interval '90 days'
       and ch.status <> 'cancelado'
     group by ch.empresa_id, e.id, e.cliente_id
    having count(*) >= 3
  )
  insert into alerta (empresa_id, tipo, chave, severidade, titulo, descricao, cliente_id, equipamento_id, dados)
  select r.empresa_id,
         'equipamento_recorrente',
         r.equipamento_id::text || ':' || to_char(mes, 'YYYY-MM'),
         'alta',
         'Equipamento repetindo defeito — ' || coalesce(e.numero_equipamento, 'sem número'),
         r.chamados || ' chamados nos últimos 90 dias em ' || coalesce(e.marca, '') || ' ' || coalesce(e.modelo, '')
           || ' (' || c.nome || '). Vale olhar troca de peça antes da próxima parada.',
         r.cliente_id,
         r.equipamento_id,
         jsonb_build_object('chamados_90_dias', r.chamados)
    from recorrentes r
    join equipamento e on e.id = r.equipamento_id
    join cliente c on c.id = r.cliente_id
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- 4. Orçamento enviado há mais de 7 dias sem resposta.
  insert into alerta (empresa_id, tipo, chave, severidade, titulo, descricao, cliente_id, orcamento_id, dados)
  select o.empresa_id,
         'orcamento_parado',
         o.id::text,
         'media',
         'Orçamento sem resposta — ' || c.nome,
         'Enviado em ' || to_char(o.data_envio, 'DD/MM/YYYY') || ' no valor de R$ '
           || formatar_reais(o.valor_total - o.desconto) || '. Já são '
           || extract(day from (now() - o.data_envio))::int || ' dias sem retorno.',
         o.cliente_id,
         o.id,
         jsonb_build_object('valor', o.valor_total - o.desconto, 'data_envio', o.data_envio)
    from orcamento o
    join cliente c on c.id = o.cliente_id
   where o.status = 'enviado'
     and o.data_envio is not null
     and o.data_envio < now() - interval '7 days'
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- 5. Cliente sem chamado e sem visita há 90 dias. Em manutenção, silêncio
  --    costuma ser cliente indo embora.
  insert into alerta (empresa_id, tipo, chave, severidade, titulo, descricao, cliente_id, dados)
  select c.empresa_id,
         'cliente_sumido',
         c.id::text || ':' || to_char(mes, 'YYYY-MM'),
         'baixa',
         'Cliente sem movimento — ' || c.nome,
         'Nenhum chamado nem manutenção nos últimos 90 dias. Vale um contato antes que ele procure outro.',
         c.id,
         '{}'::jsonb
    from cliente c
   where exists (select 1 from equipamento e where e.cliente_id = c.id)
     -- Quem tem PMOC ativo não está sumido: tem contrato e visita marcada, e
     -- se algo atrasar já existe alerta próprio para isso.
     and not exists (select 1 from equipamento e where e.cliente_id = c.id and e.pmoc_ativo)
     and not exists (
       select 1 from chamado ch
        where ch.cliente_id = c.id
          and coalesce(ch.data_abertura, ch.created_at) >= now() - interval '90 days'
     )
     and not exists (
       select 1 from manutencao_pmoc m
        where m.cliente_id = c.id
          and coalesce(m.data_execucao, m.created_at) >= now() - interval '90 days'
     )
     and c.created_at < now() - interval '90 days'
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- Fecha sozinho o que deixou de fazer sentido. Alerta que continua aberto
  -- depois de resolvido na prática é o que mais desgasta a confiança no aviso.
  update alerta a set status = 'resolvido', resolvido_em = now()
   where a.status in ('novo', 'lido')
     and (
       (a.tipo in ('pmoc_atrasado', 'pmoc_proximo') and exists (
          select 1 from manutencao_pmoc m
           where m.cliente_id = a.cliente_id
             and m.status <> 'cancelada'
             and date_trunc('month', coalesce(m.data_execucao, m.created_at)) = date_trunc('month', mes)
        ))
       or (a.tipo = 'orcamento_parado' and exists (
            select 1 from orcamento o where o.id = a.orcamento_id and o.status <> 'enviado'
          ))
       or (a.tipo = 'cliente_sumido' and exists (
            select 1 from chamado ch
             where ch.cliente_id = a.cliente_id
               and coalesce(ch.data_abertura, ch.created_at) >= now() - interval '90 days'
          ))
     );

  return criados;
end;
$$;

-- Uma passada por dia, de manhã cedo (07:10 em Brasília = 10:10 UTC).
select cron.unschedule('gerar-alertas-diario')
 where exists (select 1 from cron.job where jobname = 'gerar-alertas-diario');

select cron.schedule('gerar-alertas-diario', '10 10 * * *', $$ select gerar_alertas(); $$);

-- Primeira carga, para o painel não nascer vazio.
select gerar_alertas();

notify pgrst, 'reload schema';
