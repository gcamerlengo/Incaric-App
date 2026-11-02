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
  mode: "demo" | "firebase";
  /** Calls back with the signed-in person, or null. Returns an unsubscribe function. */
  onUser(cb: (p: Person | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Live tasks for days in [from, to], filtered to what `me` may see. */
  watchTasks(me: Person, from: string, to: string, cb: (tasks: Task[]) => void): () => void;
  /** Returns the new task id. */
  addTask(t: NewTask): Promise<string>;
  updateTask(id: string, patch: Partial<Pick<Task, "title" | "note" | "assigneeEmail" | "day" | "priority" | "done" | "doneAt">>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  /** Asks the server to push a notification about this task (best effort, never throws). */
  notify(taskId: string, event: "assigned" | "done"): Promise<void>;
  /** Asks permission and registers this device for push. Returns a user-facing status. */
  enablePush(me: Person): Promise<string>;
}
