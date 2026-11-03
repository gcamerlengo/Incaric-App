import { DOW_SHORT, toKey, todayKey } from "../dates";

/** Up to three coloured dots under a day (open tasks by priority, or agenda activities). */
export type Dot = { id: string; color: string };

interface Props {
  days: Date[];
  selected: string;
  dotsFor: (key: string) => Dot[];
  onPick: (key: string) => void;
  onShift: (weeks: number) => void;
}

export function WeekStrip({ days, selected, dotsFor, onPick, onShift }: Props) {
  const today = todayKey();
  return (
    <div className="week">
      <button type="button" className="week-arrow" onClick={() => onShift(-1)} aria-label="Settimana precedente">‹</button>
      <div className="days">
        {days.map((d) => {
          const k = toKey(d);
          const dots = dotsFor(k).slice(0, 3);
          return (
            <button key={k} type="button" className={`day${k === today ? " today" : ""}`} aria-pressed={k === selected} onClick={() => onPick(k)}>
              <small>{DOW_SHORT[d.getDay()]}</small>
              <b>{d.getDate()}</b>
              <span className="dots">{dots.map((d) => <span key={d.id} style={{ background: d.color }} />)}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="week-arrow" onClick={() => onShift(1)} aria-label="Settimana successiva">›</button>
    </div>
  );
}
