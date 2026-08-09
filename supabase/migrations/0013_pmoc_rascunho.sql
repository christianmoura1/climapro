-- Rascunho de execução do PMOC.
--
-- Uma rodada com 6 equipamentos raramente fecha numa visita só. Sem onde
-- guardar o andamento, o técnico que não terminasse no mesmo dia perdia todo
-- o checklist e as fotos e recomeçava do zero.
--
-- O status 'em_andamento' já existia no enum de manutencao_pmoc e nunca tinha
-- sido usado; passa a ser o rascunho. Não é preciso criar nada para isso.

-- As observações por equipamento eram jogadas concatenadas em
-- observacoes_tecnico ("modelo: texto\n\nmodelo: texto"), formato do qual não
-- dá para voltar. Guardando a estrutura, o rascunho reabre com cada observação
-- no seu equipamento — e o caderno de manutenção passa a poder exibi-las
-- separadas, em vez de um bloco só.
alter table manutencao_pmoc
  add column if not exists observacoes_por_equipamento jsonb not null default '{}'::jsonb;

-- A policy de insert só aceitava admin_empresa, enquanto a de update já
-- aceitava o técnico dono da manutenção. Ou seja: o técnico podia alterar um
-- registro que nunca conseguiria criar — quem executasse a rodada logado como
-- técnico batia em "new row violates row-level security policy" ao gravar.
-- Agora o insert espelha o update: o técnico grava, desde que o registro seja
-- dele e da mesma empresa.
drop policy if exists manutpmoc_insert on manutencao_pmoc;
create policy manutpmoc_insert on manutencao_pmoc for insert
  with check (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or (auth_tipo_usuario() = 'tecnico' and tecnico_id = auth_tecnico_id())
    )
  );

notify pgrst, 'reload schema';
