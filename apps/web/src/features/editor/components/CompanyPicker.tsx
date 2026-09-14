import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useFloatPos } from "./useFloatPos"

export function CompanyPicker({ row, companies, anchorRef, onSelect, onClose }: { row: any; companies: any[]; anchorRef: React.RefObject<HTMLButtonElement | null>; onSelect: (v: { company_id?: string }) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const pos = useFloatPos(anchorRef, true, 280, ref, 300)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [onClose])
  const filtered = companies.filter((e: any) => e.name.toLowerCase().includes(q.toLowerCase()))
  // Táctil: bottom-sheet inmune a mala posición de portales y al teclado
  // (useFloatPos usa el viewport de layout, no el visual). Sin autoFocus.
  // Se decide por capacidad táctil O por ancho: en móvil con "vista de
  // escritorio" el hover:none no matchea y el portal flotante quedaría
  // fuera de pantalla.
  const coarse = typeof window !== "undefined" && (window.matchMedia?.("(hover: none)").matches || window.innerWidth < 1024)
  if (coarse) return createPortal(
    <>
      <div className="fixed inset-0 z-[65] bg-black/60" onClick={onClose} aria-hidden />
      <div ref={ref} role="listbox" aria-label={t("editor.table.searchCompanyAria")} className="fixed inset-x-0 bottom-0 z-[70] max-h-[70dvh] flex flex-col bg-white border-t border-[var(--sheet-border)] rounded-t-2xl shadow-[0_-12px_32px_rgba(132,24,67,0.15)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Input aria-label={t("editor.table.searchCompanyAria")} placeholder={t("editor.table.searchCompanyPh")} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Escape") onClose() }} className="h-11 text-base mb-2 bg-[var(--sheet-soft)] border-[var(--sheet-border)] text-[#1e293b] placeholder:text-[var(--text-dim)]" />
        <div className="overflow-auto space-y-1">
          {filtered.map((e:any)=>(<button key={e.id} role="option" aria-selected={row.company_id===e.id} onClick={()=>onSelect({company_id: e.id })} className="w-full min-h-[44px] text-left px-3 py-2 rounded-lg hover:bg-[var(--sheet-soft)] text-base flex items-center justify-between text-[#1e293b]"><span>{e.name}</span><span className="text-[11px] text-[var(--sheet-accent)]">{row.company_id===e.id ? "✓" : ""}</span></button>))}
          {filtered.length===0 && <div className="text-xs text-[var(--text-dim)] px-3 py-2">{t("editor.table.noCompanyResults")}</div>}
        </div>
        {row.company_id && (
          <button onClick={()=>onSelect({company_id: "" })} className="w-full min-h-[44px] text-left px-3 py-2 mt-2 rounded-lg hover:bg-[var(--danger)]/10 text-xs text-[var(--text-dim)] hover:text-[var(--danger)] border-t border-[var(--sheet-border)]">{t("editor.table.removeCompany")}</button>
        )}
        <button onClick={onClose} className="w-full min-h-[44px] mt-2 rounded-lg bg-[var(--surface-2)] text-[var(--text)] text-sm font-medium">{t("common.close")}</button>
      </div>
    </>,
    document.body
  )
  return createPortal(
    <div ref={ref} role="listbox" aria-label={t("editor.table.searchCompanyAria")} style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? 8, width: 280, zIndex: 70, visibility: pos ? "visible" : "hidden" }} className="bg-white border border-[var(--sheet-border)] rounded-xl shadow-[0_12px_32px_rgba(132,24,67,0.15)] p-2">
      <Input autoFocus aria-label={t("editor.table.searchCompanyAria")} placeholder={t("editor.table.searchCompanyPh")} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Escape") onClose() }} className="h-11 text-base mb-2 bg-[var(--sheet-soft)] border-[var(--sheet-border)] text-[#1e293b] placeholder:text-[var(--text-dim)]" />
      <div className="max-h-[180px] overflow-auto space-y-1">
        {filtered.map((e:any)=>(<button key={e.id} role="option" aria-selected={row.company_id===e.id} onClick={()=>onSelect({company_id: e.id })} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sheet-soft)] text-sm flex items-center justify-between text-[#1e293b]"><span>{e.name}</span><span className="text-[11px] text-[var(--sheet-accent)]">{row.company_id===e.id ? "✓" : ""}</span></button>))}
        {filtered.length===0 && <div className="text-xs text-[var(--text-dim)] px-3 py-2">{t("editor.table.noCompanyResults")}</div>}
      </div>
      {row.company_id && (
        <div className="border-t border-[var(--sheet-border)] mt-2 pt-2">
          <button onClick={()=>onSelect({company_id: "" })} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--danger)]/10 text-xs text-[var(--text-dim)] hover:text-[var(--danger)]">{t("editor.table.removeCompany")}</button>
        </div>
      )}
    </div>,
    document.body
  )
}
