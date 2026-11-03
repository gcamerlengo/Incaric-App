import { useState } from "react";
import { PEOPLE } from "../config";
import { backend } from "../data";
import { Avatar } from "./Avatar";

// Sign-in with email and password, no emails sent. On first access each person picks a password.
export function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [state, setState] = useState<"nuovo" | "attivo" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="login">
      <div className="login-hero"><img className="login-logo" src="./brand/olio-dante.png" alt="Olio Dante" /></div>
      <h1>IncaricApp</h1>
      <p className="login-sub">Compiti dello stabilimento</p>

      {backend.mode === "demo" ? (
        <div className="login-card">
          <p className="demo-note">Versione di prova: i dati restano su questo dispositivo. Scegli chi vuoi essere.</p>
          {PEOPLE.map((p) => (
            <button key={p.id} type="button" className="person-btn" onClick={() => run(() => backend.pickPerson!(p.email))}>
              <Avatar p={p} size={34} />
              <span><b>{p.name}</b><small>{p.area}</small></span>
            </button>
          ))}
        </div>
      ) : !state ? (
        <form className="login-card" onSubmit={(e) => { e.preventDefault(); void run(async () => setState(await backend.accessState(email))); }}>
          <label>Mail aziendale
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome.cognome@oliodante.it" />
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Attendi…" : "Continua"}</button>
        </form>
      ) : state === "attivo" ? (
        <form className="login-card" onSubmit={(e) => { e.preventDefault(); void run(() => backend.signIn(email, pw)); }}>
          <p className="demo-note"><b>{email}</b></p>
          <label>Password
            <input id="password" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Accesso…" : "Entra"}</button>
          <button className="link" type="button" onClick={() => { setState(null); setPw(""); }}>Cambia mail</button>
        </form>
      ) : (
        <form className="login-card" onSubmit={(e) => {
          e.preventDefault();
          if (pw.length < 8) { setMsg("La password deve avere almeno 8 caratteri."); return; }
          if (pw !== pw2) { setMsg("Le due password non coincidono."); return; }
          void run(() => backend.createPassword(email, pw));
        }}>
          <p className="demo-note">Primo accesso per <b>{email}</b>: scegli la tua password (almeno 8 caratteri).</p>
          <label>Nuova password
            <input id="new-password" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          </label>
          <label>Ripeti la password
            <input id="new-password-2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Creazione…" : "Crea password ed entra"}</button>
          <button className="link" type="button" onClick={() => { setState(null); setPw(""); setPw2(""); }}>Cambia mail</button>
        </form>
      )}
      {msg && <p className="login-msg" role="alert">{msg}</p>}
    </main>
  );
}
