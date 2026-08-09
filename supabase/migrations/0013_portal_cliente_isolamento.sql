-- Restringe o portal do cliente aos próprios equipamentos e somente a
-- orçamentos efetivamente enviados. A policy antiga de equipamento permitia
-- leitura e DELETE por qualquer usuário autenticado da mesma empresa.

drop policy if exists equipamento_all on equipamento;

create policy equipamento_select on equipamento for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

create policy equipamento_insert on equipamento for insert
  with check (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

create policy equipamento_update on equipamento for update
  using (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  )
  with check (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

create policy equipamento_delete on equipamento for delete
  using (
    same_empresa(empresa_id)
    and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

drop policy if exists orcamento_select on orcamento;

create policy orcamento_select on orcamento for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (
        auth_tipo_usuario() = 'cliente'
        and cliente_id = auth_cliente_id()
        and status not in ('rascunho', 'cancelado')
      )
    )
  );

notify pgrst, 'reload schema';
