import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { personByEmail, type Priority } from "../config";
import type { Backend, Entry, Task } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseConfigured = Boolean(url && anonKey);

interface Row {
  id: string; titolo: string; nota: string; assegnato_a: string; giorno: string;
  priorita: Priority; fatto: boolean; fatto_il: string | null; creato_il: string;
}
const toTask = (r: Row): Task => ({
  id: r.id, title: r.titolo, note: r.nota, assigneeEmail: r.assegnato_a, day: r.giorno, priority: r.priorita,
  done: r.fatto, doneAt: r.fatto_il ? Date.parse(r.fatto_il) : null, createdAt: Date.parse(r.creato_il),
});

interface AgendaRow { id: string; titolo: string; nota: string; giorno: string; ora: string | null; fatto: boolean; creato_il: string }
const toEntry = (r: AgendaRow): Entry => ({
  id: r.id, title: r.titolo, note: r.nota, day: r.giorno, time: r.ora ? r.ora.slice(0, 5) : null, done: r.fatto, createdAt: Date.parse(r.creato_il),
});

const iOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const installed = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
function b64ToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function createSupabaseBackend(): Backend {
  const sb = createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } });

  return {
    mode: "live",
    onUser(cb) {
      const emit = (email?: string | null) => cb(personByEmail(email) ?? null);
      void sb.auth.getSession().then(({ data }) => emit(data.session?.user.email));
      const { data } = sb.auth.onAuthStateChange((_e, session) => emit(session?.user.email));
      return () => data.subscription.unsubscribe();
    },
    async accessState(email) {
      const { data, error } = await sb.rpc("stato_accesso", { p_email: email.trim().toLowerCase() });
      if (error) throw new Error("Connessione non riuscita. Riprova.");
      if (data === "no") throw new Error("Questa mail non è abilitata all'app.");
      return data as "nuovo" | "attivo";
    },
    async createPassword(email, password) {
      const e = email.trim().toLowerCase();
      const { error } = await sb.rpc("crea_accesso", { p_email: e, p_password: password });
      if (error) throw new Error(error.message);
      const { error: err2 } = await sb.auth.signInWithPassword({ email: e, password });
      if (err2) throw new Error("Password creata, ma l'accesso non è riuscito. Riprova.");
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw new Error("Password non corretta.");
    },
    async signOut() { await sb.auth.signOut(); },
    watchTasks(me, from, to, cb) {
      // Row Level Security already limits collaborators to their own tasks.
      let alive = true;
      const load = async () => {
        let q = sb.from("compiti").select("*").gte("giorno", from).lte("giorno", to);
        if (me.role !== "director") q = q.eq("assegnato_a", me.email);
        const { data, error } = await q;
        if (error) { console.error("compiti", error); return; }
        if (alive) cb((data as Row[]).map(toTask));
      };
      void load();
      const channel: RealtimeChannel = sb.channel(`compiti-${from}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "compiti" }, () => { void load(); })
        .subscribe();
      // Coming back to the app after a while: refresh in case realtime dropped.
      const onVisible = () => { if (document.visibilityState === "visible") void load(); };
      document.addEventListener("visibilitychange", onVisible);
      return () => { alive = false; void sb.removeChannel(channel); document.removeEventListener("visibilitychange", onVisible); };
    },
    async addTask(t) {
      const { error } = await sb.from("compiti").insert({
        titolo: t.title, nota: t.note ?? "", assegnato_a: t.assigneeEmail, giorno: t.day, priorita: t.priority,
      });
      if (error) throw new Error("Salvataggio non riuscito.");
    },
    async updateTask(id, patch) {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.titolo = patch.title;
      if (patch.note !== undefined) row.nota = patch.note;
      if (patch.assigneeEmail !== undefined) row.assegnato_a = patch.assigneeEmail;
      if (patch.day !== undefined) row.giorno = patch.day;
      if (patch.priority !== undefined) row.priorita = patch.priority;
      if (patch.done !== undefined) row.fatto = patch.done;
      const { error } = await sb.from("compiti").update(row).eq("id", id);
      if (error) throw new Error("Salvataggio non riuscito.");
    },
    async deleteTask(id) {
      const { error } = await sb.from("compiti").delete().eq("id", id);
      if (error) throw new Error("Eliminazione non riuscita.");
    },
    watchAgenda(_me, from, to, cb) {
      // Row Level Security returns only the signed-in person's own entries.
      let alive = true;
      const load = async () => {
        const { data, error } = await sb.from("agenda").select("*").gte("giorno", from).lte("giorno", to);
        if (error) { console.error("agenda", error); return; }
        if (alive) cb((data as AgendaRow[]).map(toEntry));
      };
      void load();
      const channel: RealtimeChannel = sb.channel(`agenda-${from}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "agenda" }, () => { void load(); })
        .subscribe();
      const onVisible = () => { if (document.visibilityState === "visible") void load(); };
      document.addEventListener("visibilitychange", onVisible);
      return () => { alive = false; void sb.removeChannel(channel); document.removeEventListener("visibilitychange", onVisible); };
    },
    async addEntry(e) {
      const { error } = await sb.from("agenda").insert({ titolo: e.title, nota: e.note ?? "", giorno: e.day, ora: e.time });
      if (error) throw new Error("Salvataggio non riuscito.");
    },
    async updateEntry(id, patch) {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.titolo = patch.title;
      if (patch.note !== undefined) row.nota = patch.note;
      if (patch.day !== undefined) row.giorno = patch.day;
      if (patch.time !== undefined) row.ora = patch.time;
      if (patch.done !== undefined) row.fatto = patch.done;
      const { error } = await sb.from("agenda").update(row).eq("id", id);
      if (error) throw new Error("Salvataggio non riuscito.");
    },
    async deleteEntry(id) {
      const { error } = await sb.from("agenda").delete().eq("id", id);
      if (error) throw new Error("Eliminazione non riuscita.");
    },
    async enablePush() {
      if (iOS() && !installed()) return "Su iPhone le notifiche funzionano solo dall'app installata: Condividi, poi Aggiungi a schermata Home.";
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "Questo browser non supporta le notifiche push.";
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return "Notifiche non consentite. Puoi attivarle dalle impostazioni del telefono.";
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapidPublicKey) return "Le notifiche non sono ancora configurate sul server.";
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      try {
        sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidPublicKey) as BufferSource });
      } catch { return "Questo browser non riesce ad attivare le notifiche push."; }
      const j = sub.toJSON();
      const { error } = await sb.from("push_iscrizioni").upsert({ endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }, { onConflict: "endpoint" });
      return error ? "Impossibile salvare l'iscrizione alle notifiche." : "Notifiche attive su questo dispositivo.";
    },
  };
}
