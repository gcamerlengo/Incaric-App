// Funzione serverless su Vercel: riceve dal database (trigger notifica_compito) i compiti
// nuovi o completati e avvisa i destinatari con notifica push ed, eventualmente, email.
import nodemailer from "nodemailer";
import webpush from "web-push";

type Compito = { id: string; titolo: string; nota: string; giorno: string; priorita: "alta" | "media" | "bassa" };
type Destinatario = { nome: string; email: string; iscrizioni: webpush.PushSubscription[] };
export type Evento = {
  tipo: "nuovo" | "fatto";
  autore: string | null;
  collaboratore: string | null;
  compito: Compito;
  destinatari: Destinatario[];
};

const SITO = process.env.SITO_URL ?? "https://incaricapp.vercel.app";
const PRIORITA = { alta: "🔴 Alta", media: "🟡 Media", bassa: "🟢 Bassa" } as const;

function giorno(g: string): string {
  const [y, m, d] = g.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" });
}

export function componiMessaggio(e: Evento): { titolo: string; testo: string } {
  const c = e.compito;
  if (e.tipo === "fatto") {
    return { titolo: `${e.collaboratore ?? "Un collaboratore"} ha completato`, testo: c.titolo };
  }
  return { titolo: `Nuovo compito · ${PRIORITA[c.priorita] ?? ""}`, testo: `${c.titolo} · ${giorno(c.giorno)}` };
}

function html(e: Evento, m: { titolo: string; testo: string }): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const c = e.compito;
  const righe = [["Compito", c.titolo], ["Giorno", giorno(c.giorno)], ["Priorità", PRIORITA[c.priorita] ?? ""], ["Nota", c.nota], ["Da", e.autore ?? ""]]
    .filter(([, v]) => v);
  return `<div style="font-family:system-ui,sans-serif;color:#1C1A17">
<div style="background:#1C1A17;border-bottom:5px solid #FFD200;padding:12px 16px;color:#FFD200;font-weight:700;letter-spacing:.05em">INCARICAPP</div>
<h2 style="margin:16px 0 8px">${esc(m.titolo)}</h2>
<table style="border-collapse:collapse">${righe
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6B675C">${k}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`)
    .join("")}</table>
<p style="margin:20px 0 0"><a href="${SITO}/#${c.giorno}" style="color:#1C1A17">Apri IncaricApp</a></p>
</div>`;
}

function configuraPush(): boolean {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SMTP_FROM } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(`mailto:${SMTP_FROM ?? "agenda@oliodante.it"}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

function trasportoEmail() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const porta = Number(SMTP_PORT ?? 465);
  return nodemailer.createTransport({ host: SMTP_HOST, port: porta, secure: porta === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

// La chiave pubblica serve all'app per iscrivere il telefono alle notifiche.
export function GET(): Response {
  return Response.json({ vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}

export async function POST(request: Request): Promise<Response> {
  const segreto = process.env.WEBHOOK_SECRET;
  if (!segreto || request.headers.get("authorization") !== `Bearer ${segreto}`) {
    return new Response("Non autorizzato", { status: 401 });
  }
  const evento = (await request.json()) as Evento;
  const m = componiMessaggio(evento);
  const push = configuraPush();
  const posta = trasportoEmail();
  const esito = { push: 0, pushFallite: 0, email: 0, emailFallite: 0 };
  const payload = JSON.stringify({ title: m.titolo, body: m.testo, day: evento.compito.giorno, tag: evento.compito.id });

  await Promise.all(
    evento.destinatari.flatMap((d) => [
      ...(push
        ? d.iscrizioni.map((s) =>
            webpush.sendNotification(s, payload, { TTL: 86400, urgency: "high" })
              .then(() => esito.push++)
              .catch((err) => { esito.pushFallite++; console.error("push", d.email, err?.statusCode ?? err); }),
          )
        : []),
      posta
        ? posta.sendMail({
            from: `IncaricApp <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
            to: d.email,
            subject: `${m.titolo}: ${evento.compito.titolo}`,
            text: `${m.titolo}\n${m.testo}\n\n${SITO}`,
            html: html(evento, m),
          })
            .then(() => esito.email++)
            .catch((err) => { esito.emailFallite++; console.error("email", d.email, err); })
        : Promise.resolve(),
    ]),
  );
  return Response.json(esito);
}
