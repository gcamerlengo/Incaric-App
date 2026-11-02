-- Accesso con email e password, senza invio di email.
-- Al primo accesso ognuno sceglie la propria password; l'account viene creato già confermato.
-- Solo le email in utenti_autorizzati possono crearlo, e una sola volta.
-- Password dimenticata: dal SQL Editor
--   update auth.users set encrypted_password = extensions.crypt('<nuova>', extensions.gen_salt('bf')) where email = '<email>';

-- 'nuovo' = autorizzato ma senza password, 'attivo' = ha già la password, 'no' = non abilitato.
create function public.stato_accesso(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from public.utenti_autorizzati where email = lower(trim(p_email))) then 'no'
    when exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then 'attivo'
    else 'nuovo'
  end
$$;

create function public.crea_accesso(p_email text, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e   text := lower(trim(p_email));
  uid uuid := gen_random_uuid();
begin
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'La password deve avere almeno 8 caratteri.';
  end if;
  if not exists (select 1 from public.utenti_autorizzati where email = e) then
    raise exception 'Questa mail non è abilitata all''app.';
  end if;
  if exists (select 1 from auth.users where lower(email) = e) then
    raise exception 'Questa mail ha già una password.';
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', e,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(),
          '', '', '', '', '', '', '', '');

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', e, 'email_verified', true),
          'email', now(), now(), now());
end $$;

revoke execute on function public.stato_accesso(text) from public;
revoke execute on function public.crea_accesso(text, text) from public;
grant execute on function public.stato_accesso(text) to anon, authenticated;
grant execute on function public.crea_accesso(text, text) to anon, authenticated;
