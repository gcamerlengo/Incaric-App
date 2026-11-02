import { useState } from "react";
import { PEOPLE } from "../config";
import { backend } from "../data";
import { Avatar } from "./Avatar";

// Sign-in with a 6-digit code sent by email: works inside the installed iPhone app,
// where a link would open Safari instead of the app.
export function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
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
      ) : !sent ? (
        <form className="login-card" onSubmit={(e) => { e.preventDefault(); void run(async () => { await backend.sendCode(email); setSent(true); }); }}>
          <label>Mail aziendale
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome.cognome@oliodante.it" />
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Invio…" : "Ricevi il codice"}</button>
        </form>
      ) : (
        <form className="login-card" onSubmit={(e) => { e.preventDefault(); void run(() => backend.verifyCode(email, code)); }}>
          <p className="demo-note">Abbiamo inviato un codice a <b>{email}</b>.</p>
          <label>Codice
            <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Verifica…" : "Entra"}</button>
          <button className="link" type="button" onClick={() => { setSent(false); setCode(""); }}>Cambia mail</button>
        </form>
      )}
      {msg && <p className="login-msg" role="alert">{msg}</p>}
    </main>
  );
}
