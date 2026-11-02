import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";

// Same region as the Firestore database (create it in "eur3 (Europe)").
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });
initializeApp();

const DIRECTOR = "antonio.pancione@oliodante.it";
const NAMES: Record<string, string> = {
  "antonio.delgiacco@oliodante.it": "Antonio Del Giacco",
  "raffaele.gentile@oliodante.it": "Raffaele Gentile",
};
const PRIO: Record<string, string> = { alta: "🔴 Alta", media: "🟡 Media", bassa: "🟢 Bassa" };

async function notify(email: string, title: string, body: string, data: Record<string, string>) {
  const ref = getFirestore().doc(`pushTokens/${email}`);
  const tokens: string[] = (await ref.get()).get("tokens") ?? [];
  if (!tokens.length) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    webpush: { headers: { Urgency: "high" } },
  });
  // Forget devices that uninstalled the app or revoked permission.
  const dead = res.responses
    .map((r, i) => (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code ?? "") ? tokens[i] : null))
    .filter((t): t is string => Boolean(t));
  if (dead.length) await ref.update({ tokens: FieldValue.arrayRemove(...dead) });
}

/** New task: tell the person it was assigned to. */
export const onTaskCreated = onDocumentCreated("tasks/{taskId}", async (event) => {
  const t = event.data?.data();
  if (!t) return;
  await notify(t.assigneeEmail, `Nuovo compito · ${PRIO[t.priority] ?? ""}`, t.title, { taskId: event.params.taskId, day: t.day });
});

/** Task marked done: tell the director. Re-assignment: tell the new assignee. */
export const onTaskUpdated = onDocumentUpdated("tasks/{taskId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  const data = { taskId: event.params.taskId, day: after.day };
  if (!before.done && after.done) {
    await notify(DIRECTOR, `${NAMES[after.assigneeEmail] ?? after.assigneeEmail} ha completato`, after.title, data);
  }
  if (before.assigneeEmail !== after.assigneeEmail) {
    await notify(after.assigneeEmail, `Nuovo compito · ${PRIO[after.priority] ?? ""}`, after.title, data);
  }
});
