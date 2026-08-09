-- Plano Basic (R$ 29,90) e teto de volume no Free.
--
-- Free passa a ter 40 chamados por mês e 20 clientes. Basic é o mesmo Free sem
-- esses tetos — mesmos módulos de propósito, o que se compra ali é volume.

alter table empresa drop constraint if exists empresa_plano_check;
alter table empresa add constraint empresa_plano_check
  check (plano in ('free','basic','essencial','profissional','corporativo','empresa','enterprise'));

-- ATENÇÃO à ordem: o backfill vem antes do gatilho.
--
-- limite_clientes nasceu na 0002 com `default 1` e nunca foi conferido por
-- ninguém, então quase toda empresa tem 1 gravado ali. Ligar a checagem antes
-- de arrumar isso travaria o cadastro de cliente de todo mundo, inclusive de
-- quem paga.
update empresa set
  limite_chamados_mes = 40,
  limite_clientes = 20
where plano = 'free';

update empresa set
  limite_chamados_mes = 999999,
  limite_clientes = 999999
where plano <> 'free';

alter table empresa alter column limite_chamados_mes set default 40;
alter table empresa alter column limite_clientes set default 20;

-- O teto vale no banco, e não só na tela, porque chamado nasce por quatro
-- caminhos: a tela da empresa, o painel do técnico, o portal do cliente e a
-- Edge Function do QR Code. Conferir em cada um deixaria buraco.
create or replace function checar_limite_chamados() returns trigger
language plpgsql as $$
declare
  maximo integer;
  usados integer;
  mes_do_chamado timestamptz;
begin
  select limite_chamados_mes into maximo from empresa where id = NEW.empresa_id;
  if maximo is null or maximo >= 999999 then
    return NEW;
  end if;

  -- A conta é do mês DO CHAMADO, não do mês corrente. Lançar um chamado com
  -- data retroativa (importação, registro atrasado) tem que ser cobrado do mês
  -- a que ele pertence, senão o mês cheio de agosto impediria de registrar
  -- algo de junho.
  mes_do_chamado := date_trunc('month', coalesce(NEW.data_abertura, now()));

  -- coalesce com created_at nas linhas já gravadas: chamado importado de
  -- sistema antigo pode não ter data_abertura.
  select count(*) into usados
  from chamado
  where empresa_id = NEW.empresa_id
    and date_trunc('month', coalesce(data_abertura, created_at)) = mes_do_chamado;

  if usados >= maximo then
    raise exception 'LIMITE_CHAMADOS: seu plano permite % chamado(s) por mês e você já abriu % em %.',
      maximo, usados, to_char(mes_do_chamado, 'MM/YYYY')
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_chamado_limite on chamado;
create trigger trg_chamado_limite before insert on chamado
  for each row execute function checar_limite_chamados();

create or replace function checar_limite_clientes() returns trigger
language plpgsql as $$
declare
  maximo integer;
  usados integer;
begin
  select limite_clientes into maximo from empresa where id = NEW.empresa_id;
  if maximo is null or maximo >= 999999 then
    return NEW;
  end if;

  select count(*) into usados from cliente where empresa_id = NEW.empresa_id;

  if usados >= maximo then
    raise exception 'LIMITE_CLIENTES: seu plano permite % cliente(s) e você já cadastrou %.', maximo, usados
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_cliente_limite on cliente;
create trigger trg_cliente_limite before insert on cliente
  for each row execute function checar_limite_clientes();

notify pgrst, 'reload schema';
