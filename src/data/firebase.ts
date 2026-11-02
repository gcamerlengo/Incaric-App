import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, initializeFirestore, onSnapshot, persistentLocalCache,
  persistentMultipleTabManager, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData,
} from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { personByEmail } from "../config";
import type { Backend, Task } from "./types";

const env = import.meta.env;
export const firebaseConfigured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);

export function createFirebaseBackend(): Backend {
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  // Offline cache: the list still opens in the plant where coverage is poor.
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  const tasksCol = collection(db, "tasks");

  const toTask = (id: string, d: DocumentData): Task => ({
    id,
    title: d.title,
    note: d.note || "",
    assigneeEmail: d.assigneeEmail,
    day: d.day,
    priority: d.priority,
    done: Boolean(d.done),
    doneAt: d.doneAt?.toMillis?.() ?? null,
    createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
  });

  return {
    mode: "firebase",
    onUser(cb) {
      return onAuthStateChanged(auth, (u) => {
        const p = personByEmail(u?.email);
        if (u && !p) { void signOut(auth); cb(null); return; }
        cb(p ?? null);
      });
    },
    async signIn(email, password) {
      if (!personByEmail(email)) throw new Error("Questa mail non è abilitata all'app.");
      try { await signInWithEmailAndPassword(auth, email.trim(), password); }
      catch { throw new Error("Mail o password non corrette."); }
    },
    async resetPassword(email) { await sendPasswordResetEmail(auth, email.trim()); },
    async signOut() { await signOut(auth); },
    watchTasks(me, from, to, cb) {
      // Members may only query their own tasks: firestore.rules rejects anything broader.
      const q = me.role === "director"
        ? query(tasksCol, where("day", ">=", from), where("day", "<=", to))
        : query(tasksCol, where("assigneeEmail", "==", me.email), where("day", ">=", from), where("day", "<=", to));
      return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toTask(d.id, d.data()))), (err) => console.error("tasks", err));
    },
    async addTask(t) {
      await addDoc(tasksCol, { ...t, note: t.note || "", done: false, doneAt: null, createdAt: serverTimestamp(), createdBy: auth.currentUser?.email ?? "" });
    },
    async updateTask(id, patch) {
      const p: Record<string, unknown> = { ...patch };
      if ("done" in patch) p.doneAt = patch.done ? serverTimestamp() : null;
      await updateDoc(doc(db, "tasks", id), p);
    },
    async deleteTask(id) { await deleteDoc(doc(db, "tasks", id)); },
    async enablePush(me) {
      if (!(await isSupported()) || !("serviceWorker" in navigator)) {
        const ios = /iPhone|iPad/.test(navigator.userAgent);
        return ios
          ? "Su iPhone le notifiche funzionano solo dall'app installata: Condividi, poi Aggiungi a schermata Home."
          : "Questo browser non supporta le notifiche push.";
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return "Notifiche non consentite. Puoi attivarle dalle impostazioni del telefono.";
      const reg = await navigator.serviceWorker.ready;
      const token = await getToken(getMessaging(app), { vapidKey: env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
      await setDoc(doc(db, "pushTokens", me.email), { tokens: arrayUnion(token), updatedAt: serverTimestamp() }, { merge: true });
      return "Notifiche attive su questo dispositivo.";
    },
  };
}
