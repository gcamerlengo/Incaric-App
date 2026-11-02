-- Indicazione del Security Advisor di Supabase: le funzioni SECURITY DEFINER non devono essere
-- chiamabili dall'API più del necessario. Da eseguire dopo 0001_schema.sql.

-- Le funzioni dei trigger non devono essere chiamabili dall'API.
revoke execute on function public.gestisci_nuovo_utente(), public.prepara_compito(), public.notifica_compito() from public, anon, authenticated;
-- Le funzioni usate dai permessi servono solo a chi ha fatto l'accesso.
revoke execute on function public.mia_email(), public.sono_direttore() from public, anon;
grant execute on function public.mia_email(), public.sono_direttore() to authenticated;
