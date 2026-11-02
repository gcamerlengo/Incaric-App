export type Role = "director" | "member";

export interface Person {
  id: string;
  email: string;
  name: string;
  first: string;
  short: string;
  area: string;
  role: Role;
  initials: string;
  color: string;
}

// The three people who use the app. Emails must match the Firebase Auth accounts
// and firestore.rules / functions/src/index.ts.
export const PEOPLE: Person[] = [
  { id: "ap", email: "antonio.pancione@oliodante.it", name: "Antonio Pancione", first: "Antonio", short: "Pancione", area: "Direzione stabilimento", role: "director", initials: "AP", color: "#C8231B" },
  { id: "dg", email: "antonio.delgiacco@oliodante.it", name: "Antonio Del Giacco", first: "Antonio", short: "Del Giacco", area: "Programmazione Produzione", role: "member", initials: "AD", color: "#5E6B2A" },
  { id: "rg", email: "raffaele.gentile@oliodante.it", name: "Raffaele Gentile", first: "Raffaele", short: "Gentile", area: "Acquisti", role: "member", initials: "RG", color: "#A8925A" },
];

export const MEMBERS = PEOPLE.filter((p) => p.role === "member");
export const personByEmail = (email?: string | null) =>
  PEOPLE.find((p) => p.email.toLowerCase() === (email || "").toLowerCase());

export type Priority = "alta" | "media" | "bassa";
export const PRIORITIES: Record<Priority, { label: string; desc: string; cssVar: string; order: number }> = {
  alta: { label: "Alta", desc: "Entro oggi, blocca la produzione", cssVar: "--flag-alta", order: 0 },
  media: { label: "Media", desc: "Entro la giornata indicata", cssVar: "--flag-media", order: 1 },
  bassa: { label: "Bassa", desc: "Quando c'è tempo in settimana", cssVar: "--flag-bassa", order: 2 },
};
