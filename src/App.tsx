import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MEMBERS, PRIORITIES, personByEmail, type Person } from "./config";
import { backend } from "./data";
import type { NewTask, Task } from "./data/types";
import { addDays, fromKey, isValidKey, longLabel, toKey, todayKey, weekDays, weekStart } from "./dates";
import { Login } from "./components/Login";
import { TaskCard } from "./components/TaskCard";
import { TaskSheet } from "./components/TaskSheet";
import { Toast, type ToastMsg } from "./components/Toast";
import { WeekStrip } from "./components/WeekStrip";

const initialDay = () => { const h = location.hash.slice(1); return isValidKey(h) ? h : todayKey(); };

export default function App() {
  const [me, setMe] = useState<Person | null | undefined>(undefined);
  useEffect(() => backend.onUser(setMe), []);

  if (me === undefined) return <div className="splash"><img src="./icons/icon-192.png" alt="" width={72} height={72} /></div>;
  if (me === null) return <Login />;
  return <Board me={me} />;
}

function Board({ me }: { me: Person }) {
  const isDirector = me.role === "director";
  const [day, setDay] = useState(initialDay);
  const monday = useMemo(() => weekStart(fromKey(day)), [day]);
  const days = useMemo(() => weekDays(monday), [monday]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sheet, setSheet] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [menu, setMenu] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const prev = useRef<Map<string, Task> | null>(null);

  const showToast = useCallback((head: string, body: string) => {
    const id = Date.now(); setToast({ id, head, body });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4000);
  }, []);

  // Keep the selected day in the address so a notification can open the right day.
  useEffect(() => { history.replaceState(null, "", `#${day}`); }, [day]);
  useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1); if (isValidKey(h)) setDay(h); };
    window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const from = toKey(monday), to = toKey(addDays(monday, 5));
  useEffect(() => {
    prev.current = null;
    return backend.watchTasks(me, from, to, (list) => {
      const before = prev.current;
      if (before) {
        for (const t of list) {
          const old = before.get(t.id);
          if (!isDirector && !old) showToast(`Nuovo compito · ${PRIORITIES[t.priority].label}`, t.title);
          if (isDirector && old && !old.done && t.done) showToast(`${personByEmail(t.assigneeEmail)?.short ?? ""} ha completato`, t.title);
        }
      }
      prev.current = new Map(list.map((t) => [t.id, t]));
      setTasks(list);
    });
  }, [me, from, to, isDirector, showToast]);

  const visible = tasks.filter((t) => filter === "all" || t.assigneeEmail === filter);
  const ofDay = visible
    .filter((t) => t.day === day)
    .sort((a, b) => Number(a.done) - Number(b.done) || PRIORITIES[a.priority].order - PRIORITIES[b.priority].order || a.createdAt - b.createdAt);
  const doneCount = ofDay.filter((t) => t.done).length;

  const toggle = (t: Task) => { void backend.updateTask(t.id, { done: !t.done }); };
  const save = async (t: NewTask, id?: string) => {
    if (id) await backend.updateTask(id, t); else await backend.addTask(t);
    if (t.day !== day) setDay(t.day);
  };

  const hour = new Date().getHours();
  const hello = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  return (
    <div className="app">
      <Toast msg={toast} />
      <header className="appbar">
        <div className="row">
          <img className="brand" src="./brand/olio-dante.png" alt="Olio Dante" />
          <div className="hello"><div className="hi">{hello}, {me.first}</div><div className="role">{me.area}</div></div>
          <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></svg>
          </button>
        </div>
        {menu && (
          <div className="menu">
            <button type="button" onClick={async () => setPushMsg(await backend.enablePush(me))}>Attiva notifiche su questo telefono</button>
            {pushMsg && <p className="menu-msg">{pushMsg}</p>}
            <button type="button" onClick={() => backend.signOut()}>Esci{backend.mode === "demo" ? " e cambia persona" : ""}</button>
          </div>
        )}
      </header>
      {backend.mode === "demo" && <div className="demo-bar">Versione di prova · i dati restano su questo dispositivo</div>}

      <WeekStrip days={days} selected={day} tasks={visible} onPick={setDay} onShift={(w) => setDay(toKey(addDays(fromKey(day), w * 7)))} />

      <div className="dayhead">
        <h1>{longLabel(day)}</h1>
        <span>{ofDay.length ? `${doneCount} di ${ofDay.length} fatti` : ""}</span>
      </div>
      {day !== todayKey() && <button type="button" className="today-link" onClick={() => setDay(todayKey())}>Torna a oggi</button>}

      {isDirector && (
        <div className="chips">
          {[{ k: "all", l: "Tutti" }, ...MEMBERS.map((m) => ({ k: m.email, l: m.area.split(" ")[0] }))].map(({ k, l }) => (
            <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      )}

      <main className="list">
        {ofDay.length ? ofDay.map((t) => (
          <TaskCard key={t.id} t={t} showWho={isDirector} canCheck={!isDirector}
            onToggle={() => toggle(t)} onOpen={() => setSheet({ open: true, task: t })} />
        )) : (
          <div className="empty">
            <b>{isDirector ? "Nessun compito" : "Giornata libera"}</b>
            {isDirector ? "Tocca “Nuovo compito” per assegnarne uno." : "Nessun compito assegnato per questo giorno."}
          </div>
        )}
      </main>

      {isDirector && <button type="button" className="fab" onClick={() => setSheet({ open: true, task: null })}>+ Nuovo compito</button>}

      <TaskSheet
        open={sheet.open} me={me} task={sheet.task} defaultDay={day} days={days}
        defaultAssignee={filter !== "all" ? filter : undefined}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={save} onDelete={(id) => backend.deleteTask(id)} onToggle={toggle}
      />
    </div>
  );
}
