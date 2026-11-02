// Supabase Edge Function "notifica": riceve dal database (trigger notifica_compito) i compiti
// nuovi o completati e invia le notifiche push ai telefoni dei destinatari.
// Chiavi e segreto stanno in privato.configurazione: nessuna variabile da impostare a mano.
import webpush from "npm:web-push@3.6.7";

type Compito = { id: string; titolo: string; nota: string; giorno: string; priorita: "alta" | "media" | "bassa" };
type Iscrizione = { endpoint: string; keys: { p256dh: string; auth: string } };
type Evento = {
  tipo: "nuovo" | "fatto";
  autore: string | null;
  collaboratore: string | null;
  compito: Compito;
  destinatari: { nome: string; email: string; iscrizioni: Iscrizione[] }[];
};

const URL_DB = Deno.env.get("SUPABASE_URL")!;
const CHIAVE_SERVIZIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PRIORITA = { alta: "🔴 Alta", media: "🟡 Media", bassa: "🟢 Bassa" } as const;
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_DB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: CHIAVE_SERVIZIO, authorization: `Bearer ${CHIAVE_SERVIZIO}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });

function giorno(g: string): string {
  const [y, m, d] = g.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" });
}

function messaggio(e: Evento) {
  const c = e.compito;
  if (e.tipo === "fatto") return { title: `${e.collaboratore ?? "Un collaboratore"} ha completato`, body: c.titolo };
  return { title: `Nuovo compito · ${PRIORITA[c.priorita] ?? ""}`, body: `${c.titolo} · ${giorno(c.giorno)}` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("IncaricApp", { status: 200 });

  const conf = (await (await rest("rpc/configurazione_notifiche", { method: "POST", body: "{}" })).json()) as Record<string, string>;
  if (!conf?.segreto_notifiche || req.headers.get("authorization") !== `Bearer ${conf.segreto_notifiche}`) {
    return new Response("Non autorizzato", { status: 401 });
  }
  webpush.setVapidDetails(conf.vapid_contatto ?? "mailto:agenda@oliodante.it", conf.vapid_pubblica, conf.vapid_privata);

  const e = (await req.json()) as Evento;
  const m = messaggio(e);
  const payload = JSON.stringify({ ...m, day: e.compito.giorno, tag: e.compito.id });
  const esito = { inviate: 0, fallite: 0, rimosse: 0 };

  await Promise.all(e.destinatari.flatMap((d) => d.iscrizioni.map(async (s) => {
    try {
      await webpush.sendNotification(s, payload, { TTL: 86400, urgency: "high" });
      esito.inviate++;
    } catch (err) {
      esito.fallite++;
      const code = (err as { statusCode?: number }).statusCode;
      console.error("push", d.email, code ?? String(err));
      // Telefono disinstallato o permesso revocato: dimentica l'iscrizione.
      if (code === 404 || code === 410) {
        await rest(`push_iscrizioni?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" });
        esito.rimosse++;
      }
    }
  })));

  return Response.json(esito);
});
