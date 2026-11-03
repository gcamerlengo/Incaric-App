import type { Person, Priority } from "../config";

export interface Task {
  id: string;
  title: string;
  note?: string;
  assigneeEmail: string;
  day: string; // YYYY-MM-DD, local date
  priority: Priority;
  done: boolean;
  doneAt?: number | null;
  createdAt: number;
}

export type NewTask = Omit<Task, "id" | "done" | "doneAt" | "createdAt">;

export interface Backend {
  mode: "demo" | "live";
  /** Calls back with the signed-in person, or null. Returns an unsubscribe function. */
  onUser(cb: (p: Person | null) => void): () => void;
  /** "nuovo": authorised, no password yet; "attivo": has a password. Throws if not authorised. */
  accessState(email: string): Promise<"nuovo" | "attivo">;
  /** First access: sets the person's own password, then signs in. No email is sent. */
  createPassword(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  /** Demo only: sign in as one of the three people without a code. */
  pickPerson?(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Live tasks for days in [from, to], filtered to what `me` may see. */
  watchTasks(me: Person, from: string, to: string, cb: (tasks: Task[]) => void): () => void;
  addTask(t: NewTask): Promise<void>;
  updateTask(id: string, patch: Partial<Pick<Task, "title" | "note" | "assigneeEmail" | "day" | "priority" | "done" | "doneAt">>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  /** Asks permission and registers this device for push. Returns a user-facing status. */
  enablePush(me: Person): Promise<string>;
}
