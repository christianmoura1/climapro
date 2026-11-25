-- Permissão da agenda, técnico por técnico.
--
-- A agenda da empresa ficava com o administrador. A policy agenda_all deixava
-- o técnico ler, alterar e apagar só o evento em que ele mesmo estava marcado
-- (tecnico_id = auth_tecnico_id()). Não havia tela para isso no painel dele.
--
-- A empresa passa a escolher:
--   nenhum — sem acesso
--   ver    — lê a agenda da empresa, sem criar, alterar ou apagar
--   editar — lê e grava a agenda da empresa
--
-- O padrão é 'ver'. Começar em 'nenhum' esconderia a agenda de quem já está
-- em campo até alguém lembrar de ligar. Começar em 'editar' entregaria a
-- escrita da agenda inteira sem a empresa ter pedido: a interface do técnico
-- não gravava evento. 'ver' abre a consulta e deixa a escrita como decisão
-- explícita, na tela de Técnicos.
--
-- text + check, no mesmo formato de nivel_acesso. Um tipo enum do Postgres
-- complica qualquer ajuste futuro dentro de transação, e o restante do schema
-- não usa esse recurso.

alter table tecnico
  add column if not exists agenda_permissao text not null default 'ver';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tecnico_agenda_permissao_check'
      and conrelid = 'public.tecnico'::regclass
  ) then
    alter table tecnico
      add constraint tecnico_agenda_permissao_check
      check (agenda_permissao in ('nenhum', 'ver', 'editar'));
  end if;
end $$;

-- Permissão do técnico logado. Null para quem não é técnico: as policies
-- continuam checando auth_tipo_usuario() antes de usar o retorno.
create or replace function auth_tecnico_agenda_permissao() returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.agenda_permissao
  from tecnico t
  where t.id = auth_tecnico_id()
$$;

revoke all on function public.auth_tecnico_agenda_permissao() from public;
grant execute on function public.auth_tecnico_agenda_permissao() to authenticated;

-- O técnico pode atualizar a própria linha (telefone, etc.). Sem este gatilho
-- ele gravaria agenda_permissao = 'editar' na própria ficha. Administrador da
-- empresa passa. A service role também, porque as funções de acesso do técnico
-- escrevem com ela e não carregam o JWT do administrador.
create or replace function tecnico_proteger_agenda_permissao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.agenda_permissao is distinct from old.agenda_permissao
     and not coalesce(is_admin_empresa(), false)
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'Só o administrador da empresa altera a permissão da agenda'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tecnico_proteger_agenda_permissao on tecnico;
create trigger trg_tecnico_proteger_agenda_permissao
  before update of agenda_permissao on tecnico
  for each row execute function tecnico_proteger_agenda_permissao();

-- A policy antiga era FOR ALL. O WITH CHECK pedia só a mesma empresa, então
-- qualquer sessão da empresa conseguia inserir evento. As novas separam
-- leitura e escrita. Cliente continua vendo e mexendo só no evento do próprio
-- cliente. Administrador continua com a agenda da empresa. Técnico de outra
-- empresa não passa de same_empresa().

drop policy if exists agenda_all on agenda_evento;
drop policy if exists agenda_select on agenda_evento;
drop policy if exists agenda_insert on agenda_evento;
drop policy if exists agenda_update on agenda_evento;
drop policy if exists agenda_delete on agenda_evento;

create policy agenda_select on agenda_evento
  for select
  to authenticated
  using (
    same_empresa(empresa_id)
    and (
      (select is_admin_empresa())
      or (
        (select auth_tipo_usuario()) = 'tecnico'
        and (select auth_tecnico_agenda_permissao()) in ('ver', 'editar')
      )
      or (
        (select auth_tipo_usuario()) = 'cliente'
        and cliente_id = (select auth_cliente_id())
      )
    )
  );

create policy agenda_insert on agenda_evento
  for insert
  to authenticated
  with check (
    same_empresa(empresa_id)
    and (
      (select is_admin_empresa())
      or (
        (select auth_tipo_usuario()) = 'tecnico'
        and (select auth_tecnico_agenda_permissao()) = 'editar'
      )
      or (
        (select auth_tipo_usuario()) = 'cliente'
        and cliente_id = (select auth_cliente_id())
      )
    )
  );

create policy agenda_update on agenda_evento
  for update
  to authenticated
  using (
    same_empresa(empresa_id)
    and (
      (select is_admin_empresa())
      or (
        (select auth_tipo_usuario()) = 'tecnico'
        and (select auth_tecnico_agenda_permissao()) = 'editar'
      )
      or (
        (select auth_tipo_usuario()) = 'cliente'
        and cliente_id = (select auth_cliente_id())
      )
    )
  )
  with check (
    same_empresa(empresa_id)
    and (
      (select is_admin_empresa())
      or (
        (select auth_tipo_usuario()) = 'tecnico'
        and (select auth_tecnico_agenda_permissao()) = 'editar'
      )
      or (
        (select auth_tipo_usuario()) = 'cliente'
        and cliente_id = (select auth_cliente_id())
      )
    )
  );

create policy agenda_delete on agenda_evento
  for delete
  to authenticated
  using (
    same_empresa(empresa_id)
    and (
      (select is_admin_empresa())
      or (
        (select auth_tipo_usuario()) = 'tecnico'
        and (select auth_tecnico_agenda_permissao()) = 'editar'
      )
      or (
        (select auth_tipo_usuario()) = 'cliente'
        and cliente_id = (select auth_cliente_id())
      )
    )
  );

notify pgrst, 'reload schema';
