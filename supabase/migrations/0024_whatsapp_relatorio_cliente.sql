-- Relatório de conclusão do chamado pelo WhatsApp, para o cliente.
--
-- A fila `whatsapp_mensagem` nasceu para avisar a EMPRESA: o
-- `whatsapp_enfileirar` lê `empresa.whatsapp_destino` e ignora qualquer
-- destino que você passe. Aqui o destino é outro — é o celular do cliente — e
-- quem decide enviar é o operador, clicando em aprovar.
--
-- Por isso esta função não olha `whatsapp_ativo` nem `whatsapp_eventos`:
-- aquelas chaves governam o que a empresa RECEBE, e mandar relatório para o
-- cliente é o contrário disso. O que vale aqui é o clique.

alter table whatsapp_mensagem drop constraint if exists whatsapp_mensagem_evento_check;
alter table whatsapp_mensagem add constraint whatsapp_mensagem_evento_check
  check (evento in (
    'chamado_aberto', 'orcamento_respondido', 'alerta', 'teste', 'relatorio_cliente'
  ));

-- Texto do relatório. Montado no banco, igual aos outros, para a Edge Function
-- continuar burra e o formato viver num lugar só.
create or replace function whatsapp_texto_relatorio(p_chamado_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select
    '✅ *Serviço concluído*' || E'\n\n'
    || 'Olá, ' || coalesce(cl.nome, 'tudo bem') || '! O atendimento abaixo foi finalizado.' || E'\n\n'
    || '*' || c.titulo || '*' || E'\n'
    || 'Chamado: #' || coalesce(c.numero_chamado, left(c.id::text, 8)) || E'\n'
    || case when t.nome is not null then 'Técnico: ' || t.nome || E'\n' else '' end
    || case when c.data_finalizacao is not null
            then 'Concluído em: ' || to_char(c.data_finalizacao at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') || E'\n'
            else '' end
    || case when c.nome_cliente_confirmacao is not null and c.nome_cliente_confirmacao <> ''
            then 'Acompanhado por: ' || c.nome_cliente_confirmacao || E'\n' else '' end
    || case when coalesce(array_length(c.fotos_finalizacao, 1), 0) > 0
            then '📸 ' || array_length(c.fotos_finalizacao, 1) || ' foto(s) do serviço' || E'\n' else '' end
    || case when c.observacoes_tecnico is not null and c.observacoes_tecnico <> ''
            then E'\n*O que foi feito*' || E'\n' || left(c.observacoes_tecnico, 700) || E'\n' else '' end
    || case when c.observacoes_empresa is not null and c.observacoes_empresa <> ''
            then E'\n' || left(c.observacoes_empresa, 500) || E'\n' else '' end
    || case when c.data_lembrete_proxima_manutencao is not null
            then E'\n📅 Próxima manutenção prevista para '
                 || to_char(c.data_lembrete_proxima_manutencao, 'DD/MM/YYYY') || E'\n'
            else '' end
    || E'\n' || coalesce(e.nome, 'ClimaPro')
    || case when e.telefone is not null then E'\n' || e.telefone else '' end
  from chamado c
  left join cliente cl on cl.id = c.cliente_id
  left join tecnico t on t.id = c.tecnico_id
  left join empresa e on e.id = c.empresa_id
  where c.id = p_chamado_id;
$$;

-- Chamada pela tela de aprovação. Enfileira o relatório para o número
-- informado e devolve o id da mensagem.
create or replace function whatsapp_enviar_relatorio(p_chamado_id uuid, p_destino text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_destino text;
  v_texto text;
  v_id uuid;
begin
  select empresa_id into v_empresa_id from chamado where id = p_chamado_id;
  if v_empresa_id is null then
    raise exception 'Chamado não encontrado';
  end if;

  -- Mesma checagem das outras ações de empresa: tem que ser admin da empresa
  -- dona do chamado. Sem isso, qualquer usuário autenticado mandaria mensagem
  -- para qualquer número, de graça, pelo número do ClimaPro.
  if not (same_empresa(v_empresa_id) and is_admin_empresa()) then
    raise exception 'Sem permissão para enviar o relatório deste chamado';
  end if;

  v_destino := normalizar_whatsapp(p_destino);
  if v_destino is null then
    raise exception 'Informe um número de WhatsApp válido, com DDD';
  end if;

  v_texto := whatsapp_texto_relatorio(p_chamado_id);
  if v_texto is null or btrim(v_texto) = '' then
    raise exception 'Não consegui montar o texto do relatório';
  end if;

  -- A chave carrega o destino: reenviar para o mesmo número não duplica, mas
  -- corrigir o número e reenviar funciona, que é o caso real de quem digitou
  -- errado na primeira vez.
  insert into whatsapp_mensagem (empresa_id, evento, chave, destino, texto)
  values (v_empresa_id, 'relatorio_cliente', p_chamado_id::text || ':' || v_destino, v_destino, v_texto)
  on conflict (empresa_id, evento, chave) do nothing
  returning id into v_id;

  if v_id is null then
    -- já existia: devolve o id da anterior em vez de fingir que criou
    select id into v_id from whatsapp_mensagem
     where empresa_id = v_empresa_id and evento = 'relatorio_cliente'
       and chave = p_chamado_id::text || ':' || v_destino;
  else
    perform whatsapp_cutucar();
  end if;

  return v_id;
end;
$$;

grant execute on function whatsapp_enviar_relatorio(uuid, text) to authenticated;

notify pgrst, 'reload schema';
