import { PRIORITIES } from "../config";
import { DOW_SHORT, toKey, todayKey } from "../dates";
import type { Task } from "../data/types";

interface Props {
  days: Date[];
  selected: string;
  tasks: Task[];
  onPick: (key: string) => void;
  onShift: (weeks: number) => void;
}

export function WeekStrip({ days, selected, tasks, onPick, onShift }: Props) {
  const today = todayKey();
  return (
    <div className="week">
      <button type="button" className="week-arrow" onClick={() => onShift(-1)} aria-label="Settimana precedente">‹</button>
      <div className="days">
        {days.map((d) => {
          const k = toKey(d);
          const open = tasks.filter((t) => t.day === k && !t.done).sort((a, b) => PRIORITIES[a.priority].order - PRIORITIES[b.priority].order).slice(0, 3);
          return (
            <button key={k} type="button" className={`day${k === today ? " today" : ""}`} aria-pressed={k === selected} onClick={() => onPick(k)}>
              <small>{DOW_SHORT[d.getDay()]}</small>
              <b>{d.getDate()}</b>
              <span className="dots">{open.map((t) => <span key={t.id} style={{ background: `var(${PRIORITIES[t.priority].cssVar})` }} />)}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="week-arrow" onClick={() => onShift(1)} aria-label="Settimana successiva">›</button>
    </div>
  );
}
