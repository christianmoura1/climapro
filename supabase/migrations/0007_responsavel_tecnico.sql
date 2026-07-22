-- 0007 — Responsável técnico habilitado da empresa (nome + registro CREA/CFT),
-- exigido pela Portaria GM 3.523/98 na identificação do PMOC. Sai impresso no
-- cabeçalho do Plano Anual e do Caderno de Manutenção.
alter table empresa add column if not exists responsavel_tecnico_nome text;
alter table empresa add column if not exists responsavel_tecnico_registro text;
