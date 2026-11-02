import { useState } from "react";
import { PEOPLE } from "../config";
import { backend } from "../data";
import { Avatar } from "./Avatar";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await backend.signIn(email, password); } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  };
  const reset = async () => {
    if (!email) { setMsg("Scrivi prima la tua mail aziendale."); return; }
    try { await backend.resetPassword(email); setMsg("Ti abbiamo inviato una mail per impostare una nuova password."); }
    catch { setMsg("Non è stato possibile inviare la mail. Controlla l'indirizzo."); }
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
            <button key={p.id} type="button" className="person-btn" onClick={() => backend.signIn(p.email, "")}>
              <Avatar p={p} size={34} />
              <span><b>{p.name}</b><small>{p.area}</small></span>
            </button>
          ))}
        </div>
      ) : (
        <form className="login-card" onSubmit={submit}>
          <label>Mail aziendale
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome.cognome@oliodante.it" />
          </label>
          <label>Password
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Accesso…" : "Entra"}</button>
          <button className="link" type="button" onClick={reset}>Password dimenticata</button>
        </form>
      )}
      {msg && <p className="login-msg" role="status">{msg}</p>}
    </main>
  );
}
