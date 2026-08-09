-- Estrutura de planos: Free, Profissional (R$ 79,90) e Empresa (R$ 197).
--
-- Três problemas que esta migration prepara o terreno para resolver:
--
-- 1. modulos_ativos nunca era atualizado pelo plano. Quem pagava não recebia
--    módulo nenhum, e quem estava no Free recebia PMOC e ponto eletrônico de
--    graça. Quem aplica passa a ser o webhook do Stripe.
-- 2. Orçamento e estoque não tinham flag própria — estavam pendurados em
--    'chamados' e 'equipamentos', que são true por padrão.
-- 3. Não havia como limitar o PMOC do Free a um cliente.

-- 'empresa' é o plano novo. Os antigos ficam na lista porque pode haver
-- empresa gravada com eles; o mapeamento em _shared/stripe.ts cuida disso.
alter table empresa drop constraint if exists empresa_plano_check;
alter table empresa add constraint empresa_plano_check
  check (plano in ('free','essencial','profissional','corporativo','empresa','enterprise'));

-- Free monta o PMOC de um cliente só: ele executa, imprime o caderno de
-- manutenção e vê o documento pronto. O segundo contrato exige plano pago.
alter table empresa add column if not exists limite_clientes_pmoc integer not null default 1;

-- Flags novas para os módulos construídos depois do desenho original.
alter table empresa alter column modulos_ativos set default '{
  "chamados": true, "clientes": true, "equipamentos": true, "tecnicos": true,
  "pmoc": true, "agenda": false, "ponto_eletronico": false,
  "orcamentos": false, "estoque": false, "qr_equipamento": false,
  "financeiro": false, "notas_fiscais": false, "multiempresa": false,
  "api": false, "white_label": false
}'::jsonb;

-- Acrescenta as chaves que faltam sem sobrescrever o que já estiver definido:
-- em `a || b`, b vence nos conflitos, então o valor atual da empresa prevalece.
update empresa set modulos_ativos =
  '{"orcamentos": false, "estoque": false, "qr_equipamento": false}'::jsonb || modulos_ativos
where not (modulos_ativos ? 'orcamentos')
   or not (modulos_ativos ? 'estoque')
   or not (modulos_ativos ? 'qr_equipamento');

-- Alinha as empresas existentes ao plano que elas têm hoje. Sem isso, quem
-- está no Free continuaria com agenda e ponto abertos, e quem paga continuaria
-- sem nada — que é exatamente o estado que esta mudança corrige.
update empresa set modulos_ativos = modulos_ativos || '{
  "pmoc": true, "agenda": false, "ponto_eletronico": false,
  "orcamentos": false, "estoque": false, "qr_equipamento": false,
  "financeiro": false, "notas_fiscais": false, "multiempresa": false
}'::jsonb,
  limite_tecnicos = 1,
  limite_clientes_pmoc = 1
where plano = 'free';

update empresa set modulos_ativos = modulos_ativos || '{
  "pmoc": true, "agenda": true, "ponto_eletronico": false,
  "orcamentos": true, "estoque": false, "qr_equipamento": true,
  "financeiro": false, "notas_fiscais": false, "multiempresa": false
}'::jsonb,
  limite_tecnicos = greatest(limite_tecnicos, 3),
  limite_clientes_pmoc = 999999
where plano in ('essencial','profissional');

update empresa set modulos_ativos = modulos_ativos || '{
  "pmoc": true, "agenda": true, "ponto_eletronico": true,
  "orcamentos": true, "estoque": true, "qr_equipamento": true,
  "financeiro": true, "notas_fiscais": true, "multiempresa": true
}'::jsonb,
  limite_tecnicos = greatest(limite_tecnicos, 10),
  limite_clientes_pmoc = 999999
where plano in ('corporativo','empresa','enterprise');

notify pgrst, 'reload schema';
