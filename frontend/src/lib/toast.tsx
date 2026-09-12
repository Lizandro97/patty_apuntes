import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"

export type ToastKind = "success" | "error" | "info"
export type Toast = { id: number; kind: ToastKind; title: string; desc?: string; actionLabel?: string; onAction?: () => void }

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} })
export const useToast = () => useContext(ToastCtx)

let seq = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const timers = useRef<Map<number, any>>(new Map())
  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((t) => t.id !== id))
    const tm = timers.current.get(id)
    if (tm) { clearTimeout(tm); timers.current.delete(id) }
  }, [])
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = seq++
    setItems((xs) => [...xs.slice(-3), { ...t, id }])
    timers.current.set(id, setTimeout(() => dismiss(id), t.kind === "error" ? 7000 : 4500))
  }, [dismiss])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
        {items.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-3 flex gap-2.5 items-start">
            <span aria-hidden className={`mt-1 w-2 h-2 rounded-full shrink-0 ${t.kind === "error" ? "bg-[var(--danger)]" : t.kind === "success" ? "bg-[var(--success)]" : "bg-[var(--accent)]"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-[var(--text)]">{t.title}</div>
              {t.desc && <div className="text-xs text-[var(--text-dim)] mt-0.5 break-words">{t.desc}</div>}
              {t.actionLabel && t.onAction && (
                <button onClick={() => { t.onAction?.(); dismiss(t.id) }} className="mt-1.5 text-xs font-medium text-[var(--accent)] hover:underline">{t.actionLabel}</button>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="text-[var(--text-dim)] hover:text-[var(--text)] text-sm leading-none px-1">✕</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
