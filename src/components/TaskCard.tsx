import { PRIORITIES, personByEmail } from "../config";
import type { Task } from "../data/types";
import { Avatar } from "./Avatar";
import { Flag } from "./Flag";

interface Props {
  t: Task;
  showWho: boolean;
  canCheck: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
);

export function TaskCard({ t, showWho, canCheck, onToggle, onOpen }: Props) {
  const who = personByEmail(t.assigneeEmail);
  return (
    <div className={`task${t.done ? " done" : ""}`}>
      {canCheck ? (
        <button type="button" className="check" aria-pressed={t.done} aria-label={t.done ? "Segna come da fare" : "Segna come fatta"} onClick={onToggle}>
          {t.done && <Tick />}
        </button>
      ) : (
        <span className={`check static${t.done ? " on" : ""}`} aria-label={t.done ? "Fatta" : "Da fare"}>{t.done && <Tick />}</span>
      )}
      <button type="button" className="task-body" onClick={onOpen}>
        <span className="t">{t.title}</span>
        <span className="meta">
          {showWho && who && <span className="who"><Avatar p={who} size={18} />{who.short}</span>}
          <span>{t.done ? "Fatta" : `Priorità ${PRIORITIES[t.priority].label.toLowerCase()}`}</span>
          {t.note && <span>· nota</span>}
        </span>
      </button>
      <Flag p={t.priority} />
    </div>
  );
}
