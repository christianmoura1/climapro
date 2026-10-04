-- Basic passa a incluir PMOC de 2 clientes, não de 1.
--
-- Um cliente só era pouco para o caso que o plano atende: quem tem PMOC já
-- costuma ter pelo menos dois contratos. O pulo para o Profissional continua
-- sendo o PMOC ilimitado, que é onde mora a empresa que vive disso.
--
-- O limite é lido da linha da empresa, então mudar só o código não muda nada
-- para quem já assina.

update empresa set limite_clientes_pmoc = 2
where plano = 'basic' and limite_clientes_pmoc < 2;

notify pgrst, 'reload schema';
