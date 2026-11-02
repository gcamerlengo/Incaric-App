-- IncaricApp: utenti, compiti, permessi, iscrizioni push e invio notifiche.
-- Da eseguire una volta nel SQL Editor di un progetto Supabase dedicato a IncaricApp.

-- Ruoli e utenti ------------------------------------------------------------

create type ruolo_compiti as enum ('direttore', 'collaboratore');

-- Solo queste email possono entrare. Il ruolo viene assegnato da qui.
create table utenti_autorizzati (
  email text primary key,
  nome  text not null,
  area  text not null,
  ruolo ruolo_compiti not null
);

insert into utenti_autorizzati (email, nome, area, ruolo) values
  ('antonio.pancione@oliodante.it',  'Antonio Pancione',   'Direzione stabilimento',     'direttore'),
  ('antonio.delgiacco@oliodante.it', 'Antonio Del Giacco', 'Programmazione Produzione', 'collaboratore'),
  ('raffaele.gentile@oliodante.it',  'Raffaele Gentile',   'Acquisti',                  'collaboratore');

create table utenti (
  id    uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome  text not null,
  ruolo ruolo_compiti not null
);

-- Al primo accesso: crea il profilo, oppure rifiuta le email non autorizzate.
create function public.gestisci_nuovo_utente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a utenti_autorizzati;
begin
  select * into a from utenti_autorizzati where lower(email) = lower(new.email);
  if not found then
    raise exception 'Email non autorizzata: %', new.email;
  end if;
  insert into utenti (id, email, nome, ruolo) values (new.id, lower(new.email), a.nome, a.ruolo);
  return new;
end $$;

create trigger su_nuovo_utente
  after insert on auth.users
  for each row execute function public.gestisci_nuovo_utente();

create function public.mia_email() returns text
language sql stable security definer set search_path = public as $$
  select email from utenti where id = auth.uid()
$$;

create function public.sono_direttore() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select ruolo = 'direttore' from utenti where id = auth.uid()), false)
$$;

-- Compiti -------------------------------------------------------------------

create type priorita_compito as enum ('alta', 'media', 'bassa');

create table compiti (
  id          uuid primary key default gen_random_uuid(),
  titolo      text not null check (length(trim(titolo)) between 1 and 300),
  nota        text not null default '' check (length(nota) <= 2000),
  assegnato_a text not null references utenti_autorizzati (email),
  giorno      date not null,
  priorita    priorita_compito not null default 'media',
  fatto       boolean not null default false,
  fatto_il    timestamptz,
  creato_il   timestamptz not null default now(),
  creato_da   uuid references utenti (id) default auth.uid()
);

create index compiti_giorno_idx on compiti (giorno);
create index compiti_assegnato_idx on compiti (assegnato_a, giorno);

-- Un collaboratore può cambiare solo "fatto"; la data di completamento la mette il database.
create function public.prepara_compito() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.sono_direttore() then
    if (to_jsonb(new) - 'fatto' - 'fatto_il') is distinct from (to_jsonb(old) - 'fatto' - 'fatto_il') then
      raise exception 'Puoi solo segnare il compito come fatto o da fare.';
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.creato_il := now();
    new.creato_da := auth.uid();
  end if;
  if new.fatto and (tg_op = 'INSERT' or not old.fatto) then new.fatto_il := now(); end if;
  if not new.fatto then new.fatto_il := null; end if;
  return new;
end $$;

create trigger prima_di_salvare_compito
  before insert or update on compiti
  for each row execute function public.prepara_compito();

-- Permessi (Row Level Security) ---------------------------------------------
-- Direttore: vede, crea, modifica ed elimina tutto.
-- Collaboratori: vedono solo i propri compiti e li segnano come fatti.

alter table utenti_autorizzati enable row level security;
alter table utenti enable row level security;
alter table compiti enable row level security;

create policy "utenti: lettura" on utenti
  for select to authenticated using (true);

