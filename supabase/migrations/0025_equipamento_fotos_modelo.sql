-- Até quatro fotos por equipamento, e modelo deixa de ser obrigatório.
--
-- Modelo: em campo, muitas vezes a plaqueta está ilegível ou o aparelho é
-- antigo demais para ter modelo identificável. Exigir isso trava o cadastro
-- justamente na hora do levantamento, que é quando a velocidade importa.
-- Marca continua obrigatória.
--
-- Fotos: `foto_url` continua existindo e continua sendo a foto principal.
-- Ela é lida em sete telas e também pela Edge Function `equipamento-publico`,
-- que já está publicada. Trocar tudo de uma vez para o array era risco à toa,
-- então o array passa a ser a fonte de verdade do formulário e um gatilho
-- mantém `foto_url` igual à primeira foto.

alter table equipamento alter column modelo drop not null;

alter table equipamento add column if not exists fotos_urls text[] not null default '{}';

alter table equipamento drop constraint if exists equipamento_fotos_limite;
alter table equipamento add constraint equipamento_fotos_limite
  check (coalesce(array_length(fotos_urls, 1), 0) <= 4);

-- Equipamento que já tinha foto entra no array sem perder nada.
update equipamento
   set fotos_urls = array[foto_url]
 where coalesce(array_length(fotos_urls, 1), 0) = 0
   and foto_url is not null
   and btrim(foto_url) <> '';

-- Mantém os dois lados coerentes, venha a escrita de onde vier.
create or replace function sincronizar_foto_equipamento() returns trigger
language plpgsql as $$
begin
  if coalesce(array_length(NEW.fotos_urls, 1), 0) > 0 then
    -- formulário novo: a primeira do array é a principal
    NEW.foto_url := NEW.fotos_urls[1];
  elsif NEW.foto_url is not null and btrim(NEW.foto_url) <> '' then
    -- escrita antiga (importação, integração): semeia o array a partir dela
    NEW.fotos_urls := array[NEW.foto_url];
  else
    NEW.foto_url := null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_equipamento_foto on equipamento;
create trigger trg_equipamento_foto before insert or update on equipamento
  for each row execute function sincronizar_foto_equipamento();

notify pgrst, 'reload schema';
