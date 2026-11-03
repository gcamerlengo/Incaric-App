import { PEOPLE, personByEmail, type Person } from "../config";
import { addDays, toKey, weekStart } from "../dates";
import type { Backend, Entry, NewTask, Task } from "./types";

// Demo mode: everything lives in this browser's localStorage. Used when Supabase is not configured,
// so the app can be tried right away (GitHub Pages build) before the real backend exists.
const K_TASKS = "incaricapp.demo.tasks";
const K_USER = "incaricapp.demo.user";
const K_AGENDA = "incaricapp.demo.agenda"; // { [email]: Entry[] }

const read = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: keep working in memory */ } };

function seed(): Task[] {
  const mon = weekStart(new Date());
  const d = (i: number) => toKey(addDays(mon, i));
  const dg = PEOPLE[1].email, rg = PEOPLE[2].email, now = Date.now();
  const rows: Array<[string, string, number, Task["priority"], boolean]> = [
    ["Rivedere il piano di imbottigliamento della linea 3", dg, 0, "alta", false],
    ["Verificare con il magazzino le scorte di vetro da 750 ml", dg, 0, "media", true],
    ["Richiedere tre preventivi per i tappi a vite", rg, 0, "alta", false],
    ["Sollecitare la consegna dei cartoni al fornitore", rg, 0, "media", false],
    ["Pianificare il fermo linea per la manutenzione", dg, 1, "media", false],
    ["Chiudere l'ordine di latte da 5 L per l'export", rg, 1, "alta", false],
    ["Aggiornare il listino fornitori olio extravergine", rg, 2, "bassa", false],
    ["Inviare il programma settimanale ai capiturno", dg, 4, "bassa", false],
  ];
  return rows.map(([title, assigneeEmail, i, priority, done], n) => ({
    id: `demo-${n + 1}`, title, assigneeEmail, day: d(i), priority, done, doneAt: done ? now : null, createdAt: now - n,
  }));
}

let memTasks: Task[] = read<Task[] | null>(K_TASKS, null) ?? seed();
let memUser: string | null = read<string | null>(K_USER, null);
let memAgenda: Record<string, Entry[]> = read<Record<string, Entry[]>>(K_AGENDA, {});
const taskSubs = new Set<() => void>();
const agendaSubs = new Set<() => void>();
const saveAgenda = () => { write(K_AGENDA, memAgenda); agendaSubs.forEach((f) => f()); };
const mine = () => memAgenda[memUser ?? ""] ?? [];
const setMine = (list: Entry[]) => { if (memUser) { memAgenda = { ...memAgenda, [memUser]: list }; saveAgenda(); } };
const userSubs = new Set<(p: Person | null) => void>();

const save = () => { write(K_TASKS, memTasks); taskSubs.forEach((f) => f()); };
const emitUser = () => { const p = personByEmail(memUser) ?? null; userSubs.forEach((f) => f(p)); };

// Keep several open tabs in sync, which makes it easy to play director and collaborator side by side.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === K_TASKS) { memTasks = read<Task[]>(K_TASKS, memTasks); taskSubs.forEach((f) => f()); }
    if (e.key === K_AGENDA) { memAgenda = read(K_AGENDA, memAgenda); agendaSubs.forEach((f) => f()); }
  });
}

export const demoBackend: Backend = {
  mode: "demo",
  onUser(cb) { userSubs.add(cb); cb(personByEmail(memUser) ?? null); return () => userSubs.delete(cb); },
  async pickPerson(email) {
    if (!personByEmail(email)) throw new Error("Questa mail non è abilitata all'app.");
    memUser = email; write(K_USER, email); emitUser();
  },
  async accessState(): Promise<"nuovo" | "attivo"> { throw new Error("Nella versione di prova scegli una persona dall'elenco."); },
  async createPassword() { /* not used in demo */ },
  async signIn() { /* not used in demo */ },
  async signOut() { memUser = null; write(K_USER, null); emitUser(); },
  watchTasks(me, from, to, cb) {
    const run = () => cb(memTasks.filter((t) => t.day >= from && t.day <= to && (me.role === "director" || t.assigneeEmail === me.email)));
    taskSubs.add(run); run();
    return () => taskSubs.delete(run);
  },
  async addTask(t: NewTask) {
    memTasks = [...memTasks, { ...t, id: `demo-${Date.now()}`, done: false, doneAt: null, createdAt: Date.now() }]; save();
  },
  async updateTask(id, patch) { memTasks = memTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)); save(); },
  async deleteTask(id) { memTasks = memTasks.filter((t) => t.id !== id); save(); },
  watchAgenda(me, from, to, cb) {
    const run = () => cb((memAgenda[me.email] ?? []).filter((e) => e.day >= from && e.day <= to));
    agendaSubs.add(run); run();
    return () => agendaSubs.delete(run);
  },
  async addEntry(e) { setMine([...mine(), { ...e, id: `agenda-${Date.now()}`, done: false, createdAt: Date.now() }]); },
  async updateEntry(id, patch) { setMine(mine().map((e) => (e.id === id ? { ...e, ...patch } : e))); },
  async deleteEntry(id) { setMine(mine().filter((e) => e.id !== id)); },
  async enablePush() { return "Nella versione di prova le notifiche non sono attive. Lo saranno quando l'app sarà collegata a Supabase."; },
};
