import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, Check, Minus, Trash2 } from "lucide-react"
import { useFloatPos } from "./useFloatPos"

export function RowMenu({ row, idx, total, onMove, onDelete, onMarkRow }: { row: any; idx: number; total: number; onMove: (dir: -1 | 1) => void; onDelete: () => void; onMarkRow: (mark: boolean) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigRef = useRef<HTMLButtonElement>(null)
  const menuPos = useFloatPos(trigRef, open, 190, ref, 320)
  // Small screen or touch: the menu floats as a bottom-sheet (immune to
  // portals mispositioned after scroll/zoom in mobile Chromium).
  const small = typeof window !== "undefined" && (window.matchMedia?.("(hover: none)").matches || window.innerWidth < 1024)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !(trigRef.current && trigRef.current.contains(e.target as Node))) { setOpen(false); setConfirming(false) } }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setConfirming(false) } }
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [open])
  return (
    <div className="absolute bottom-0 right-0">
      <button
        ref={trigRef}
        onClick={() => { setOpen(!open); setConfirming(false) }}
        title={t("editor.table.rowOptions")}
        aria-label={t("editor.table.rowOptions")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative block w-7 h-7 [@media(hover:none)]:w-11 [@media(hover:none)]:h-11 max-lg:w-11 max-lg:h-11 cursor-pointer bg-transparent transition-opacity opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 focus-visible:opacity-100 max-md:opacity-100 [touch-action:manipulation]"
      ><span aria-hidden className="absolute bottom-[3px] right-[3px] border-b-[10px] border-b-[var(--sheet-accent)] border-l-[10px] border-l-transparent opacity-80 hover:opacity-100 hover:brightness-125 transition" /></button>
      {open && small && createPortal(
        <>
          <div className="fixed inset-0 z-[65] bg-black/60" onClick={() => { setOpen(false); setConfirming(false) }} aria-hidden />
          <div ref={ref} role="menu" aria-label={t("editor.table.rowOptions")} className="fixed inset-x-0 bottom-0 z-[70] bg-white border-t border-[var(--sheet-border)] rounded-t-2xl shadow-[0_-12px_32px_rgba(132,24,67,0.15)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {!confirming ? (
              <>
                <button onClick={() => { onMarkRow(true); setOpen(false) }} className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#1e293b] hover:bg-[var(--sheet-soft)]"><Check size={13}/> {t("editor.table.markRow")}</button>
                <button onClick={() => { onMarkRow(false); setOpen(false) }} className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#1e293b] hover:bg-[var(--sheet-soft)]"><Minus size={13}/> {t("editor.table.unmarkRow")}</button>
                <div className="border-t border-[var(--sheet-border)] mt-1 pt-1" />
                <button onClick={() => { onMove(-1); setOpen(false) }} disabled={idx === 0} className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#1e293b] hover:bg-[var(--sheet-soft)] disabled:opacity-40 disabled:hover:bg-transparent"><ArrowUp size={13}/> {t("editor.table.moveUp")}</button>
                <button onClick={() => { onMove(1); setOpen(false) }} disabled={idx === total - 1} className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#1e293b] hover:bg-[var(--sheet-soft)] disabled:opacity-40 disabled:hover:bg-transparent"><ArrowDown size={13}/> {t("editor.table.moveDown")}</button>
                <div className="border-t border-[var(--sheet-border)] mt-1 pt-1">
                  <button onClick={() => setConfirming(true)} className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"><Trash2 size={13}/> {t("editor.table.deleteRow")}</button>
                </div>
                <button onClick={() => { setOpen(false); setConfirming(false) }} className="w-full min-h-[44px] mt-2 rounded-lg bg-[var(--surface-2)] text-[var(--text)] text-sm font-medium">{t("common.close")}</button>
              </>
            ) : (
              <div className="p-1.5">
                <div className="text-sm font-medium text-[#1e293b] px-1.5 pb-1">{t("editor.table.deleteTitle", { name: row.name_snapshot || t("editor.table.defaultRowName", { n: idx + 1 }) })}</div>
                <div className="text-xs text-[var(--text-dim)] px-1.5 pb-2.5">{t("editor.table.deleteDesc")}</div>
                <div className="flex gap-1.5">
                  <button onClick={() => setConfirming(false)} className="flex-1 min-h-[44px] rounded-lg border border-[var(--sheet-border)] text-sm text-[#64748b] hover:bg-[var(--sheet-soft)]">{t("editor.table.cancel")}</button>
                  <button onClick={() => { onDelete(); setOpen(false); setConfirming(false) }} className="flex-1 min-h-[44px] rounded-lg bg-[var(--danger)] hover:brightness-110 text-sm text-[var(--on-accent)] font-medium">{t("editor.table.delete")}</button>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
      {open && !small && createPortal(
        <div ref={ref} style={{ position: "fixed", top: menuPos?.top ?? -9999, left: menuPos?.left ?? 8, width: 190, zIndex: 70, visibility: menuPos ? "visible" : "hidden" }} className="bg-white border border-[var(--sheet-border)] rounded-xl shadow-[0_12px_32px_rgba(132,24,67,0.15)] p-1.5 text-left">
          {!confirming ? (
            <>
              <button onClick={() => { onMarkRow(true); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-[#1e293b] hover:bg-[var(--sheet-soft)]"><Check size={13}/> {t("editor.table.markRow")}</button>
              <button onClick={() => { onMarkRow(false); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-[#1e293b] hover:bg-[var(--sheet-soft)]"><Minus size={13}/> {t("editor.table.unmarkRow")}</button>
              <div className="border-t border-[var(--sheet-border)] mt-1 pt-1" />
              <button onClick={() => { onMove(-1); setOpen(false) }} disabled={idx === 0} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-[#1e293b] hover:bg-[var(--sheet-soft)] disabled:opacity-40 disabled:hover:bg-transparent"><ArrowUp size={13}/> {t("editor.table.moveUp")}</button>
              <button onClick={() => { onMove(1); setOpen(false) }} disabled={idx === total - 1} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-[#1e293b] hover:bg-[var(--sheet-soft)] disabled:opacity-40 disabled:hover:bg-transparent"><ArrowDown size={13}/> {t("editor.table.moveDown")}</button>
              <div className="border-t border-[var(--sheet-border)] mt-1 pt-1">
                <button onClick={() => setConfirming(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"><Trash2 size={13}/> {t("editor.table.deleteRow")}</button>
              </div>
            </>
          ) : (
            <div className="p-1.5">
              <div className="text-xs font-medium text-[#1e293b] px-1.5 pb-1">{t("editor.table.deleteTitle", { name: row.name_snapshot || t("editor.table.defaultRowName", { n: idx + 1 }) })}</div>
              <div className="text-[11px] text-[var(--text-dim)] px-1.5 pb-2.5">{t("editor.table.deleteDesc")}</div>
              <div className="flex gap-1.5">
                <button onClick={() => setConfirming(false)} className="flex-1 h-7 rounded-lg border border-[var(--sheet-border)] text-xs text-[#64748b] hover:bg-[var(--sheet-soft)]">{t("editor.table.cancel")}</button>
                <button onClick={() => { onDelete(); setOpen(false); setConfirming(false) }} className="flex-1 h-7 rounded-lg bg-[var(--danger)] hover:brightness-110 text-xs text-[var(--on-accent)] font-medium">{t("editor.table.delete")}</button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
