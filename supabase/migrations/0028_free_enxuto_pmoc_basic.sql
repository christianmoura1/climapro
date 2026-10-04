-- Free mais enxuto e PMOC a partir do Basic.
--
-- O Free estava entregando 40 chamados, 20 clientes e PMOC de 1 cliente. Isso
-- dá para tocar uma operação pequena inteira de graça, e era exatamente o que
-- estava acontecendo: ninguém tinha motivo para subir para o Basic. O teto cai
-- para 10 chamados por mês e 10 clientes, o suficiente para ver o fluxo rodando
-- com os clientes reais da pessoa, e o PMOC passa a ser o que o Basic entrega.
--
-- Os limites ficam gravados na linha da empresa (é de lá que os gatilhos da
-- 0017 leem), então mudar só o código não muda nada para quem já está dentro.

update empresa set
  limite_chamados_mes = 10,
  limite_clientes = 10,
  limite_clientes_pmoc = 0,
  modulos_ativos = coalesce(modulos_ativos, '{}'::jsonb) || '{"pmoc": false}'::jsonb
where plano = 'free';

-- Basic é o único plano pago com PMOC limitado: um cliente. Garantido aqui
-- porque antes o módulo valia para todo mundo e ninguém gravava a flag.
update empresa set
  limite_clientes_pmoc = 1,
  modulos_ativos = coalesce(modulos_ativos, '{}'::jsonb) || '{"pmoc": true}'::jsonb
where plano = 'basic';

update empresa set
  modulos_ativos = coalesce(modulos_ativos, '{}'::jsonb) || '{"pmoc": true}'::jsonb
where plano not in ('free', 'basic');

-- Empresa nova nasce no Free, então o default da coluna tem que acompanhar.
-- `modulos_ativos` também tem default no banco, com "pmoc": true dentro — sem
-- mexer nele, toda conta criada daqui para a frente nasceria com o módulo
-- aberto e os updates acima seriam inúteis para quem chegar amanhã.
alter table empresa alter column limite_chamados_mes set default 10;
alter table empresa alter column limite_clientes set default 10;
alter table empresa alter column limite_clientes_pmoc set default 0;
alter table empresa alter column modulos_ativos set default '{
  "chamados": true, "clientes": true, "equipamentos": true, "tecnicos": true,
  "pmoc": false, "agenda": false, "orcamentos": false, "qr_equipamento": false,
  "estoque": false, "financeiro": false, "notas_fiscais": false,
  "multiempresa": false, "ponto_eletronico": false,
  "api": false, "white_label": false
}'::jsonb;

notify pgrst, 'reload schema';
