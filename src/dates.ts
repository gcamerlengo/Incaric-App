export const DOW_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
export const DOW_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
export const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const pad = (n: number) => String(n).padStart(2, "0");
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const todayKey = () => toKey(new Date());

/** Monday of the week that contains `d`. */
export const weekStart = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
/** Monday to Saturday: the plant's working week. */
export const weekDays = (monday: Date) => Array.from({ length: 6 }, (_, i) => addDays(monday, i));

export const longLabel = (k: string) => { const d = fromKey(k); return `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const isValidKey = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(fromKey(k).getTime());
