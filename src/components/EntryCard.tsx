import type { Entry } from "../data/types";

const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
);

export function EntryCard({ e, onToggle, onOpen }: { e: Entry; onToggle: () => void; onOpen: () => void }) {
  return (
    <div className={`task entry${e.done ? " done" : ""}`}>
      <button type="button" className="check" aria-pressed={e.done} aria-label={e.done ? "Segna come da fare" : "Segna come fatta"} onClick={onToggle}>
        {e.done && <Tick />}
      </button>
      <button type="button" className="task-body" onClick={onOpen}>
        <span className="t">{e.title}</span>
        <span className="meta">
          <span>{e.done ? "Fatta" : e.time ? `Ore ${e.time}` : "In giornata"}</span>
          {e.note && <span>· nota</span>}
        </span>
      </button>
      <span className="when">{e.time ?? "—"}</span>
    </div>
  );
}
