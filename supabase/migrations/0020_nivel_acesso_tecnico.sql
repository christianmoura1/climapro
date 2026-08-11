-- Nível de acesso do técnico.
--
-- Até agora todo técnico era igual: nenhum criava cliente, e todos criavam
-- equipamento e chamado. Agora são dois perfis:
--
--   completo  — cadastra cliente, equipamento e abre chamado, além de executar
--   execucao  — só executa: atende os chamados que são dele e faz o PMOC
--
-- O padrão é 'completo' de propósito. Ele preserva exatamente o que os
-- técnicos já podiam fazer; começar em 'execucao' tiraria acesso de quem está
-- trabalhando hoje, sem aviso. A empresa rebaixa quem precisar na tela de
-- Técnicos.

alter table tecnico
  add column if not exists nivel_acesso text not null default 'completo'
  check (nivel_acesso in ('completo', 'execucao'));

-- Nível do técnico logado. Devolve null para quem não é técnico, então as
-- policies precisam continuar checando auth_tipo_usuario() antes.
create or replace function auth_tecnico_nivel() returns text
language sql stable security definer set search_path = public as
$$ select t.nivel_acesso from tecnico t where t.id = auth_tecnico_id() $$;

-- Atalho para as policies: técnico da empresa com nível completo.
create or replace function is_tecnico_completo() returns boolean
language sql stable security definer set search_path = public as
$$ select auth_tipo_usuario() = 'tecnico' and auth_tecnico_nivel() = 'completo' $$;

-- CLIENTE: técnico completo passa a poder cadastrar. Editar e excluir seguem
-- só com o administrador — cadastrar em campo é uma coisa, mexer no contrato
-- de um cliente que já existe é outra.
drop policy if exists cliente_insert on cliente;
create policy cliente_insert on cliente for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or is_tecnico_completo()));

-- EQUIPAMENTO: a policy era um FOR ALL que deixava qualquer técnico gravar.
-- Separada por comando, porque ler e escrever passam a ter regras diferentes:
-- todo mundo da empresa lê, só admin e técnico completo escrevem.
drop policy if exists equipamento_all on equipamento;

drop policy if exists equipamento_select on equipamento;
create policy equipamento_select on equipamento for select
  using (same_empresa(empresa_id));

drop policy if exists equipamento_insert on equipamento;
create policy equipamento_insert on equipamento for insert
  with check (same_empresa(empresa_id) and (is_admin_empresa() or is_tecnico_completo()));

drop policy if exists equipamento_update on equipamento;
create policy equipamento_update on equipamento for update
  using (same_empresa(empresa_id))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or is_tecnico_completo()));

drop policy if exists equipamento_delete on equipamento;
create policy equipamento_delete on equipamento for delete
  using (same_empresa(empresa_id) and is_admin_empresa());

-- CHAMADO: abrir passa a exigir nível completo. Atualizar não muda — o técnico
-- de execução precisa finalizar o que é dele, que é justamente o trabalho dele.
drop policy if exists chamado_insert on chamado;
create policy chamado_insert on chamado for insert
  with check (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (is_tecnico_completo() and tecnico_id = auth_tecnico_id())
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

notify pgrst, 'reload schema';
