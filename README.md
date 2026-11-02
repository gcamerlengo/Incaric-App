# IncaricApp

Web app installabile (PWA) con cui il Direttore dello stabilimento Olio Dante assegna i compiti del giorno a Programmazione Produzione e Acquisti, con bandierine di priorità e notifiche push. Stessa struttura di Agenda Autista.

- **Frontend:** React + Vite, installabile su Android e iPhone ("Aggiungi a schermata Home").
- **Database e accesso:** Supabase (Postgres). Si entra con un codice a 6 cifre ricevuto via email.
- **Pubblicazione:** GitHub Pages, aggiornata da sola a ogni modifica su `main` (`.github/workflows/pubblica.yml`).
- **Notifiche push:** Edge Function di Supabase `notifica` (`supabase/functions/notifica`), chiamata dal database.

Tutti i servizi sono sui piani gratuiti.

## Regole, garantite dal database

| | Antonio Pancione (Direttore) | Antonio Del Giacco, Raffaele Gentile |
|---|---|---|
| Vedere i compiti | tutti | solo i propri |
| Creare, modificare, eliminare | sì | no |
| Segnare come fatto | sì | sì, solo i propri |

- Possono entrare solo le email in `utenti_autorizzati`; il ruolo viene da lì.
- Priorità: **rossa** alta (entro oggi), **gialla** media (entro il giorno indicato), **verde** bassa (in settimana).
- Notifiche: al collaboratore quando riceve un compito, al Direttore quando un compito viene completato.

## Messa in funzione

Indirizzo dell'app: **https://gcamerlengo.github.io/Incaric-App/**

### 1. Supabase (progetto `IncaricApp`, già creato)

Database, permessi, chiavi delle notifiche e funzione `notifica` sono già a posto (`supabase/migrations/0001`–`0003`). Restano da fare a mano, dal pannello di Supabase:

1. **Authentication › Emails › Templates**: nei modelli **Magic Link** e **Confirm signup** metti il codice, ad esempio
   `Il tuo codice per IncaricApp è: {{ .Token }}`
2. **Authentication › SMTP Settings** (consigliato): SMTP personalizzato con la casella Aruba di Agenda (`agenda@oliodante.it`), host `smtps.aruba.it`, porta `465`. Senza, Supabase invia pochissime email all'ora.
3. **Authentication › URL Configuration**: Site URL `https://gcamerlengo.github.io/Incaric-App/`.

### 2. GitHub Pages

A ogni modifica su `main` il workflow `pubblica.yml` costruisce l'app e la copia sul ramo `gh-pages`. In **Settings › Pages** la sorgente deve essere *Deploy from a branch* › `gh-pages` / `(root)`.

I valori in `.env.production` sono pubblici (finiscono comunque nell'app). La chiave VAPID privata e il segreto delle notifiche stanno solo nella tabella `privato.configurazione` di Supabase.

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

Struttura: `src/` app React, `public/sw.js` service worker (offline e notifiche), `supabase/functions/notifica` invio notifiche, `supabase/migrations/` database e permessi. Per cambiare persone o mail: `src/config.ts` e la tabella `utenti_autorizzati`.
