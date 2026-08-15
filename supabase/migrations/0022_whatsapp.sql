-- Notificações por WhatsApp via uazapi.
--
-- Desenho: o banco não fala com o uazapi. Ele só enfileira o texto pronto em
-- `whatsapp_mensagem` e cutuca a Edge Function `whatsapp-enviar`, que é quem
-- faz o HTTP. Motivo: gatilho que faz chamada externa síncrona segura a
-- transação e derruba o cadastro do chamado se a internet do provedor cair.
-- Aqui, se o uazapi estiver fora do ar, o chamado é salvo do mesmo jeito e a
-- mensagem fica na fila esperando a próxima varredura.
--
-- Entrega: o gatilho dispara na hora (pg_net é assíncrono, não bloqueia o
-- commit) e um pg_cron de minuto em minuto recolhe o que ficou para trás. Ou
-- seja, o caminho normal é instantâneo e a varredura é rede de segurança.

-- ============================================================
-- CONFIGURAÇÃO POR EMPRESA
-- ============================================================

alter table empresa add column if not exists whatsapp_destino text;
alter table empresa add column if not exists whatsapp_ativo boolean not null default false;

-- Liga/desliga por evento. Empresa que só quer chamado novo desmarca o resto
-- sem precisar desligar a integração inteira.
alter table empresa add column if not exists whatsapp_eventos jsonb not null default
  '{"chamado_aberto": true, "orcamento_respondido": true, "alerta": true}'::jsonb;

-- ============================================================
-- CONFIGURAÇÃO DO DISPARO (não é dado de empresa, é de infraestrutura)
-- ============================================================

-- Guarda a URL da Edge Function e o segredo que o pg_net manda no header.
-- Sem policy nenhuma e sem grant: não é acessível pelo PostgREST, só pelas
-- funções security definer daqui.
create table if not exists configuracao_integracao (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);

alter table configuracao_integracao enable row level security;
revoke all on configuracao_integracao from anon, authenticated;

-- ============================================================
-- FILA
-- ============================================================

create table if not exists whatsapp_mensagem (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  evento text not null check (evento in (
    'chamado_aberto', 'orcamento_respondido', 'alerta', 'teste'
  )),
  -- identifica a ocorrência dentro do evento. Mesmo truque da tabela `alerta`:
  -- o unique com ela faz o insert repetido não fazer nada, então nenhuma
  -- reexecução de gatilho manda a mesma mensagem duas vezes.
  chave text not null,
  destino text not null,
  texto text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'enviando', 'enviado', 'erro', 'cancelado')),
  tentativas integer not null default 0,
  erro text,
  resposta jsonb,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, evento, chave)
);

create index if not exists idx_whatsapp_pendente
  on whatsapp_mensagem(status, created_at) where status in ('pendente', 'enviando');
create index if not exists idx_whatsapp_empresa
  on whatsapp_mensagem(empresa_id, created_at desc);

drop trigger if exists trg_whatsapp_updated on whatsapp_mensagem;
create trigger trg_whatsapp_updated before update on whatsapp_mensagem
  for each row execute function set_updated_at();

alter table whatsapp_mensagem enable row level security;

-- A empresa lê o próprio histórico para conferir o que saiu. Escrever é só
-- por gatilho e pela Edge Function, que usam service role e não passam por
-- policy — por isso não existe policy de insert nem de update aqui.
drop policy if exists whatsapp_select on whatsapp_mensagem;
create policy whatsapp_select on whatsapp_mensagem for select
  using (same_empresa(empresa_id) and is_admin_empresa());

-- ============================================================
-- NORMALIZAÇÃO DO NÚMERO
-- ============================================================

-- O uazapi quer 55 + DDD + número, tudo junto e só dígito.
--
-- Importante: o nono dígito NÃO é removido aqui. Em DDD fora de São Paulo o
-- próprio WhatsApp resolve isso do lado dele; tirar na mão faz a mensagem ir
-- para um número que não existe.
create or replace function normalizar_whatsapp(p_numero text) returns text
language sql immutable as $$
  select case
    when d = '' then null
    -- já veio com código do país
    when length(d) >= 12 and left(d, 2) = '55' then d
    -- DDD + número: 10 dígitos em fixo, 11 com o nono
    when length(d) in (10, 11) then '55' || d
    -- qualquer outra coisa passa como está e o uazapi reclama, que é melhor
    -- do que a gente adivinhar errado em silêncio
    else d
  end
  from (select regexp_replace(coalesce(p_numero, ''), '\D', '', 'g') as d) s;
$$;

-- ============================================================
-- TEXTO DAS MENSAGENS
-- ============================================================

create or replace function whatsapp_rotulo_prioridade(p text) returns text
language sql immutable as $$
  select case p
    when 'urgente' then '🔴 Urgente'
    when 'alta' then '🟠 Alta'
    when 'media' then '🟡 Média'
    when 'baixa' then '🟢 Baixa'
    else coalesce(p, '—')
  end;
$$;

