import { PRIORITIES, type Priority } from "../config";

export function Flag({ p, size = 18 }: { p: Priority; size?: number }) {
  return (
    <svg className="flag" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={`Priorità ${PRIORITIES[p].label}`}>
      <path d="M5 22V3" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M6 3.5h12.5l-3 4.5 3 4.5H6z" fill={`var(${PRIORITIES[p].cssVar})`} />
    </svg>
  );
}
