-- O técnico não conseguia mexer no cabeçalho do PMOC.
--
-- As policies de `pmoc` amarravam o técnico ao campo tecnico_responsavel_id, e
-- nenhuma tela do sistema preenchia esse campo. Na prática:
--
-- - o painel do técnico filtrava por ele e vinha sempre vazio ("0 PMOC(s)
--   encontrado(s)", mesmo com equipamento no plano);
-- - a rodada criada pela empresa nascia sem responsável, então ficava invisível
--   para o técnico — que, ao executar, criaria um segundo cabeçalho para o mesmo
--   cliente;
-- - executar a rodada logado como técnico batia em violação de RLS, tanto no
--   insert quanto no update de status.
--
-- Técnico é equipe de campo da empresa: enxerga e toca as rodadas da própria
-- empresa, como já acontece em `cliente` e `equipamento`. Excluir continua
-- sendo só do administrador.

drop policy if exists pmoc_select on pmoc;
create policy pmoc_select on pmoc for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

drop policy if exists pmoc_write on pmoc;
create policy pmoc_write on pmoc for insert
  with check (
    same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico')
  );

drop policy if exists pmoc_update on pmoc;
create policy pmoc_update on pmoc for update
  using (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
  with check (same_empresa(empresa_id) and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'));

notify pgrst, 'reload schema';