create policy "compiti: lettura" on compiti
  for select to authenticated
  using (public.sono_direttore() or assegnato_a = public.mia_email());

create policy "compiti: creazione" on compiti
  for insert to authenticated with check (public.sono_direttore());

create policy "compiti: modifica" on compiti
  for update to authenticated
  using (public.sono_direttore() or assegnato_a = public.mia_email())
  with check (public.sono_direttore() or assegnato_a = public.mia_email());

create policy "compiti: eliminazione" on compiti
  for delete to authenticated using (public.sono_direttore());

-- Aggiornamenti in tempo reale sui telefoni di tutti.
alter publication supabase_realtime add table compiti;

-- Iscrizioni push: ogni telefono che ha attivato le notifiche --------------

create table push_iscrizioni (
  endpoint  text primary key,
  utente_id uuid not null default auth.uid() references utenti (id) on delete cascade,
  p256dh    text not null,
  auth      text not null,
  creato_il timestamptz not null default now()
);

alter table push_iscrizioni enable row level security;

create policy "push: le mie" on push_iscrizioni
  for all to authenticated
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

-- Configurazione privata (non visibile dall'app) ---------------------------

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists privato;
revoke all on schema privato from public, anon, authenticated;

create table privato.configurazione (
  chiave text primary key,
  valore text not null
);

-- Dopo la prima pubblicazione su Vercel, aggiorna l'indirizzo con:
--   update privato.configurazione set valore = 'https://<tuo-sito>.vercel.app/api/notifica' where chiave = 'url_notifiche';
insert into privato.configurazione (chiave, valore) values
  ('url_notifiche', 'https://incaricapp.vercel.app/api/notifica'),
  ('segreto_notifiche', encode(extensions.gen_random_bytes(24), 'hex'));

-- Invio notifiche -----------------------------------------------------------
-- Nuovo compito o riassegnazione: avvisa il collaboratore.
-- Compito segnato come fatto: avvisa il direttore.

create function public.notifica_compito() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  tipo        text;
  dest_email  text;
  url         text;
  segreto     text;
  destinatari jsonb;
begin
  if tg_op = 'INSERT' then
    tipo := 'nuovo'; dest_email := new.assegnato_a;
  elsif new.assegnato_a is distinct from old.assegnato_a then
    tipo := 'nuovo'; dest_email := new.assegnato_a;
  elsif new.fatto and not old.fatto then
    tipo := 'fatto';
    select email into dest_email from utenti_autorizzati where ruolo = 'direttore' limit 1;
  else
    return null;
  end if;

  select valore into url from privato.configurazione where chiave = 'url_notifiche';
  select valore into segreto from privato.configurazione where chiave = 'segreto_notifiche';
  if url is null or segreto is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nome', u.nome,
           'email', u.email,
           'iscrizioni', coalesce((
             select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'keys',
                      jsonb_build_object('p256dh', p.p256dh, 'auth', p.auth)))
             from push_iscrizioni p where p.utente_id = u.id), '[]'::jsonb))), '[]'::jsonb)
    into destinatari
  from utenti u
  where u.email = dest_email and u.id is distinct from auth.uid();

  if jsonb_array_length(destinatari) = 0 then return null; end if;

  perform net.http_post(
    url := url,
    body := jsonb_build_object(
      'tipo', tipo,
      'autore', (select nome from utenti where id = auth.uid()),
      'collaboratore', (select nome from utenti_autorizzati where email = new.assegnato_a),
      'compito', jsonb_build_object('id', new.id, 'titolo', new.titolo, 'nota', new.nota,
                                    'giorno', new.giorno, 'priorita', new.priorita),
      'destinatari', destinatari),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || segreto));
  return null;
end $$;

create trigger notifica_dopo_modifica
  after insert or update on compiti
  for each row execute function public.notifica_compito();

-- Il segreto da copiare su Vercel come WEBHOOK_SECRET:
select valore as "WEBHOOK_SECRET da copiare su Vercel"
from privato.configurazione where chiave = 'segreto_notifiche';
