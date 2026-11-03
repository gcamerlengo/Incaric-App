import { useEffect, useState } from "react";
import { MEMBERS, PEOPLE, PRIORITIES, type Person, type Priority } from "../config";

const DIRECTOR = PEOPLE.find((p) => p.role === "director");
import { longLabel, toKey } from "../dates";
import type { NewTask, Task } from "../data/types";
import { Flag } from "./Flag";

interface Props {
  open: boolean;
  me: Person;
  task: Task | null; // null = new task
  defaultDay: string;
  defaultAssignee?: string;
  days: Date[];
  onClose: () => void;
  onSave: (t: NewTask, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (t: Task) => void;
}

export function TaskSheet({ open, me, task, defaultDay, defaultAssignee, days, onClose, onSave, onDelete, onToggle }: Props) {
  const isDirector = me.role === "director";
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [who, setWho] = useState(MEMBERS[0].email);
  const [day, setDay] = useState(defaultDay);
  const [prio, setPrio] = useState<Priority>("media");
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? ""); setNote(task?.note ?? "");
    setWho(task?.assigneeEmail ?? defaultAssignee ?? MEMBERS[0].email);
    setDay(task?.day ?? defaultDay); setPrio(task?.priority ?? "media"); setConfirmDel(false);
  }, [open, task, defaultDay, defaultAssignee]);

  // Offer the visible week plus the task's own day if it falls outside it.
  const dayKeys = Array.from(new Set([...days.map(toKey), day])).sort();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try { await onSave({ title: title.trim(), note: note.trim(), assigneeEmail: who, day, priority: prio }, task?.id); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className={`scrim${open ? " open" : ""}`} onClick={onClose} />
      <div className={`sheet${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!open} aria-label={task ? "Dettaglio attività" : "Nuova attività"}>
        <div className="grip" />
        {isDirector ? (
          <form onSubmit={submit} className="sheet-form">
            <h2>{task ? "Modifica attività" : "Nuova attività"}</h2>
            <label>Cosa c'è da fare
              <input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Es. Confermare ordine bottiglie da 1 L" />
            </label>
            <label>Assegna a
              <div className="seg-full">
                {MEMBERS.map((m) => (
                  <button key={m.id} type="button" aria-pressed={who === m.email} onClick={() => setWho(m.email)}>
                    <b>{m.short}</b><small>{m.area}</small>
                  </button>
                ))}
              </div>
            </label>
            <label>Giorno
              <select id="f-day" value={day} onChange={(e) => setDay(e.target.value)}>
                {dayKeys.map((k) => <option key={k} value={k}>{longLabel(k)}</option>)}
              </select>
            </label>
            <label>Priorità
              <div className="prio">
                {(Object.keys(PRIORITIES) as Priority[]).map((p) => (
                  <button key={p} type="button" aria-pressed={prio === p} onClick={() => setPrio(p)}>
                    <Flag p={p} size={16} />{PRIORITIES[p].label}
                  </button>
                ))}
              </div>
            </label>
            <label>Nota (facoltativa)
              <textarea id="f-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dettagli, riferimenti ordine, fornitore…" />
            </label>
            <button className="primary" type="submit" disabled={busy}>{task ? "Salva modifiche" : "Assegna attività"}</button>
            {task && (
              confirmDel
                ? <button type="button" className="danger" onClick={async () => { await onDelete(task.id); onClose(); }}>Conferma eliminazione</button>
                : <button type="button" className="link danger-link" onClick={() => setConfirmDel(true)}>Elimina attività</button>
            )}
          </form>
        ) : task && (
          <div className="sheet-form">
            <div className="detail-head"><Flag p={task.priority} size={26} /><span>Priorità {PRIORITIES[task.priority].label.toLowerCase()} · {longLabel(task.day)}</span></div>
            <h2 className="detail-title">{task.title}</h2>
            {task.note ? <p className="detail-note">{task.note}</p> : <p className="detail-note muted">Nessuna nota.</p>}
            <p className="muted small">Assegnata da {DIRECTOR?.name}</p>
            <button className="primary" type="button" onClick={() => { onToggle(task); onClose(); }}>
              {task.done ? "Segna come da fare" : "Segna come fatta"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
