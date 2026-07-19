-- Corrige o problema de "ovo e galinha" no cadastro de empresa: o usuário só
-- vira admin_empresa DEPOIS de criar a empresa, então a política de RLS de
-- insert (que dependia do perfil já ter empresa_id) nunca conseguia passar.
-- Uma função security definer resolve isso: ela roda com privilégio de dono
-- da tabela (ignora RLS internamente), mas checa manualmente as regras de
-- negócio que importam (usuário autenticado, ainda sem empresa).
create extension if not exists "unaccent";

create or replace function criar_empresa_inicial(
  p_nome text,
  p_cnpj text,
  p_telefone text,
  p_endereco text
) returns empresa
language plpgsql security definer set search_path = public as
$$
declare
  v_empresa empresa;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from profiles where id = auth.uid() and empresa_id is not null) then
    raise exception 'Usuário já possui uma empresa vinculada';
  end if;

  v_slug := regexp_replace(lower(unaccent(coalesce(p_nome, ''))), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'empresa-' || substr(gen_random_uuid()::text, 1, 8);
  end if;

  insert into empresa (nome, slug_empresa, cnpj, telefone, endereco, plano, status, status_pagamento)
  values (p_nome, v_slug, p_cnpj, p_telefone, p_endereco, 'free', 'ativa', 'ativo')
  returning * into v_empresa;

  update profiles
  set empresa_id = v_empresa.id, tipo_usuario = 'admin_empresa'
  where id = auth.uid();

  return v_empresa;
end;
$$;

grant execute on function criar_empresa_inicial(text, text, text, text) to authenticated;

-- ============================================================
-- Cliente: estabelecimentos/documentos deveriam ser arrays embutidos no
-- próprio registro (é assim que o front-end sempre esperou), não tabelas
-- filhas separadas — isso foi um exagero meu de normalização na migração
-- inicial. Corrigindo para bater com o formulário real.
-- ============================================================
alter table cliente add column if not exists estabelecimentos jsonb not null default '[]'::jsonb;
alter table cliente add column if not exists documentos jsonb not null default '[]'::jsonb;
drop table if exists cliente_estabelecimento;
drop table if exists cliente_documento;

-- ============================================================
-- Ajustar CHECK constraints pra bater com valores reais usados no front-end
-- ============================================================
alter table empresa drop constraint if exists empresa_plano_check;
alter table empresa add constraint empresa_plano_check
  check (plano in ('free','essencial','profissional','corporativo','enterprise','intermediario','avancado'));

alter table ponto_eletronico drop constraint if exists ponto_eletronico_status_check;
alter table ponto_eletronico add constraint ponto_eletronico_status_check
  check (status in ('normal','editado','aprovado_manual','aguardando_aprovacao'));
