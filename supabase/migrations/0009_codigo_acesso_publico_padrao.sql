-- Código de acesso público padrão: em vez de deixar o histórico do QR Code
-- travado até alguém lembrar de cadastrar um código, todo cliente já nasce
-- com o código padrão "123" (a empresa pode trocar por um código próprio a
-- qualquer momento em Clientes → editar).

create or replace function hash_senha_acesso_publico() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.senha_acesso_publico_hash is null then
    new.senha_acesso_publico_hash := crypt('123', gen_salt('bf'));
  elsif new.senha_acesso_publico_hash is not null
     and (tg_op = 'INSERT' or new.senha_acesso_publico_hash is distinct from old.senha_acesso_publico_hash) then
    new.senha_acesso_publico_hash := crypt(new.senha_acesso_publico_hash, gen_salt('bf'));
  end if;
  return new;
end;
$$;

-- Backfill: clientes que já existiam antes desta mudança e nunca tiveram
-- código cadastrado também recebem o padrão "123".
update cliente set senha_acesso_publico_hash = crypt('123', gen_salt('bf'))
  where senha_acesso_publico_hash is null;

notify pgrst, 'reload schema';