create or replace function whatsapp_rotulo_problema(p text) returns text
language sql immutable as $$
  select case p
    when 'manutencao_preventiva' then 'Manutenção preventiva'
    when 'manutencao_corretiva' then 'Manutenção corretiva'
    when 'instalacao' then 'Instalação'
    when 'emergencia' then 'Emergência'
    when 'outro' then 'Outro'
    else coalesce(p, '—')
  end;
$$;

create or replace function whatsapp_texto_chamado(p_chamado_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select
    '🔧 *Chamado novo* #' || coalesce(c.numero_chamado, left(c.id::text, 8)) || E'\n\n'
    || '*' || c.titulo || '*' || E'\n'
    || 'Cliente: ' || coalesce(cl.nome, '—') || E'\n'
    || 'Tipo: ' || whatsapp_rotulo_problema(c.tipo_problema) || E'\n'
    || 'Prioridade: ' || whatsapp_rotulo_prioridade(c.prioridade) || E'\n'
    || case when coalesce(c.local, cl.endereco) is not null
            then 'Local: ' || coalesce(c.local, cl.endereco) || E'\n' else '' end
    || case when c.descricao is not null and c.descricao <> ''
            then E'\n' || left(c.descricao, 400) || E'\n' else '' end
    -- chamado que entrou pelo QR code não tem usuário logado atrás, então
    -- quem reportou é a informação mais útil da mensagem
    || case when c.origem = 'qr_code'
            then E'\n📱 Aberto pelo QR code por ' || coalesce(c.solicitante_nome, 'alguém no local')
                 || coalesce(' (' || c.solicitante_contato || ')', '')
            else '' end
  from chamado c
  left join cliente cl on cl.id = c.cliente_id
  where c.id = p_chamado_id;
$$;

create or replace function whatsapp_texto_orcamento(p_orcamento_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select
    case when o.status = 'aprovado' then '✅ *Orçamento aprovado*' else '❌ *Orçamento recusado*' end
    || ' #' || coalesce(o.numero_orcamento, left(o.id::text, 8)) || E'\n\n'
    || '*' || o.titulo || '*' || E'\n'
    || 'Cliente: ' || coalesce(cl.nome, '—') || E'\n'
    || 'Valor: R$ ' || formatar_reais(coalesce(o.valor_total, 0) - coalesce(o.desconto, 0)) || E'\n'
    || case when o.nome_aprovador is not null
            then 'Respondido por: ' || o.nome_aprovador || E'\n' else '' end
    || case when o.status = 'recusado' and o.motivo_recusa is not null and o.motivo_recusa <> ''
            then E'\nMotivo: ' || left(o.motivo_recusa, 400) else '' end
  from orcamento o
  left join cliente cl on cl.id = o.cliente_id
  where o.id = p_orcamento_id;
$$;

create or replace function whatsapp_texto_alerta(p_alerta_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select
    case a.severidade when 'alta' then '🔴' when 'media' then '🟡' else '🔵' end
    || ' *' || a.titulo || '*' || E'\n\n'
    || a.descricao
    || case when cl.nome is not null then E'\n\nCliente: ' || cl.nome else '' end
  from alerta a
  left join cliente cl on cl.id = a.cliente_id
  where a.id = p_alerta_id;
$$;

-- ============================================================
-- DISPARO
-- ============================================================

-- Cutuca a Edge Function. Falha aqui nunca derruba a transação de quem chamou:
-- a mensagem já está na fila, e a varredura do pg_cron pega depois.
create or replace function whatsapp_cutucar() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text;
  v_segredo text;
begin
  select valor into v_url from configuracao_integracao where chave = 'whatsapp_edge_url';
  select valor into v_segredo from configuracao_integracao where chave = 'whatsapp_edge_secret';
  if v_url is null or v_segredo is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-climapro-secret', v_segredo
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'whatsapp_cutucar falhou: %', sqlerrm;
end;
$$;

-- Coloca uma mensagem na fila, respeitando a configuração da empresa.
create or replace function whatsapp_enfileirar(
  p_empresa_id uuid,
  p_evento text,
  p_chave text,
  p_texto text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_destino text;
  v_ativo boolean;
  v_eventos jsonb;
  v_inseridas integer := 0;
begin
  select normalizar_whatsapp(e.whatsapp_destino), e.whatsapp_ativo, e.whatsapp_eventos
    into v_destino, v_ativo, v_eventos
  from empresa e where e.id = p_empresa_id;

  if not coalesce(v_ativo, false) or v_destino is null then
    return;
  end if;
  -- evento não listado no jsonb conta como ligado; assim um evento novo já
  -- nasce funcionando sem precisar mexer na configuração de cada empresa
  if coalesce((v_eventos ->> p_evento)::boolean, true) is not true then
    return;
  end if;
  if p_texto is null or btrim(p_texto) = '' then
    return;
  end if;

  insert into whatsapp_mensagem (empresa_id, evento, chave, destino, texto)
  values (p_empresa_id, p_evento, p_chave, v_destino, p_texto)
  on conflict (empresa_id, evento, chave) do nothing;

  get diagnostics v_inseridas = row_count;
  -- só cutuca se a linha realmente entrou; mensagem barrada pelo unique não
  -- precisa acordar a Edge Function
  if v_inseridas > 0 then
    perform whatsapp_cutucar();
  end if;
end;
$$;

-- ============================================================
-- GATILHOS
-- ============================================================

create or replace function trg_whatsapp_chamado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform whatsapp_enfileirar(
    NEW.empresa_id, 'chamado_aberto', NEW.id::text, whatsapp_texto_chamado(NEW.id)
  );
  return NEW;
end;
$$;

drop trigger if exists trg_whatsapp_chamado on chamado;
create trigger trg_whatsapp_chamado after insert on chamado
  for each row execute function trg_whatsapp_chamado();

create or replace function trg_whatsapp_orcamento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if NEW.status is distinct from OLD.status and NEW.status in ('aprovado', 'recusado') then
    perform whatsapp_enfileirar(
      NEW.empresa_id, 'orcamento_respondido', NEW.id::text || ':' || NEW.status,
      whatsapp_texto_orcamento(NEW.id)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_whatsapp_orcamento on orcamento;
create trigger trg_whatsapp_orcamento after update on orcamento
  for each row execute function trg_whatsapp_orcamento();

create or replace function trg_whatsapp_alerta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- alerta de cliente é assunto do portal do cliente, não vai para a empresa
  if NEW.destinatario = 'empresa' then
    perform whatsapp_enfileirar(
      NEW.empresa_id, 'alerta', NEW.tipo || ':' || NEW.chave, whatsapp_texto_alerta(NEW.id)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_whatsapp_alerta on alerta;
create trigger trg_whatsapp_alerta after insert on alerta
  for each row execute function trg_whatsapp_alerta();

-- ============================================================
-- RPCs QUE A EDGE FUNCTION USA
-- ============================================================

-- Reserva um lote para envio. O `for update skip locked` é o que impede a
-- varredura do cron e o disparo do gatilho de pegarem a mesma mensagem e
-- mandarem duas vezes.
create or replace function whatsapp_reservar_lote(p_limite integer default 20)
returns setof whatsapp_mensagem
language plpgsql security definer set search_path = public as $$
begin
  -- devolve para a fila o que ficou preso em 'enviando' (função caiu no meio)
  update whatsapp_mensagem
     set status = 'pendente'
   where status = 'enviando' and updated_at < now() - interval '5 minutes';

  return query
  with proximos as (
    select m.id from whatsapp_mensagem m
     where m.status = 'pendente' and m.tentativas < 5
     order by m.created_at
     limit p_limite
     for update skip locked
  )
  update whatsapp_mensagem m
     set status = 'enviando', tentativas = m.tentativas + 1
    from proximos p
   where m.id = p.id
  returning m.*;
end;
$$;

create or replace function whatsapp_concluir(
  p_id uuid,
  p_ok boolean,
  p_erro text default null,
  p_resposta jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update whatsapp_mensagem
     set status = case
           when p_ok then 'enviado'
           -- só desiste depois de 5 tentativas; antes disso volta para a fila
           when tentativas >= 5 then 'erro'
           else 'pendente'
         end,
         erro = case when p_ok then null else p_erro end,
         resposta = coalesce(p_resposta, resposta),
         enviado_em = case when p_ok then now() else enviado_em end
   where id = p_id;
end;
$$;

-- Usada pelo botão "enviar teste" da tela de configuração.
create or replace function whatsapp_enfileirar_teste(p_empresa_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_destino text;
  v_id uuid;
  v_nome text;
begin
  if not (same_empresa(p_empresa_id) and is_admin_empresa()) then
    raise exception 'Sem permissão para testar o WhatsApp desta empresa';
  end if;

  select normalizar_whatsapp(e.whatsapp_destino), e.nome into v_destino, v_nome
  from empresa e where e.id = p_empresa_id;

  if v_destino is null then
    raise exception 'Cadastre o número de WhatsApp antes de enviar o teste';
  end if;

  -- o teste ignora whatsapp_ativo de propósito: serve justamente para conferir
  -- o número antes de ligar a integração
  insert into whatsapp_mensagem (empresa_id, evento, chave, destino, texto)
  values (
    p_empresa_id, 'teste', to_char(now(), 'YYYYMMDDHH24MISS'), v_destino,
    '✅ *ClimaPro conectado*' || E'\n\n'
      || 'Se você recebeu esta mensagem, as notificações de ' || coalesce(v_nome, 'sua empresa')
      || ' já estão chegando neste número.'
  )
  returning id into v_id;

  perform whatsapp_cutucar();
  return v_id;
end;
$$;

grant execute on function whatsapp_enfileirar_teste(uuid) to authenticated;

-- ============================================================
-- VARREDURA
-- ============================================================

-- Rede de segurança: o gatilho já cutuca na hora, isto aqui recolhe o que
-- ficou para trás quando o uazapi estava fora do ar.
select cron.unschedule('whatsapp-fila') where exists (
  select 1 from cron.job where jobname = 'whatsapp-fila'
);
select cron.schedule('whatsapp-fila', '* * * * *', $cron$ select whatsapp_cutucar(); $cron$);

notify pgrst, 'reload schema';
