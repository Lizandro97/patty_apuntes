import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

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
  const renderItem = (t: Toast) => {
    const Icon = t.kind === "error" ? AlertCircle : t.kind === "success" ? CheckCircle2 : Info
    const tone = t.kind === "error" ? "var(--danger)" : t.kind === "success" ? "var(--success)" : "var(--accent)"
    return (
      <div key={t.id} role={t.kind === "error" ? "alert" : "status"} style={{ borderLeftColor: tone }} className="toast-in bg-[var(--surface)] border border-[var(--border)] border-l-4 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.28)] p-3 flex gap-2.5 items-start pointer-events-auto">
        <Icon aria-hidden size={18} className="shrink-0 mt-px" style={{ color: tone }} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-[var(--text)]">{t.title}</div>
          {t.desc && <div className="text-xs text-[var(--text-dim)] mt-0.5 break-words">{t.desc}</div>}
          {t.actionLabel && t.onAction && (
            <button onClick={() => { t.onAction?.(); dismiss(t.id) }} className="mt-1.5 text-xs font-medium text-[var(--accent)] hover:underline">{t.actionLabel}</button>
          )}
        </div>
        <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="text-[var(--text-dim)] hover:text-[var(--text)] text-sm leading-none px-1">✕</button>
      </div>
    )
  }
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        {items.map(renderItem)}
      </div>
    </ToastCtx.Provider>
  )
}
