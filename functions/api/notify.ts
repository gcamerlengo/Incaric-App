// Cloudflare Pages Function: POST /api/notify
// Sends the push notifications that Firebase would otherwise send from paid Cloud Functions.
// The app calls it right after creating, re-assigning or completing a task. Free on the Cloudflare plan.
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from "jose";

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string; // service account
  FIREBASE_PRIVATE_KEY: string; // service account, PEM ("\n" escapes allowed)
}
interface Ctx { request: Request; env: Env }

const DIRECTOR = "antonio.pancione@oliodante.it";
const NAMES: Record<string, string> = {
  "antonio.delgiacco@oliodante.it": "Antonio Del Giacco",
  "raffaele.gentile@oliodante.it": "Raffaele Gentile",
};
const PRIO: Record<string, string> = { alta: "🔴 Alta", media: "🟡 Media", bassa: "🟢 Bassa" };
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function googleToken(env: Env): Promise<string> {
  const key = await importPKCS8(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

type FsValue = { stringValue?: string; booleanValue?: boolean; arrayValue?: { values?: FsValue[] } };
const docUrl = (env: Env, path: string) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

async function getDoc(env: Env, token: string, path: string): Promise<Record<string, FsValue> | null> {
  const res = await fetch(docUrl(env, path), { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  return ((await res.json()) as { fields?: Record<string, FsValue> }).fields ?? {};
}

async function push(env: Env, token: string, email: string, title: string, body: string, data: Record<string, string>) {
  const fields = await getDoc(env, token, `pushTokens/${encodeURIComponent(email)}`);
  const tokens = (fields?.tokens?.arrayValue?.values ?? []).map((v) => v.stringValue).filter((t): t is string => Boolean(t));
  const dead: string[] = [];
  await Promise.all(tokens.map(async (t) => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ message: { token: t, notification: { title, body }, data, webpush: { headers: { Urgency: "high" } } } }),
    });
    if (res.status === 404 || res.status === 400) dead.push(t); // uninstalled app or revoked permission
  }));
  if (dead.length) {
    // Forget dead devices: arrayRemove through a Firestore commit.
    await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ writes: [{ transform: {
        document: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/pushTokens/${email}`,
        fieldTransforms: [{ fieldPath: "tokens", removeAllFromArray: { values: dead.map((d) => ({ stringValue: d })) } }],
      } }] }),
    });
  }
  return tokens.length - dead.length;
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  // 1. Who is calling: a valid Firebase sign-in token from this project.
  const idToken = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  let caller: string;
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    caller = String(payload.email || "").toLowerCase();
  } catch {
    return json(401, { error: "not signed in" });
  }

  const { taskId, event } = (await request.json().catch(() => ({}))) as { taskId?: string; event?: string };
  if (!taskId || !/^[A-Za-z0-9]{1,64}$/.test(taskId) || !["assigned", "done"].includes(event || "")) return json(400, { error: "bad request" });

  // 2. Read the task as stored, so a caller cannot invent the notification text or target.
  const token = await googleToken(env);
  const f = await getDoc(env, token, `tasks/${taskId}`);
  if (!f) return json(404, { error: "task not found" });
  const t = {
    title: f.title?.stringValue ?? "", assignee: (f.assigneeEmail?.stringValue ?? "").toLowerCase(),
    day: f.day?.stringValue ?? "", priority: f.priority?.stringValue ?? "", done: Boolean(f.done?.booleanValue),
  };
  const data = { taskId, day: t.day };

  // 3. Only the director announces new tasks; only the assignee announces completion.
  if (event === "assigned" && caller === DIRECTOR) {
    return json(200, { sent: await push(env, token, t.assignee, `Nuovo compito · ${PRIO[t.priority] ?? ""}`, t.title, data) });
  }
  if (event === "done" && caller === t.assignee && t.done) {
    return json(200, { sent: await push(env, token, DIRECTOR, `${NAMES[t.assignee] ?? t.assignee} ha completato`, t.title, data) });
  }
  return json(403, { error: "not allowed" });
}
