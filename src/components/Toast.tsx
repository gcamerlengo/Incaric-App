export interface ToastMsg { id: number; head: string; body: string }

export function Toast({ msg }: { msg: ToastMsg | null }) {
  return (
    <div className={`toast${msg ? " show" : ""}`} role="status" aria-live="polite">
      {msg && (<><img src="./icons/icon-192.png" alt="" width={34} height={34} /><div><b>{msg.head}</b>{msg.body}</div></>)}
    </div>
  );
}
