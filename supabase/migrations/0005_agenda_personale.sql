-- Agenda personale: ognuno annota le proprie attività. È privata: la vede solo chi la scrive,
-- anche il Direttore non vede l'agenda dei collaboratori (e viceversa).

create table public.agenda (
  id        uuid primary key default gen_random_uuid(),
  utente_id uuid not null default auth.uid() references public.utenti (id) on delete cascade,
  giorno    date not null,
  ora       time,
  titolo    text not null check (length(trim(titolo)) between 1 and 300),
  nota      text not null default '' check (length(nota) <= 2000),
  fatto     boolean not null default false,
  creato_il timestamptz not null default now()
);

create index agenda_utente_giorno_idx on public.agenda (utente_id, giorno);

alter table public.agenda enable row level security;

create policy "agenda: solo la mia" on public.agenda
  for all to authenticated
  using (utente_id = (select auth.uid()))
  with check (utente_id = (select auth.uid()));

alter publication supabase_realtime add table public.agenda;
