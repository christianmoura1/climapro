-- O admin via alerta de cliente mas não conseguia resolver.
--
-- A `alerta_select` deixa o admin da empresa ver os alertas de destinatário
-- 'cliente' (útil para dar suporte: "não recebi aviso nenhum"). A
-- `alerta_update` não tinha esse ramo, então o update afetava zero linhas, o
-- PostgREST tentava devolver a linha alterada e respondia 406. Na tela: clicar
-- no visto dava erro e o alerta não saía da lista.
--
-- A tela já foi corrigida para listar só o que é da empresa, mas a assimetria
-- entre ver e alterar continuaria sendo uma armadilha para a próxima tela que
-- mostrasse esses alertas. Aqui as duas policies passam a bater.

drop policy if exists alerta_update on alerta;
create policy alerta_update on alerta for update
  using (
    same_empresa(empresa_id) and (
      (destinatario = 'empresa' and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
      or (destinatario = 'cliente' and auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
      or (destinatario = 'cliente' and is_admin_empresa())
    )
  )
  with check (
    same_empresa(empresa_id) and (
      (destinatario = 'empresa' and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
      or (destinatario = 'cliente' and auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
      or (destinatario = 'cliente' and is_admin_empresa())
    )
  );

notify pgrst, 'reload schema';
