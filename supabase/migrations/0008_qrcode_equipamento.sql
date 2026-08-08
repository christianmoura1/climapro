-- 0008 — QR Code por equipamento: página pública (sem login) pra abrir chamado
-- ou consultar o histórico completo de manutenção daquele equipamento
-- específico. Nenhuma policy de RLS nova é necessária — o acesso público é
-- mediado por Edge Functions com service_role, nunca por RLS anônima direta
-- nas tabelas principais.

-- Código de acesso por cliente pro histórico completo via QR (hash via
-- pgcrypto, nunca texto puro — a extensão já está habilitada em 0001_init).
-- Cada cliente tem o seu: vazamento do código de um cliente não expõe o
-- histórico dos demais clientes da mesma empresa.
alter table cliente add column if not exists senha_acesso_publico_hash text;

create or replace function hash_senha_acesso_publico() returns trigger
language plpgsql as $$
begin
  if new.senha_acesso_publico_hash is not null
     and (tg_op = 'INSERT' or new.senha_acesso_publico_hash is distinct from old.senha_acesso_publico_hash) then
    new.senha_acesso_publico_hash := crypt(new.senha_acesso_publico_hash, gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cliente_hash_senha on cliente;
create trigger trg_cliente_hash_senha before insert or update on cliente
  for each row execute function hash_senha_acesso_publico();

-- Rastreia chamados abertos via QR code (sem login), pra empresa saber a
-- origem e quem reportou (não há conta/sessão de quem escaneia).
alter table chamado add column if not exists origem text not null default 'manual'
  check (origem in ('manual','qr_code'));
alter table chamado add column if not exists solicitante_nome text;
alter table chamado add column if not exists solicitante_contato text;
