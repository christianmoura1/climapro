-- Corrige uma regressão que eu mesmo introduzi na 0020.
--
-- A 0013_portal_cliente_isolamento já tinha fechado a leitura de equipamento
-- para o portal do cliente: cada cliente enxerga só os equipamentos dele. Ao
-- separar a policy por comando na 0020 (para o nível de acesso do técnico),
-- reescrevi o SELECT como `same_empresa(empresa_id)` puro e perdi essa parte.
--
-- Como usuário do tipo 'cliente' também tem empresa_id, o efeito prático é que
-- um cliente logado no portal passou a ler o parque de equipamentos de todos os
-- outros clientes da mesma empresa. Aqui a regra da 0013 volta, mantendo o que
-- a 0020 trouxe de novo na escrita.

drop policy if exists equipamento_select on equipamento;
create policy equipamento_select on equipamento for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

-- O USING do UPDATE também tinha ficado só com same_empresa. Não vazava (o
-- WITH CHECK barra a gravação), mas deixar os dois lados iguais evita
-- surpresa em UPDATE ... RETURNING e deixa a regra legível.
drop policy if exists equipamento_update on equipamento;
create policy equipamento_update on equipamento for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or is_tecnico_completo()))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or is_tecnico_completo()));

notify pgrst, 'reload schema';
