import type { Person } from "../config";

export function Avatar({ p, size = 20 }: { p: Person; size?: number }) {
  return (
    <span className="av" style={{ background: p.color, width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {p.initials}
    </span>
  );
}
