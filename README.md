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

## Configurare Firebase (una volta sola)

1. Su <https://console.firebase.google.com> crea un progetto, per esempio `incaricapp-oliodante`.
2. **Authentication** › Metodo di accesso › abilita *Email/password*. In *Utenti* aggiungi i tre account con le mail aziendali e una password provvisoria (ognuno potrà cambiarla con "Password dimenticata").
3. **Firestore Database** › Crea database in modalità produzione, posizione `eur3 (Europe)`.
4. **Impostazioni progetto** › Le tue app › aggiungi un'app *Web*: copia i valori in un file `.env.local` partendo da `.env.example`.
5. **Impostazioni progetto** › Cloud Messaging › Certificati push web › *Genera coppia di chiavi*: copia la chiave in `VITE_FIREBASE_VAPID_KEY`.
6. Le notifiche usano Cloud Functions, che richiedono il piano **Blaze** (a consumo). Con tre utenti si resta nella quota gratuita, ma serve una carta associata.

Poi, dal computer:

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # inserisci l'ID del progetto
npm install && npm run build
firebase deploy                     # regole, indici, funzioni e sito
```

L'indirizzo finale sarà `https://<id-progetto>.web.app`.

## Installare l'app sul telefono

- **iPhone** (iOS 16.4 o successivo): apri il link in Safari › Condividi › *Aggiungi alla schermata Home*. Apri l'app dall'icona, menu campanella › *Attiva notifiche*. Su iPhone le notifiche funzionano solo dall'app installata.
- **Android**: apri il link in Chrome › menu › *Installa app*, poi *Attiva notifiche*.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:5173 (modalità demo se manca .env.local)
npm run build      # controllo dei tipi e build in dist/
```

Struttura: `src/` app React, `public/sw.js` service worker (offline e notifiche), `functions/` invio notifiche, `firestore.rules` permessi.

Per cambiare persone o mail: `src/config.ts`, `firestore.rules` e `functions/src/index.ts`.
