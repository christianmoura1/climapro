-- Link do relatório em PDF na mensagem do WhatsApp.
--
-- A 0024 mandava só o resumo em texto. O cliente quer o relatório completo,
-- com fotos e assinatura, e é isso que o hotel arquiva para mostrar à
-- fiscalização.
--
-- O PDF é gerado no navegador (src/lib/relatorioPdf.js), sobe para o bucket
-- `attachments` e chega aqui como URL. O banco não gera PDF: fazer isso numa
-- Edge Function em Deno exigiria biblioteca nova e perderia o layout que o
-- navegador já sabe montar.
--
-- Por que link e não arquivo anexado: o endpoint de mídia do uazapi ainda não
-- foi confirmado. Link funciona hoje, é clicável no WhatsApp e abre o PDF no
-- celular. Mandar como documento anexado é um passo pequeno depois, trocando
-- só a Edge Function.

-- A versão de 2 argumentos sai de cena. Deixar as duas faria o PostgREST ver
-- duas funções e a chamada com 2 argumentos virar ambígua.
drop function if exists whatsapp_enviar_relatorio(uuid, text);

create or replace function whatsapp_enviar_relatorio(
  p_chamado_id uuid,
  p_destino text,
  p_url_relatorio text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_destino text;
  v_texto text;
  v_id uuid;
  v_chave text;
begin
  select empresa_id into v_empresa_id from chamado where id = p_chamado_id;
  if v_empresa_id is null then
    raise exception 'Chamado não encontrado';
  end if;

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

  -- O link entra antes da assinatura da empresa, que é a última parte do
  -- texto montado pela whatsapp_texto_relatorio.
  if p_url_relatorio is not null and btrim(p_url_relatorio) <> '' then
    v_texto := v_texto || E'\n\n📄 Relatório completo em PDF:' || E'\n' || btrim(p_url_relatorio);
  end if;

  v_chave := p_chamado_id::text || ':' || v_destino;

  insert into whatsapp_mensagem (empresa_id, evento, chave, destino, texto)
  values (v_empresa_id, 'relatorio_cliente', v_chave, v_destino, v_texto)
  on conflict (empresa_id, evento, chave) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from whatsapp_mensagem
     where empresa_id = v_empresa_id and evento = 'relatorio_cliente' and chave = v_chave;
  else
    perform whatsapp_cutucar();
  end if;

  return v_id;
end;
$$;

grant execute on function whatsapp_enviar_relatorio(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
