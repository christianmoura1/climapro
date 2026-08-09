-- Execução de PMOC visível para a equipe da empresa.
--
-- `manutpmoc_select` amarrava o técnico ao próprio tecnico_id. Como a situação
-- da rodada agora sai do registro da execução (e não do cabeçalho `pmoc`, que
-- volta para 'aguardando_execucao' assim que a empresa aprova), o técnico que
-- não executou aquela visita veria "Aguardando Execução" numa rodada já
-- entregue pelo colega — e executaria de novo, duplicando o registro.
--
-- Mesmo raciocínio já aplicado em `pmoc` na 0015: técnico é equipe de campo da
-- empresa. O cliente continua vendo só o que é dele.
--
-- Escrever não muda: a de update segue exigindo ser o técnico dono do registro
-- (ou admin), e a de insert idem.

drop policy if exists manutpmoc_select on manutencao_pmoc;
create policy manutpmoc_select on manutencao_pmoc for select
  using (
    same_empresa(empresa_id) and (
      is_admin_empresa()
      or auth_tipo_usuario() = 'tecnico'
      or (auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

notify pgrst, 'reload schema';
