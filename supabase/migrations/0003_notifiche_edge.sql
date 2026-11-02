-- Le notifiche push partono dalla Edge Function "notifica" (supabase/functions/notifica).
-- Le chiavi VAPID stanno solo nel database: la privata NON va messa nel repository.
-- Per un nuovo progetto, generale con `npx web-push generate-vapid-keys` e inseriscile così:
--   insert into privato.configurazione (chiave, valore) values
--     ('vapid_pubblica', '<pubblica>'), ('vapid_privata', '<privata>'),
--     ('vapid_contatto', 'mailto:agenda@oliodante.it')
--   on conflict (chiave) do update set valore = excluded.valore;
-- La chiave pubblica va anche in VITE_VAPID_PUBLIC_KEY (.env.production).

update privato.configurazione
   set valore = 'https://vbkbzxpxckfpzkrqdcho.supabase.co/functions/v1/notifica'
 where chiave = 'url_notifiche';

-- Letta dalla Edge Function con la chiave di servizio.
create or replace function public.configurazione_notifiche() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(chiave, valore), '{}'::jsonb)
  from privato.configurazione
  where chiave in ('segreto_notifiche', 'vapid_pubblica', 'vapid_privata', 'vapid_contatto')
$$;

revoke execute on function public.configurazione_notifiche() from public, anon, authenticated;
grant execute on function public.configurazione_notifiche() to service_role;
