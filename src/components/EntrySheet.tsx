import { useEffect, useState } from "react";
import { longLabel } from "../dates";
import type { Entry, NewEntry } from "../data/types";

interface Props {
  open: boolean;
  entry: Entry | null; // null = new entry
  defaultDay: string;
  onClose: () => void;
  onSave: (e: NewEntry, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// Add or edit an activity in one's own agenda. Any date can be picked, not only the visible week.
export function EntrySheet({ open, entry, defaultDay, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? ""); setNote(entry?.note ?? ""); setDay(entry?.day ?? defaultDay);
    setTime(entry?.time ?? ""); setConfirmDel(false); setErr(null);
  }, [open, entry, defaultDay]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !day) return;
    setBusy(true); setErr(null);
    try { await onSave({ title: title.trim(), note: note.trim(), day, time: time || null }, entry?.id); onClose(); }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className={`scrim${open ? " open" : ""}`} onClick={onClose} />
      <div className={`sheet${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!open} aria-label={entry ? "Modifica impegno" : "Nuovo impegno"}>
        <div className="grip" />
        <form onSubmit={submit} className="sheet-form">
          <h2>{entry ? "Modifica impegno" : "Nuovo impegno"}</h2>
          <p className="muted small" style={{ margin: 0 }}>La tua agenda è personale: la vedi solo tu.</p>
          <label>Impegno
            <input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Es. Riunione con il fornitore di vetro" />
          </label>
          <div className="two">
            <label>Giorno
              <input id="a-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
            </label>
            <label>Ora (facoltativa)
              <input id="a-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          {day && <p className="muted small" style={{ margin: "-6px 0 0" }}>{longLabel(day)}{time ? ` · ore ${time}` : ""}</p>}
          <label>Nota (facoltativa)
            <textarea id="a-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Luogo, persone, cosa preparare…" />
          </label>
          {err && <p className="login-msg" role="alert" style={{ margin: 0 }}>{err}</p>}
          <button className="primary" type="submit" disabled={busy}>{entry ? "Salva modifiche" : "Aggiungi all'agenda"}</button>
          {entry && (
            confirmDel
              ? <button type="button" className="danger" onClick={async () => { await onDelete(entry.id); onClose(); }}>Conferma eliminazione</button>
              : <button type="button" className="link danger-link" onClick={() => setConfirmDel(true)}>Elimina impegno</button>
          )}
        </form>
      </div>
    </>
  );
}
