# IncaricApp

Web app installabile (PWA) con cui il Direttore dello stabilimento Olio Dante assegna i compiti del giorno a Programmazione Produzione e Acquisti, con bandierine di priorità e notifiche push. Stessa struttura di Agenda Autista.

- **Frontend:** React + Vite, installabile su Android e iPhone ("Aggiungi a schermata Home").
- **Database e accesso:** Supabase (Postgres). Si entra con un codice a 6 cifre ricevuto via email.
- **Pubblicazione e notifiche:** Vercel (`api/notifica.ts`).

Tutti i servizi sono sui piani gratuiti.

## Regole, garantite dal database

| | Antonio Pancione (Direttore) | Antonio Del Giacco, Raffaele Gentile |
|---|---|---|
| Vedere i compiti | tutti | solo i propri |
| Creare, modificare, eliminare | sì | no |
| Segnare come fatto | sì | sì, solo i propri |

- Possono entrare solo le email in `utenti_autorizzati`; il ruolo viene da lì.
- Priorità: **rossa** alta (entro oggi), **gialla** media (entro il giorno indicato), **verde** bassa (in settimana).
- Notifiche: al collaboratore quando riceve un compito, al Direttore quando un compito viene completato. Se è configurato l'SMTP arriva anche una email.

## Messa in funzione

### 1. Supabase

Serve un **progetto nuovo**, separato da Agenda Autista: il controllo delle email autorizzate di Agenda rifiuterebbe Del Giacco e Gentile. Il piano gratuito consente due progetti attivi.

1. Crea un progetto su [supabase.com](https://supabase.com) (regione Europa), per esempio `incaricapp`.
2. In **SQL Editor** incolla ed esegui `supabase/migrations/0001_schema.sql` (l'ultima riga mostra il `WEBHOOK_SECRET` da copiare su Vercel), poi `0002_revoca_funzioni.sql`.
3. In **Authentication › Emails › Templates** metti il codice nei modelli **Magic Link** e **Confirm signup**, ad esempio:
   `Il tuo codice per IncaricApp è: {{ .Token }}`
4. In **Authentication › SMTP Settings** abilita l'SMTP personalizzato con la casella Aruba già usata per Agenda (es. `agenda@oliodante.it`): host `smtps.aruba.it`, porta `465`, utente e password della casella. Senza questo passaggio Supabase invia pochissime email all'ora.
5. In **Project Settings › API** copia `Project URL` e la chiave `anon public`.

### 2. Vercel

1. Su [vercel.com](https://vercel.com) importa il repository `Incaric-App` (le impostazioni di build vengono riconosciute da sole).
2. Aggiungi le variabili d'ambiente:

   | Variabile | Valore |
   | --- | --- |
   | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | dal punto 1.5 |
   | `WEBHOOK_SECRET` | il valore mostrato al punto 1.2 |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | generate con `npx web-push generate-vapid-keys` |
   | `SITO_URL` | l'indirizzo Vercel, es. `https://incaricapp.vercel.app` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | facoltative: per ricevere anche le email |
3. Pubblica. Poi, in Supabase:
   - **Authentication › URL Configuration**: imposta come Site URL l'indirizzo Vercel.
   - Se l'indirizzo non è `https://incaricapp.vercel.app`, nel **SQL Editor** esegui:
     `update privato.configurazione set valore = 'https://<indirizzo>/api/notifica' where chiave = 'url_notifiche';`

### 3. Sui telefoni

- **iPhone** (iOS 16.4 o successivo): apri l'indirizzo in Safari › Condividi › *Aggiungi alla schermata Home*. Apri l'app dall'icona, tocca la campanella › *Attiva notifiche*. Su iPhone le notifiche funzionano solo dall'app installata.
- **Android:** apri in Chrome › menu › *Installa app*, poi campanella › *Attiva notifiche*.

## Sviluppo locale

```sh
cp .env.example .env   # inserisci i valori di Supabase, oppure lascia vuoto per la versione di prova
npm install
npm run dev
```

Senza le variabili Supabase l'app parte in **versione di prova**: i dati restano sul dispositivo e al login si sceglie chi essere.

Struttura: `src/` app React, `public/sw.js` service worker (offline e notifiche), `api/notifica.ts` invio notifiche, `supabase/migrations/` database e permessi. Per cambiare persone o mail: `src/config.ts` e la tabella `utenti_autorizzati`.
