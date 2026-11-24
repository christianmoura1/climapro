-- Gravação da migração de arquivos sem mexer em updated_at.
--
-- O script scripts/migrar-storage-r2.mjs troca o link do Storage do Supabase
-- pelo link do R2. Um UPDATE comum dispara set_updated_at() e o chamado
-- antigo passa a parecer editado agora — a lista em si ordena por criação,
-- mas o rascunho do PMOC mostra essa data para o técnico.
--
-- A chave climapro.pular_updated_at só existe dentro da transação da função
-- abaixo. Salvamento normal do app continua atualizando a data.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if current_setting('climapro.pular_updated_at', true) = 'on' then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- Só estas tabelas e colunas. security definer porque o script usa a
-- service role e a função precisa escrever sem esbarrar em RLS; anon e
-- authenticated não executam.
create or replace function climapro_gravar_arquivo(
  p_tabela text,
  p_id uuid,
  p_coluna text,
  p_valor jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  colunas text[];
  n integer;
begin
  if p_id is null then
    raise exception 'id obrigatório';
  end if;

  colunas := case p_tabela
    when 'empresa' then array['logo_url']
    when 'equipamento' then array['foto_url', 'fotos_urls']
    when 'chamado' then array['fotos_anexos', 'fotos_finalizacao', 'videos_finalizacao', 'assinatura_cliente']
    when 'manutencao_pmoc' then array['fotos_por_equipamento', 'assinatura_tecnico', 'assinatura_cliente', 'pdf_url']
    when 'gasto_tecnico' then array['comprovante_url']
    when 'lancamento_tecnico' then array['comprovante_url']
    when 'movimentacao_tecnico' then array['comprovante_url']
    when 'nota_fiscal' then array['arquivo_pdf_url', 'arquivo_xml_url']
    when 'ponto_eletronico' then array['foto_comprovante']
    when 'cliente' then array['documentos']
    when 'orcamento' then array['assinatura_cliente']
    when 'whatsapp_mensagem' then array['texto']
    else null
  end;

  if colunas is null then
    raise exception 'tabela não permitida: %', p_tabela;
  end if;
  if not (p_coluna = any(colunas)) then
    raise exception 'coluna não permitida: %.%', p_tabela, p_coluna;
  end if;

  perform set_config('climapro.pular_updated_at', 'on', true);

  if p_coluna = any(array['fotos_anexos', 'fotos_finalizacao', 'videos_finalizacao', 'fotos_urls']) then
    if jsonb_typeof(p_valor) = 'null' then
      execute format('update %I set %I = array[]::text[] where id = $1', p_tabela, p_coluna)
        using p_id;
    elsif jsonb_typeof(p_valor) = 'array' then
      execute format(
        'update %I set %I = (select coalesce(array_agg(elem order by ord), array[]::text[]) from jsonb_array_elements_text($1) with ordinality as t(elem, ord)) where id = $2',
        p_tabela, p_coluna
      ) using p_valor, p_id;
    else
      raise exception 'coluna % espera uma lista', p_coluna;
    end if;
  elsif p_coluna = any(array['documentos', 'fotos_por_equipamento']) then
    execute format('update %I set %I = $1 where id = $2', p_tabela, p_coluna)
      using p_valor, p_id;
  else
    if p_valor is null or jsonb_typeof(p_valor) = 'null' then
      execute format('update %I set %I = null where id = $1', p_tabela, p_coluna)
        using p_id;
    elsif jsonb_typeof(p_valor) = 'string' then
      execute format('update %I set %I = $1 where id = $2', p_tabela, p_coluna)
        using (p_valor #>> '{}'), p_id;
    else
      raise exception 'coluna % espera texto', p_coluna;
    end if;
  end if;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'não achei o registro % em %', p_id, p_tabela;
  end if;
end;
$$;

revoke all on function public.climapro_gravar_arquivo(text, uuid, text, jsonb) from public;
revoke all on function public.climapro_gravar_arquivo(text, uuid, text, jsonb) from anon, authenticated;
grant execute on function public.climapro_gravar_arquivo(text, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
