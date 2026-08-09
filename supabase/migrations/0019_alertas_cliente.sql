-- Alertas também para o cliente, com destinatário separado.
--
-- Os cinco alertas da 0018 são de operação: "PMOC atrasado", "cliente sem
-- movimento". Mostrar isso para o cliente final seria constrangedor e, no caso
-- do último, ofensivo. Então o alerta passa a ter dono: o que é da empresa
-- continua da empresa, e o cliente ganha três avisos escritos para ele.

alter table alerta
  add column if not exists destinatario text not null default 'empresa'
  check (destinatario in ('empresa', 'cliente'));

alter table alerta drop constraint if exists alerta_tipo_check;
alter table alerta add constraint alerta_tipo_check check (tipo in (
  -- da empresa
  'pmoc_atrasado', 'pmoc_proximo', 'equipamento_recorrente',
  'orcamento_parado', 'cliente_sumido',
  -- do cliente
  'visita_agendada', 'orcamento_aguardando_voce', 'relatorio_disponivel'
));

-- O cliente enxerga só o que é dele e endereçado a ele. Técnico e admin
-- continuam vendo o que é da empresa.
drop policy if exists alerta_select on alerta;
create policy alerta_select on alerta for select
  using (
    same_empresa(empresa_id) and (
      (destinatario = 'empresa' and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
      or (destinatario = 'cliente' and auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
      or (destinatario = 'cliente' and is_admin_empresa())
    )
  );

-- Marcar como lido/dispensado: cada um no que é seu.
drop policy if exists alerta_update on alerta;
create policy alerta_update on alerta for update
  using (
    same_empresa(empresa_id) and (
      (destinatario = 'empresa' and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
      or (destinatario = 'cliente' and auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  )
  with check (
    same_empresa(empresa_id) and (
      (destinatario = 'empresa' and (is_admin_empresa() or auth_tipo_usuario() = 'tecnico'))
      or (destinatario = 'cliente' and auth_tipo_usuario() = 'cliente' and cliente_id = auth_cliente_id())
    )
  );

create index if not exists idx_alerta_destinatario on alerta(empresa_id, destinatario, status);

-- Os avisos do cliente entram como um bloco novo no fim da rotina. Os cinco
-- antigos não mudam: 'empresa' é o default da coluna.
create or replace function gerar_alertas_cliente() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  criados integer := 0;
  inseridos integer;
  hoje date := current_date;
  mes date := date_trunc('month', current_date)::date;
begin
  -- 1. Visita marcada, para o cliente se organizar e liberar o acesso.
  --    Sete dias de antecedência: o cliente precisa de mais aviso que a
  --    empresa, que só quer saber da rota.
  with proximas as (
    select e.empresa_id, e.cliente_id, data_visita_pmoc(e.cliente_id, mes) as data_visita,
           count(*) as qtd
      from equipamento e
     where e.pmoc_ativo
     group by e.empresa_id, e.cliente_id
  )
  insert into alerta (empresa_id, destinatario, tipo, chave, severidade, titulo, descricao, cliente_id, dados)
  select p.empresa_id,
         'cliente',
         'visita_agendada',
         p.cliente_id::text || ':' || to_char(p.data_visita, 'YYYY-MM-DD'),
         'media',
         'Manutenção preventiva em ' || to_char(p.data_visita, 'DD/MM'),
         'Nossa equipe vai atender ' || p.qtd || ' equipamento(s) no dia '
           || to_char(p.data_visita, 'DD/MM/YYYY') || '. Deixe o acesso liberado.',
         p.cliente_id,
         jsonb_build_object('data_visita', p.data_visita, 'equipamentos', p.qtd)
    from proximas p
   where p.data_visita between hoje and hoje + 7
     and not exists (
       select 1 from manutencao_pmoc m
        where m.cliente_id = p.cliente_id
          and m.status <> 'cancelada'
          and date_trunc('month', coalesce(m.data_execucao, m.created_at)) = date_trunc('month', mes)
     )
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- 2. Orçamento esperando a resposta dele. Aqui não tem cobrança de prazo:
  --    é aviso de que a bola está com ele.
  insert into alerta (empresa_id, destinatario, tipo, chave, severidade, titulo, descricao, cliente_id, orcamento_id, dados)
  select o.empresa_id,
         'cliente',
         'orcamento_aguardando_voce',
         o.id::text,
         'media',
         'Orçamento aguardando sua aprovação',
         coalesce(o.titulo, 'Orçamento') || ' no valor de R$ '
           || formatar_reais(o.valor_total - o.desconto) || '. Você pode aprovar ou recusar pelo portal.',
         o.cliente_id,
         o.id,
         jsonb_build_object('valor', o.valor_total - o.desconto)
    from orcamento o
   where o.status = 'enviado'
     and o.data_envio is not null
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- 3. Relatório de manutenção liberado. Só depois de concluída: rodada em
  --    aprovação interna ainda não é do cliente.
  insert into alerta (empresa_id, destinatario, tipo, chave, severidade, titulo, descricao, cliente_id, dados)
  select m.empresa_id,
         'cliente',
         'relatorio_disponivel',
         m.id::text,
         'baixa',
         'Relatório de manutenção disponível',
         'A manutenção de ' || to_char(m.data_execucao, 'DD/MM/YYYY')
           || ' foi concluída. O relatório com checklist e fotos já está no seu portal.',
         m.cliente_id,
         jsonb_build_object('manutencao_id', m.id, 'data_execucao', m.data_execucao)
    from manutencao_pmoc m
   where m.status = 'concluida'
     and m.data_execucao is not null
     and m.data_execucao >= now() - interval '30 days'
  on conflict (empresa_id, tipo, chave) do nothing;
  get diagnostics inseridos = row_count;
  criados := criados + inseridos;

  -- Fecha o que deixou de valer.
  update alerta a set status = 'resolvido', resolvido_em = now()
   where a.destinatario = 'cliente'
     and a.status in ('novo', 'lido')
     and (
       (a.tipo = 'orcamento_aguardando_voce' and exists (
          select 1 from orcamento o where o.id = a.orcamento_id and o.status <> 'enviado'
        ))
       or (a.tipo = 'visita_agendada' and exists (
            select 1 from manutencao_pmoc m
             where m.cliente_id = a.cliente_id
               and m.status <> 'cancelada'
               and date_trunc('month', coalesce(m.data_execucao, m.created_at)) = date_trunc('month', mes)
          ))
     );

  return criados;
end;
$$;

-- Uma rotina só para o cron chamar, para não precisar mexer no job já criado.
create or replace function gerar_todos_alertas() returns integer
language sql
security definer
set search_path = public
as $$
  select gerar_alertas() + gerar_alertas_cliente();
$$;

select cron.unschedule('gerar-alertas-diario')
 where exists (select 1 from cron.job where jobname = 'gerar-alertas-diario');

select cron.schedule('gerar-alertas-diario', '10 10 * * *', $$ select gerar_todos_alertas(); $$);

select gerar_todos_alertas();

notify pgrst, 'reload schema';
