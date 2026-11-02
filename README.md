# IncaricApp

Web app installabile (iPhone e Android) con cui il Direttore dello stabilimento Olio Dante assegna i compiti del giorno a Programmazione Produzione e Acquisti, con bandierine di priorità e notifiche push.

| Persona | Ruolo nell'app |
|---|---|
| Antonio Pancione | Direttore: crea, modifica ed elimina i compiti, vede quelli di tutti |
| Antonio Del Giacco | Programmazione Produzione: vede i suoi compiti e li segna come fatti |
| Raffaele Gentile | Acquisti: vede i suoi compiti e li segna come fatti |

Priorità: **rossa** alta (entro oggi), **gialla** media (entro il giorno indicato), **verde** bassa (in settimana).

## Due modalità

- **Demo**: se le variabili Firebase non sono impostate, l'app salva i dati solo sul dispositivo e al login si sceglie chi essere. È la versione pubblicata su GitHub Pages a ogni modifica di `main`.
- **Reale**: con Firebase configurato, i tre utenti entrano con mail aziendale e password, i dati sono condivisi in tempo reale e arrivano le notifiche.

## Messa in funzione gratuita (una volta sola)

Tutto resta a costo zero e senza carta di pagamento:

| Servizio | Piano | A cosa serve |
|---|---|---|
| Firebase | Spark (gratuito) | accessi, dati condivisi, consegna delle notifiche |
| Cloudflare Pages | Free (uso commerciale consentito) | sito dell'app e funzione che invia le notifiche |

### 1. Firebase

1. Su <https://console.firebase.google.com> crea un progetto, per esempio `incaricapp-oliodante`. Lascia il piano **Spark**.
2. **Authentication** › Metodo di accesso › abilita *Email/password*. In *Utenti* aggiungi i tre account con le mail aziendali e una password provvisoria (ognuno potrà cambiarla con "Password dimenticata").
3. **Firestore Database** › Crea database in modalità produzione, posizione `eur3 (Europe)`.
4. **Regole e indici**: incolla `firestore.rules` in Firestore › Regole e pubblica. L'indice composto (`assigneeEmail` + `day`) viene proposto da Firebase con un link nella console del browser la prima volta che un collaboratore apre l'app; in alternativa `firebase deploy --only firestore` dal computer.
5. **Impostazioni progetto** › Le tue app › aggiungi un'app *Web* e annota i valori di configurazione.
6. **Impostazioni progetto** › Cloud Messaging › Certificati push web › *Genera coppia di chiavi* e annota la chiave.
7. **Impostazioni progetto** › Account di servizio › *Genera nuova chiave privata*: scarica il file JSON e conservalo con cura (non va nel repository).
8. **Authentication** › Impostazioni › Domini autorizzati: aggiungi il dominio Cloudflare (es. `incaricapp.pages.dev`).

### 2. Cloudflare Pages

1. Crea un account gratuito su <https://dash.cloudflare.com> › Workers e Pages › Crea › Pages › *Connetti a Git* e scegli questo repository.
2. Impostazioni di build: comando `npm run build`, cartella di output `dist`.
3. Variabili d'ambiente (Production):
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`: dal punto 5.
   - `VITE_FIREBASE_VAPID_KEY`: dal punto 6.
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (come *Secret*): dal file JSON del punto 7 (`project_id`, `client_email`, `private_key`).
4. Salva e pubblica. L'app sarà su `https://<nome>.pages.dev`; ogni modifica di `main` la ripubblica.

### Come funzionano le notifiche

Quando il Direttore assegna un compito, o un collaboratore lo segna come fatto, l'app chiama `/api/notify` (`functions/api/notify.ts`). La funzione verifica chi chiama, rilegge il compito da Firestore e invia la notifica con Firebase Cloud Messaging. Il Direttore può annunciare solo nuovi compiti; un collaboratore solo il completamento dei propri.

## Installare l'app sul telefono

- **iPhone** (iOS 16.4 o successivo): apri il link in Safari › Condividi › *Aggiungi alla schermata Home*. Apri l'app dall'icona, menu campanella › *Attiva notifiche*. Su iPhone le notifiche funzionano solo dall'app installata.
- **Android**: apri il link in Chrome › menu › *Installa app*, poi *Attiva notifiche*.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:5173 (modalità demo se manca .env.local)
npm run build      # controllo dei tipi e build in dist/
```

Struttura: `src/` app React, `public/sw.js` service worker (offline e notifiche), `functions/api/notify.ts` invio notifiche (Cloudflare), `firestore.rules` permessi.

Per cambiare persone o mail: `src/config.ts`, `firestore.rules` e `functions/api/notify.ts`.
