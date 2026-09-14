import { useQuery, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { apiError } from "@/lib/errors"
import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useLayoutEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettingsStore } from "@/stores/settings"
import { useEditorHeaderStore } from "@/stores/editorHeader"
import { useHistoryStore, type HistorySnapshot } from "@/stores/history"
import { useUiStore } from "@/stores/ui"
import { currentYear } from "@/lib/defaults"
import { findRowsMissingCompany, personName, sanitizeStaffNames } from "@foliora/validation"
import { useToast } from "@/lib/toast"
import { downloadBlob, exportFilename } from "@/lib/filenames"
import { Plus, Minus, Trash2, ArrowUp, ArrowDown, Users, Calendar, Check, Save, Download, Eye, Undo2, Redo2, Settings2, FileText, Table2, Palette, RectangleVertical, RectangleHorizontal, PanelRightClose, PanelRightOpen, ChevronUp, ChevronDown, Menu, Pencil, X } from "lucide-react"

// Per-person color (P1..Pn index). Fixed distinguishable colorblind-safe palette;
// the sheet is always light, so it works across all 3 themes.
export const PERSON_COLORS = [
  "#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7",
  "#56B4E9", "#B58900", "#8B5CF6", "#10B981", "#999999",
]

// Floating overlay: portal to body + fixed position so dropdowns float above
// the scrollable sheet instead of being clipped by it. Anchored to the trigger,
// flips up when there is no room below, clamps to the viewport, follows scroll.
function useFloatPos(anchor: React.RefObject<HTMLElement | null>, open: boolean, w: number, menuRef?: React.RefObject<HTMLElement | null>, estH = 320, align: "left" | "right" = "left") {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const place = () => {
      const el = anchor.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth, vh = window.innerHeight
      // Real menu height when mounted; falls back to the estimate on first paint
      const h = menuRef?.current?.offsetHeight || estH
      const wantLeft = align === "right" ? r.right - w : r.left
      const left = Math.max(8, Math.min(wantLeft, vw - w - 8))
      const below = r.bottom + 8
      const top = below + h + 8 <= vh ? below : Math.max(8, r.top - h - 8)
      setPos({ top, left })
    }
    place()
    // Re-place once mounted so the measured (not estimated) height applies
    const raf = requestAnimationFrame(place)
    window.addEventListener("scroll", place, true)
    window.addEventListener("resize", place)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place) }
  }, [open, anchor, w, menuRef, estH, align])
  return pos
}

function CompanyPicker({ row, companies, anchorRef, onSelect, onClose }: { row: any; companies: any[]; anchorRef: React.RefObject<HTMLButtonElement | null>; onSelect: (v: { company_id?: string }) => void; onClose: () => void }) {
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

function RowMenu({ row, idx, total, onMove, onDelete, onMarkRow }: { row: any; idx: number; total: number; onMove: (dir: -1 | 1) => void; onDelete: () => void; onMarkRow: (mark: boolean) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigRef = useRef<HTMLButtonElement>(null)
  const menuPos = useFloatPos(trigRef, open, 190, ref, 320)
  // Pantalla chica o táctil: el menú flota como bottom-sheet (inmune a
  // portales mal posicionados tras scroll/zoom en Chromium móvil).
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

// Numeric stepper with theme arrows (no native spinners).
function NumberStepper({ value, onChange, min, max, ariaLabel, className, dense }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
  ariaLabel?: string; className?: string; dense?: boolean
}) {
  const { t } = useTranslation()
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
  const btn = "flex-1 flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)] active:text-[var(--accent)] transition rounded focus-visible:outline-[var(--accent)]"
  return (
    <span className={`inline-flex items-stretch rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden ${className ?? ""}`}>
      <Input
        type="number"
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        onChange={e=>onChange(clamp(Number(e.target.value)))}
        className={`themed-number ${dense ? "h-9" : "h-11"} flex-1 min-w-0 bg-transparent border-0 text-[var(--text)] text-base px-2 focus-visible:ring-0 focus-visible:outline-none`}
      />
      <span className="flex flex-col w-6 shrink-0 border-l border-[var(--border)]" role="group" aria-label={ariaLabel}>
        <button type="button" aria-label={t("common.increase")} onClick={()=>onChange(clamp(value + 1))} className={btn}><ChevronUp size={12}/></button>
        <button type="button" aria-label={t("common.decrease")} onClick={()=>onChange(clamp(value - 1))} className={`${btn} border-t border-[var(--border)]`}><ChevronDown size={12}/></button>
      </span>
    </span>
  )
}

function RowTextCell({ row, field, onSave }: { row: any; field: "assignee" | "note"; onSave: (v: string) => void }) {
  const { t } = useTranslation()
  const [v, setV] = useState(row?.[field] ?? "")
  useEffect(()=> setV(row?.[field] ?? ""), [row?.id, row?.[field]])
  return <input aria-label={t(field === "assignee" ? "editor.table.responsibleAria" : "editor.table.notesAria")} value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!== (row?.[field] ?? "")) onSave(v)}} onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }} placeholder="—" className="w-full min-w-0 max-w-full min-h-[44px] px-2 py-1 text-base border border-transparent hover:border-[var(--sheet-border)] focus:border-[var(--sheet-accent)] rounded focus:outline-none bg-transparent text-[#1e293b]" />
}

// Draggable Excel-style handle on the grid lines.
// axis x = borde derecho (ancho de columna), axis y = borde inferior (alto de row).
// Reports hover and drag to paint the full-length guide (one same column/row).
function DragHandle({ axis, title, zoom, startV, min, onV, onReset, onHover, onDrag }: {
  axis: "x" | "y"; title: string; zoom: number; startV: number; min: number;
  onV: (v: number) => void; onReset: () => void;
  onHover?: (active: boolean) => void; onDrag?: (active: boolean) => void
}) {
  const st = useRef<{ p: number; v: number; dragging: boolean } | null>(null)
  const [on, setOn] = useState(false)
  const end = (notify = true) => {
    const was = st.current !== null
    const dragged = st.current?.dragging ?? false
    st.current = null
    setOn(false)
    if (was && dragged && notify) onDrag?.(false)
  }
  const pos = axis === "x"
    ? "top-0 bottom-0 -right-[12px] w-[25px] cursor-col-resize"
    : "left-0 right-0 -bottom-[12px] h-[25px] cursor-row-resize"
  const line = axis === "x"
    ? "absolute inset-y-0 left-1/2 -ml-px w-[2px]"
    : "absolute inset-x-0 top-1/2 -mt-px h-[2px]"
  return (
    <span
      title={title}
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(startV)}
      aria-valuemin={min}
      aria-label={title}
      tabIndex={0}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); onV(Math.max(min, startV - 4)) }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); onV(startV + 4) }
        else if (e.key === "Home") { e.preventDefault(); onReset() }
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onDoubleClick={(e) => { e.stopPropagation(); onReset() }}
      onPointerDown={(e) => {
        // Solo registrar: el preventDefault/captura van al superar el umbral
        // (ver onPointerMove). Así un tap sobre el handle llega como click.
        const parent = (e.currentTarget as HTMLElement).parentElement
        const rect = parent?.getBoundingClientRect()
        const measured = rect ? (axis === "x" ? rect.width : rect.height) / (zoom || 1) : 0
        st.current = { p: axis === "x" ? e.clientX : e.clientY, v: measured > 0 ? measured : startV, dragging: false }
        e.stopPropagation()
      }}
      onPointerMove={(e) => {
        const s = st.current
        if (!s) return
        const d = ((axis === "x" ? e.clientX : e.clientY) - s.p) / (zoom || 1)
        if (!s.dragging) {
          if (Math.abs(d) < 6) return // umbral táctil: aún puede ser un tap
          s.dragging = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId)
          setOn(true)
          onDrag?.(true)
          e.preventDefault()
        }
        onV(Math.max(min, Math.round(s.v + d)))
      }}
      onPointerUp={(e) => { end(); try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } }}
      onPointerCancel={() => end()}
      className={`absolute ${pos} z-10 touch-none group/handle focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded [@media(hover:none)]:hidden`}
    >
      <span className={`${line} ${on ? "bg-[var(--accent)]" : "bg-transparent group-hover/handle:bg-[var(--accent)] [@media(hover:none)]:bg-[var(--accent)]/30"} transition-colors`} />
    </span>
  )
}

const ZOOM_STEPS = [0.5, 0.6, 0.75, 1, 1.25, 1.5]
const defaultZoom = () => 1
const monthKey = (y: number, mi: number) => `m:${y}:${mi + 1}`

export function Editor() {
  const { t } = useTranslation()
  const { id } = useParams()
  const qc = useQueryClient()
  const settings = useSettingsStore()
  const header = useEditorHeaderStore()
  const MONTHS = t("editor.months", { returnObjects: true }) as string[]
  const recordId = id
  const pickBtnRef = useRef<HTMLButtonElement | null>(null)
  // Draft mode: /editor without :id opens a blank sheet that lives only in
  // local cache. Zero server writes until the user hits Guardar. Opened files
  // keep the existing autosave behavior.
  const isDraft = !recordId
  // Autosave (device-local setting): when OFF, file edits stay local until Guardar
  const persist = <T,>(fn: () => Promise<T>): Promise<T | null> =>
    (isDraft || settings.autosave === false) ? Promise.resolve(null) : fn()
  const localOnly = isDraft || settings.autosave === false
  // Last server-confirmed state, for reconciling on Guardar with autosave OFF
  // (effect placed after the queries — see below)
  const savedRef = useRef<HistorySnapshot | null>(null)
  const [pickRowId, setPickRowId] = useState<string | null>(null)
  const [scaleStart, setScaleStart] = useState(currentYear())
  const [scaleEnd, setScaleEnd] = useState(currentYear())
  const [typeDraft, setTypeDraft] = useState("")
  const [panelTab, setPanelTab] = useState<"table" | "design">("table")
  const [mPanel, setMPanel] = useState(false)
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical")
  const [preview, setPreview] = useState(false)
  // Active stamping person (PERSON_COLORS index). Device-local:
  // se guarda en localStorage, no en el backend.
  const [personIdx, setPersonIdx] = useState(0)
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(`patty-person-${recordId}`) ?? 0)
      setPersonIdx(Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
    } catch { setPersonIdx(0) }
  }, [recordId])
  const choosePerson = (i: number) => {
    setPersonIdx(i)
    try { localStorage.setItem(`patty-person-${recordId}`, String(i)) } catch { /* noop */ }
  }
  const pastLen = useHistoryStore((s) => s.past.length)
  const futureLen = useHistoryStore((s) => s.future.length)
  const undoTip = useHistoryStore((s) => (s.past.length ? s.past[s.past.length - 1].label : null))
  const redoTip = useHistoryStore((s) => (s.future.length ? s.future[s.future.length - 1].label : null))
  const [zoom, setZoom] = useState(1)
  // Whole-sheet zoom via the CSS `zoom` property (not `transform: scale`):
  // zoom participates in layout, so touch hit-testing stays aligned with
  // the rendered pixels even inside nested scroll containers on mobile
  // (transform creates a compositor layer whose touch coordinates drift
  // horizontally after scrolling on Chromium Android).
  const stepZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.reduce((best, v, idx) => (Math.abs(v - zoom) < Math.abs(ZOOM_STEPS[best] - zoom) ? idx : best), 0)
    const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + dir))
    changeZoom(ZOOM_STEPS[next])
  }
  const sheetBase = orientation === "horizontal" ? { w: 1273, h: 900 } : { w: 900, h: 1273 }
  const rightOpen = useUiStore((s) => s.rightOpen)
  const setRightOpen = useUiStore((s) => s.setRightOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const rightCollapsed = !rightOpen
  const setRightCollapsed = (v: boolean) => setRightOpen(!v)
  const { data: record, isPending: recPending, isError: recError, refetch: recRefetch } = useQuery({ queryKey: ["record", recordId], enabled: !!recordId, queryFn: async () => (await api.get(`/records/${recordId}`)).data })
  const { data: rows, isPending: rowsPending, isError: rowsError, refetch: rowsRefetch } = useQuery({ queryKey: ["rows", recordId], enabled: !!recordId, queryFn: async () => (await api.get(`/records/${recordId}/rows`)).data })
  const { data: cells, isError: cellsError, refetch: cellsRefetch } = useQuery({ queryKey: ["cells", recordId], enabled: !!recordId, queryFn: async () => (await api.get(`/records/${recordId}/cells`)).data })
  const { data: statsData } = useQuery({ queryKey: ["stats", recordId], enabled: !!recordId, queryFn: async () => (await api.get(`/records/${recordId}/stats`)).data })
  // Draft: compute progress locally so the summary block works before Guardar
  const stats = isDraft
    ? (() => {
        const list = ((cells as any[]) ?? [])
        const total = list.length
        const reviewed = list.filter((c: any) => c.reviewed).length
        return total ? { total, reviewed, pending: total - reviewed, progress: Math.round((reviewed / total) * 100) } : null
      })()
    : statsData
  const { data: companies, isError: companiesError, refetch: companiesRefetch } = useQuery({ queryKey: ["companies"], queryFn: async () => (await api.get("/companies")).data })
  const { data: design } = useQuery({ queryKey: ["design", recordId], enabled: !!recordId, queryFn: async () => (await api.get(`/records/${recordId}/layout`)).data })
  useEffect(() => {
    if (!isDraft && record && rows && cells && !savedRef.current) {
      savedRef.current = {
        label: "saved",
        rows: qc.getQueryData(["rows", recordId]),
        cells: qc.getQueryData(["cells", recordId]),
        record: qc.getQueryData(["record", recordId]),
      }
    }
  }, [isDraft, record, rows, cells])
  const designPayload = (sec: "sheet" | "table"): any =>
    ((design as any[]) ?? []).find((d: any) => d.section === sec)?.payload ?? {}
  const colWidths: Record<string, number> = designPayload("table").cols ?? {}
  const rowHeights: Record<string, number> = designPayload("table").rows ?? {}
  const designTimers = useRef<{ sheet?: any; table?: any }>({})
  useEffect(() => () => { clearTimeout(designTimers.current.sheet); clearTimeout(designTimers.current.table) }, [recordId])
  const schedulePutDesign = (section: "sheet" | "table") => {
    if (isDraft) return // draft layout lives in cache until Guardar
    clearTimeout(designTimers.current[section])
    designTimers.current[section] = setTimeout(async () => {
      try {
        const cur = ((qc.getQueryData(["design", recordId]) as any[]) ?? []).find((d: any) => d.section === section)
        await api.put(`/records/${recordId}/layout`, { section, payload: cur?.payload ?? {} })
      } catch { /* best-effort: stays cached and retries on the next change */ }
    }, 500)
  }
  const patchDesign = (section: "sheet" | "table", fn: (p: any) => any) => {
    const cur = ((qc.getQueryData(["design", recordId]) as any[]) ?? []).slice()
    const i = cur.findIndex((d: any) => d.section === section)
    if (i >= 0) cur[i] = { ...cur[i], payload: fn(cur[i].payload ?? {}) }
    else cur.push({ section, payload: fn({}), updated_at: new Date().toISOString() })
    qc.setQueryData(["design", recordId], cur)
    schedulePutDesign(section)
  }
  const changeOrientation = (o: "vertical" | "horizontal") => {
    setOrientation(o)
    setZoom(1)
    patchDesign("sheet", (p) => ({ ...p, orientation: o, zoom: 1 }))
  }
  const changeZoom = (z: number) => {
    setZoom(z)
    patchDesign("sheet", (p) => ({ ...p, orientation, zoom: z }))
  }
  const designInit = useRef<string | null>(null)
  useEffect(() => {
    if (!design || !recordId || designInit.current === recordId) return
    designInit.current = recordId
    const h = designPayload("sheet")
    if (h.orientation === "vertical" || h.orientation === "horizontal") setOrientation(h.orientation)
    if (typeof h.zoom === "number" && h.zoom >= 0.5 && h.zoom <= 1.5) setZoom(h.zoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, recordId])
  // Fixed layout: every column always carries an explicit width (custom or default),
  // so the table measures exactly its content and never stretches columns to fill.
  const COL_DEFAULTS: Record<string, number> = { n: 44, company: 160, assignee: 90, notes: 140 }
  const MONTH_DEFAULT = 34
  const colStyle = (key: string) => {
    const w = colWidths[key] ?? COL_DEFAULTS[key] ?? 0
    return (w ? { width: w, minWidth: w, maxWidth: w } : undefined) as any
  }
  const monthClass = (_key: string) => `flex-none text-center relative`
  const monthStyle = (key: string) => ({ width: colWidths[key] ?? MONTH_DEFAULT }) as any
  const yearWidth = (y: number) => MONTHS.reduce((a: number, _, mi: number) => a + (colWidths[monthKey(y, mi)] ?? MONTH_DEFAULT), 0)
  const resizeCol = (key: string, w: number) =>
    patchDesign("table", (p) => ({ ...p, cols: { ...p.cols, [key]: w } }))
  const resetCol = (key: string) =>
    patchDesign("table", (p) => { const cols = { ...p.cols }; delete cols[key]; return { ...p, cols } })
  const resizeRow = (rowId: string, h: number) =>
    patchDesign("table", (p) => ({ ...p, rows: { ...p.rows, [rowId]: h } }))
  const resetRow = (rowId: string) =>
    patchDesign("table", (p) => { const keptRows = { ...p.rows }; delete keptRows[rowId]; return { ...p, rows: keptRows } })
  // Whole month-block resize: distribute the target total proportionally.
  const BLOCK_KEY = "years"
  const resizeBlock = (totalW: number) => {
    const cur = Math.max(monthSum, 1)
    patchDesign("table", (p) => {
      const cols = { ...p.cols }
      for (const y of years) for (let mi = 0; mi < 12; mi++) {
        const k = monthKey(y, mi)
        cols[k] = Math.max(24, Math.round(((cols[k] ?? 34) / cur) * totalW))
      }
      return { ...p, cols }
    })
  }
  const resetBlock = () =>
    patchDesign("table", (p) => {
      const cols = { ...p.cols }
      for (const y of years) for (let mi = 0; mi < 12; mi++) delete cols[monthKey(y, mi)]
      return { ...p, cols }
    })
  // Full-length guide (one same column/row) on hover or drag, theme accent color
  const [hoverGuide, setHoverGuide] = useState<{ axis: "x" | "y"; key: string } | null>(null)
  const [dragGuide, setDragGuide] = useState<{ axis: "x" | "y"; key: string } | null>(null)
  const activeGuide = dragGuide ?? hoverGuide
  const guideProps = (axis: "x" | "y", key: string) => ({
    onHover: (a: boolean) => setHoverGuide(a ? { axis, key } : (g) => (g && g.axis === axis && g.key === key ? null : g)),
    onDrag: (a: boolean) => setDragGuide(a ? { axis, key } : (g) => (g && g.axis === axis && g.key === key ? null : g)),
  })
  const GUIDE = "var(--accent)"
  // Even 2px guide with inset shadow (no layout shift): each cell paints its
  // segment and reads as a continuous line from header to last row / column.
  const guideShadowX = (key: string) =>
    (guideCol(key) ? { boxShadow: `inset -2px 0 0 ${GUIDE}` } : null) as any
  const guideShadowY = (rowId: string) =>
    (guideRow(rowId) ? { boxShadow: `inset 0 -2px 0 ${GUIDE}` } : null) as any
  const guideBlock = activeGuide?.axis === "x" && activeGuide.key === BLOCK_KEY
  // Block guide: single right-edge vertical (where the handle is), header to last row.
  const guideShadowBlock = (guideBlock ? { boxShadow: `inset -2px 0 0 ${GUIDE}` } : null) as any
  const guideCol = (key: string) => activeGuide?.axis === "x" && activeGuide.key === key
  const guideRow = (rowId: string) => activeGuide?.axis === "y" && activeGuide.key === rowId
  const HEADER_KEY = "header"
  const headerH: number | undefined = rowHeights[HEADER_KEY]
  // Celda seleccionada (foco para recolorear desde el panel sin desmarcar).
  // Cleared when toggling a checkbox, on Esc, in preview, or when clicking outside selection/palette.
  const [selCell, setSelCell] = useState<{ rowId: string; year: number; month: number } | null>(null)
  useEffect(() => {
    const h = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest?.("[data-sel-zone]")) return
      setSelCell((s) => (s ? null : s))
    }
    document.addEventListener("pointerdown", h)
    return () => document.removeEventListener("pointerdown", h)
  }, [])
  useEffect(() => { if (record) { setScaleStart(record.period_start); setScaleEnd(record.period_end); setTypeDraft(record.review_type ?? "") } }, [record])
  const navigate = useNavigate()
  // Seed blank draft state (record/rows/cells/design live in cache under the undefined key).
  // Idempotent by state (not by ref) so StrictMode remounts and re-runs recover.
  // Mirrors the backend _ensure_rows default: 5 empty rows.
  useEffect(() => {
    if (!isDraft) return
    const y = currentYear()
    if (!qc.getQueryData(["record", recordId])) {
      qc.setQueryData(["record", recordId], { id: "draft", title: "", review_type: "", period_start: y, period_end: y, staff_count: 2, staff_names: [] })
    }
    if (!qc.getQueryData(["rows", recordId])) {
      qc.setQueryData(["rows", recordId], Array.from({ length: 5 }, (_, i) => ({
        id: `dr-seed-${i}`, record_id: "draft", company_id: null, name_snapshot: "", position: i, assignee: "", note: "",
      })))
    }
    if (!qc.getQueryData(["cells", recordId])) qc.setQueryData(["cells", recordId], [])
    if (!qc.getQueryData(["design", recordId])) qc.setQueryData(["design", recordId], [])
    const h = useEditorHeaderStore.getState()
    if (!h.recordId) header.set({ recordId: "draft", title: "", rowCount: 5 } as any)
  }, [isDraft])
  // Local-only mode (draft, or file with autosave OFF): materialize a cell object
  // for every row x year x month so the whole sheet works exactly like a saved file
  useEffect(() => {
    if ((!isDraft && settings.autosave !== false) || !record || !rows) return
    const have = new Set(((qc.getQueryData(["cells", recordId]) as any[]) ?? []).map((c: any) => `${c.row_id}-${c.year}-${c.month}`))
    const add: any[] = []
    for (const r of (rows as any[])) {
      for (let y = record.period_start; y <= record.period_end; y++) {
        for (let m = 1; m <= 12; m++) {
          if (!have.has(`${r.id}-${y}-${m}`)) {
            add.push({ id: `dc-${r.id}-${y}-${m}`, row_id: r.id, year: y, month: m, reviewed: false, color: "" })
          }
        }
      }
    }
    if (add.length) qc.setQueryData(["cells", recordId], (old: any) => [...(old ?? []), ...add])
  }, [isDraft, settings.autosave, record, rows])
  // Draft: warn before losing unsaved work on reload/close
  useEffect(() => {
    if (!isDraft) return
    const h = (e: BeforeUnloadEvent) => {
      if (useEditorHeaderStore.getState().dirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [isDraft])
  // Draft: wipe local cache on unmount so the next new file starts blank.
  // (StrictMode remounts re-seed from scratch — nothing typed yet at that point.)
  useEffect(() => {
    if (!isDraft) return
    return () => {
      for (const k of ["record", "rows", "cells", "design"] as const) {
        qc.removeQueries({ queryKey: [k, undefined] })
      }
      useEditorHeaderStore.getState().set({ recordId: null, title: "", rowCount: 0, dirty: false } as any)
    }
  }, [isDraft])
  useEffect(() => { useHistoryStore.getState().clear() }, [recordId])
  // Riley: refresh mid-flow no pierde `dirty`
  useEffect(() => {
    if (!recordId) return
    try { if (localStorage.getItem(`patty-dirty-${recordId}`) === "1") header.setDirty(true) } catch { /* noop */ }
  }, [recordId])
  useEffect(() => {
    if (!recordId) return
    try {
      if (header.dirty) localStorage.setItem(`patty-dirty-${recordId}`, "1")
      else localStorage.removeItem(`patty-dirty-${recordId}`)
    } catch { /* noop */ }
  }, [header.dirty, recordId])

  const snapshotCurrent = (label: string): HistorySnapshot => ({
    label,
    rows: qc.getQueryData(["rows", recordId]),
    cells: qc.getQueryData(["cells", recordId]),
    record: qc.getQueryData(["record", recordId]),
  })
  const lastPush = useRef<{ label: string; at: number } | null>(null)
  const pushHistory = (label: string) => {
    const s = snapshotCurrent(label)
    // Don't push empty initial snapshots (nothing loaded yet)
    if (!s.rows && !s.cells && !s.record) return
    // Coalesce rapid consecutive stamps (undo por toggle = ruido -> un paso por ráfaga)
    const st = useHistoryStore.getState()
    const prev = lastPush.current
    const now = Date.now()
    if (prev && prev.label === label && now - prev.at < 2000 && st.past.length > 0) {
      lastPush.current = { label, at: now }
      return
    }
    lastPush.current = { label, at: now }
    st.push(s)
  }
  const applySnapshot = (s: HistorySnapshot) => {
    if (s.rows !== undefined) qc.setQueryData(["rows", recordId], s.rows)
    if (s.cells !== undefined) qc.setQueryData(["cells", recordId], s.cells)
    if (s.record !== undefined) qc.setQueryData(["record", recordId], s.record)
  }
  // Brings the server to the `target` state, using `source` (previous local state) for a minimal diff.
  const syncSnapshotToServer = async (target: HistorySnapshot, source: HistorySnapshot, force = false) => {
    if (localOnly && !force) return // undo/redo stays local until Guardar
    const tFilas: any[] = target.rows ?? []
    const sFilas: any[] = source.rows ?? []
    const tCeldas: any[] = target.cells ?? []
    const sCeldas: any[] = source.cells ?? []
    // Archivo
    const ta = target.record as any, sa = source.record as any
    if (ta && sa) {
      const patch: any = {}
      for (const k of ["title", "review_type", "period_start", "period_end", "staff_count"]) {
        if (ta[k] !== sa[k] && ta[k] !== undefined) patch[k] = ta[k]
      }
      // Arrays por valor (referencia siempre difiere): nombres del equipo.
      if (JSON.stringify(ta.staff_names ?? []) !== JSON.stringify(sa.staff_names ?? [])) {
        patch.staff_names = sanitizeStaffNames(ta.staff_names)
      }
      if (Object.keys(patch).length) {
        try { await api.put(`/records/${recordId}`, patch) } catch { /* best-effort */ }
      }
    } else if (ta && !sa) {
      const patch: any = {}
      for (const k of ["title", "review_type", "period_start", "period_end", "staff_count"]) {
        if (ta[k] !== undefined) patch[k] = ta[k]
      }
      if (ta.staff_names !== undefined) patch.staff_names = sanitizeStaffNames(ta.staff_names)
      if (Object.keys(patch).length) {
        try { await api.put(`/records/${recordId}`, patch) } catch { /* best-effort */ }
      }
    }
    // Filas eliminadas en target (sobran en servidor) -> DELETE
    const tIds = new Set(tFilas.map((f: any) => f.id))
    const sIds = new Set(sFilas.map((f: any) => f.id))
    const recreatedOldIds = new Set<string>()
    for (const f of sFilas) {
      if (!tIds.has(f.id)) {
        try { await api.delete(`/records/${recordId}/rows/${f.id}`) } catch { /* best-effort */ }
      }
    }
    // Rows missing on the server (were deleted) -> recreate
    for (const f of tFilas) {
      if (!sIds.has(f.id)) {
        recreatedOldIds.add(f.id)
        try {
          const payload: any = f.company_id ? {company_id: f.company_id } : {name: f.name_snapshot || t("editor.table.defaultRowName", { n: "" }).trim() || (i18n.language === "en" ? "Row" : "Fila") }
          const created = (await api.post(`/records/${recordId}/rows`, payload)).data
          const patch: any = {}
          if (f.assignee) patch.assignee = f.assignee
          if (f.note) patch.note = f.note
          if (Object.keys(patch).length) await api.put(`/records/${recordId}/rows/${created.id}`, patch)
          // Restaurar checks de esa row (los recreados nacen sin revisar)
          const want = tCeldas.filter((c: any) => c.row_id === f.id && c.reviewed)
          if (want.length) {
            const fresh = (await api.get(`/records/${recordId}/cells`)).data as any[]
            const byKey = new Map(fresh.filter((c: any) => c.row_id === created.id).map((c: any) => [`${c.year}-${c.month}`, c]))
            await Promise.all(want.map((w: any) => {
              const hit = byKey.get(`${w.year}-${w.month}`)
              return hit ? api.put(`/records/cells/${hit.id}`, {reviewed: true, color: w.color ?? "" }).catch(() => null) : null
            }))
          }
        } catch { /* best-effort */ }
      }
    }
    // Filas comunes con cambios -> PUT
    await Promise.all(tFilas.filter((f: any) => sIds.has(f.id)).map(async (f: any) => {
      const s = sFilas.find((x: any) => x.id === f.id)
      if (!s) return null
      const patch: any = {}
      if (f.company_id !== s.company_id) patch.company_id = f.company_id ?? ""
      if ((f.name_snapshot ?? "") !== (s.name_snapshot ?? "") && !f.company_id) patch.name = f.name_snapshot
      if ((f.assignee ?? "") !== (s.assignee ?? "")) patch.assignee = f.assignee ?? ""
      if ((f.note ?? "") !== (s.note ?? "")) patch.note = f.note ?? ""
      if (Object.keys(patch).length) {
        try { await api.put(`/records/${recordId}/rows/${f.id}`, patch) } catch { /* best-effort */ }
      }
      return null
    }))
    // Order -> reorder if the sequence changed
    const tOrder = tFilas.slice().sort((a: any, b: any) => a.position - b.position).map((f: any) => f.id).join(",")
    const sOrder = sFilas.slice().sort((a: any, b: any) => a.position - b.position).map((f: any) => f.id).join(",")
    if (tOrder && tOrder !== sOrder) {
      try { await api.post(`/records/${recordId}/rows/reorder`, {ids: tFilas.slice().sort((a: any, b: any) => a.position - b.position).map((f: any) => f.id) }) } catch { /* best-effort */ }
    }
    // Common cells (same id) with different reviewed flag or color -> PUT
    const sById = new Map(sCeldas.map((c: any) => [c.id, c]))
    const changed = tCeldas.filter((c: any) => {
      if (recreatedOldIds.has(c.row_id)) return false
      const s = sById.get(c.id)
      return s && (!!s.reviewed !== !!c.reviewed || (s.color ?? "") !== (c.color ?? ""))
    })
    if (changed.length) {
      await Promise.all(changed.map((c: any) =>
        api.put(`/records/cells/${c.id}`, {reviewed: !!c.reviewed, color: c.color ?? "" }).catch(() => null)
      ))
    }
  }
  const doUndo = async () => {
    const st = useHistoryStore.getState()
    const current = snapshotCurrent(st.undoLabel() ?? "estado actual")
    const prev = st.popUndo(current)
    if (!prev) return
    applySnapshot(prev)
    header.setDirty(true)
    try { await syncSnapshotToServer(prev, current) } finally {
      qc.invalidateQueries({ queryKey: ["rows", recordId] })
      qc.invalidateQueries({ queryKey: ["cells", recordId] })
      qc.invalidateQueries({ queryKey: ["record", recordId] })
      qc.invalidateQueries({ queryKey: ["stats", recordId] })
    }
  }
  const doRedo = async () => {
    const st = useHistoryStore.getState()
    const current = snapshotCurrent(st.redoLabel() ?? "estado actual")
    const next = st.popRedo(current)
    if (!next) return
    applySnapshot(next)
    header.setDirty(true)
    try { await syncSnapshotToServer(next, current) } finally {
      qc.invalidateQueries({ queryKey: ["rows", recordId] })
      qc.invalidateQueries({ queryKey: ["cells", recordId] })
      qc.invalidateQueries({ queryKey: ["record", recordId] })
      qc.invalidateQueries({ queryKey: ["stats", recordId] })
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (preview) { setPreview(false); return }
        if (mPanel) { setMPanel(false); return }
        if (selCell) { setSelCell(null); return }
        return
      }
      if ((e.ctrlKey || e.metaKey)) {
        const k = e.key.toLowerCase()
        if (k === "z" && !e.shiftKey) { e.preventDefault(); doUndo() }
        else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); doRedo() }
        else if (k === "s") { e.preventDefault(); saveAll() }
        else if (k === "e") { e.preventDefault(); setExportOpen((v) => !v) }
        else if (k === "p") { e.preventDefault(); setPreview((v) => !v) }
      } else if (e.key >= "1" && e.key <= "9" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null
        const editable = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
        if (!editable) {
          const n = Number(e.key) - 1
          if (n < (record?.staff_count ?? 0)) choosePerson(n)
        }
      }
    }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [preview, selCell, recordId, rows, cells, record])
  // Errores de guardado antes silenciosos (best-effort): ahora toast con código.
  // Es la única señal cuando un tap no persiste (p. ej. túnel caído).
  const mutErr = (e: any) => {
    const detail = e?.response?.data?.detail
    const code = detail?.code ? ` (${detail.code})` : e?.response ? ` (${e.response.status})` : ""
    push({ kind: "error", title: `${apiError(t, detail ?? e?.message, "errors.fallback")}${code}` })
  }
  const toggle = useMutation({
    mutationFn: async (c: any) => {
      const myColor = PERSON_COLORS[activePerson] ?? ""
      return persist(async () => {
        if (!c.reviewed) return (await api.put(`/records/cells/${c.id}`, {reviewed: true, color: myColor })).data
        const owner = PERSON_COLORS.indexOf(c.color ?? "")
        if (owner !== activePerson) return (await api.put(`/records/cells/${c.id}`, {reviewed: true, color: myColor })).data
        return (await api.put(`/records/cells/${c.id}`, {reviewed: false, color: "" })).data
      })
    },
    onMutate: async (c: any) => {
      const myColor = PERSON_COLORS[activePerson] ?? ""
      const owner = PERSON_COLORS.indexOf(c?.color ?? "")
      const action = !c?.reviewed ? "mark" : (owner !== activePerson ? "recolor" : "unmark")
      const color = action === "unmark" ? "" : myColor
      pushHistory(action === "mark" ? t("editor.history.markAs", { who: personName(staffNames, activePerson) }) : action === "recolor" ? t("editor.history.recolor", { from: personName(staffNames, owner), to: personName(staffNames, activePerson) }) : t("editor.history.unmark"))
      header.setDirty(true)
      await qc.cancelQueries({ queryKey: ["cells", recordId] })
      const prev = qc.getQueryData(["cells", recordId])
      qc.setQueryData(["cells", recordId], (old: any) => (old ?? []).map((x: any) => x.id === c.id ? { ...x, reviewed: action !== "unmark", color } : x))
      return { prev }
    },
    onError: (e, _c, ctx: any) => { if (ctx?.prev) qc.setQueryData(["cells", recordId], ctx.prev); mutErr(e) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["cells", recordId] }); qc.invalidateQueries({ queryKey: ["stats", recordId] }) },
  })
  // Recolor the selected cell from the panel (stamps when empty, never unstamps)
  const recolor = useMutation({
    mutationFn: async ({ cellId, color }: { cellId: string; color: string }) => persist(() => api.put(`/records/cells/${cellId}`, {reviewed: true, color }).then(r => r.data)),
    onMutate: async (v: { cellId: string; color: string }) => {
      await qc.cancelQueries({ queryKey: ["cells", recordId] })
      const prev = qc.getQueryData(["cells", recordId])
      const cur = ((prev as any[]) ?? []).find((x: any) => x.id === v.cellId)
      const from = PERSON_COLORS.indexOf(cur?.color ?? "")
      const to = PERSON_COLORS.indexOf(v.color)
      pushHistory(cur?.reviewed ? t("editor.history.recolor", { from: from >= 0 ? personName(staffNames, from) : "", to: personName(staffNames, to) }) : t("editor.history.markAs", { who: personName(staffNames, to) }))
      header.setDirty(true)
      qc.setQueryData(["cells", recordId], (old: any) => (old ?? []).map((x: any) => x.id === v.cellId ? { ...x, reviewed: true, color: v.color } : x))
      return { prev }
    },
    onError: (e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(["cells", recordId], ctx.prev); mutErr(e) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["cells", recordId] }); qc.invalidateQueries({ queryKey: ["stats", recordId] }) },
  })
  // Draft: apply row/record operations to local cache (mirrors server semantics)
  const companyNameOf = (companyId?: string) =>
    ((companies as any[]) ?? []).find((e: any) => e.id === companyId)?.name ?? ""
  const draftApplyRow = (p: any) => {
    const rowsNow = ((qc.getQueryData(["rows", recordId]) as any[]) ?? []).slice()
    const name = p.company_id ? companyNameOf(p.company_id) : (p.name ?? "").trim()
    const row = { id: `dr-${Date.now().toString(36)}-${rowsNow.length}`, record_id: "draft", company_id: p.company_id ?? null, name_snapshot: name, position: rowsNow.length, assignee: "", note: "" }
    qc.setQueryData(["rows", recordId], [...rowsNow, row])
  }
  const draftApplyRowPatch = (rowId: string, patch: any) => {
    qc.setQueryData(["rows", recordId], (old: any) => (old ?? []).map((f: any) => {
      if (f.id !== rowId) return f
      const next = { ...f }
      if (patch.company_id !== undefined) {
        next.company_id = patch.company_id || null
        if (patch.company_id) next.name_snapshot = companyNameOf(patch.company_id)
        else if (patch.name !== undefined) next.name_snapshot = patch.name
      } else if (patch.name !== undefined) next.name_snapshot = patch.name
      if (patch.assignee !== undefined) next.assignee = patch.assignee
      if (patch.note !== undefined) next.note = patch.note
      return next
    }))
  }
  const draftDeleteRow = (rowId: string) => {
    qc.setQueryData(["rows", recordId], (old: any) => (old ?? []).filter((f: any) => f.id !== rowId))
    qc.setQueryData(["cells", recordId], (old: any) => (old ?? []).filter((c: any) => c.row_id !== rowId))
  }
  const draftApplyRecord = (patch: any) => {
    qc.setQueryData(["record", recordId], (old: any) => ({ ...old, ...patch }))
  }
  const addRow = useMutation({ mutationFn: async (p:any) => persist(() => api.post(`/records/${recordId}/rows`, p).then(r => r.data)), onMutate: (p: any) => { pushHistory(t("editor.history.addRow")); header.setDirty(true); if (isDraft) draftApplyRow(p) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["rows", recordId] }); qc.invalidateQueries({ queryKey: ["cells", recordId] }) }, onError: mutErr })
  const updateRow = useMutation({ mutationFn: async ({ rowId, patch }: { rowId: string; patch: any }) => persist(() => api.put(`/records/${recordId}/rows/${rowId}`, patch).then(r => r.data)), onMutate: (v: any) => { pushHistory(v?.patch?.company_id !== undefined ? t("editor.history.changeCompany") : t("editor.history.editRow")); header.setDirty(true); if (isDraft) draftApplyRowPatch(v.rowId, v.patch) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["rows", recordId] }); qc.invalidateQueries({ queryKey: ["cells", recordId] }) }, onError: mutErr })
  const deleteRow = useMutation({ mutationFn: async (rowId: string) => persist(() => api.delete(`/records/${recordId}/rows/${rowId}`)), onMutate: (rowId: string) => { pushHistory(t("editor.history.deleteRow")); header.setDirty(true); if (isDraft) draftDeleteRow(rowId) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["rows", recordId] }); qc.invalidateQueries({ queryKey: ["design", recordId] }) }, onError: mutErr })
  const applyScale = useMutation({ mutationFn: async () => persist(() => api.put(`/records/${recordId}`, {period_start: Number(scaleStart), period_end: Number(scaleEnd) }).then(r => r.data)), onMutate: () => { pushHistory(t("editor.history.changeScale")); header.setDirty(true); if (isDraft) draftApplyRecord({ period_start: Number(scaleStart), period_end: Number(scaleEnd) }) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["record", recordId] }); qc.invalidateQueries({ queryKey: ["rows", recordId] }); qc.invalidateQueries({ queryKey: ["cells", recordId] }); qc.invalidateQueries({ queryKey: ["stats", recordId] }) }, onError: mutErr })
  const updateStaff = useMutation({ mutationFn: async ({n, names}:{n:number;names?:string[]}) => persist(() => api.put(`/records/${recordId}`, {staff_count: n, ...(names ? {staff_names: names} : {}) }).then(r => r.data)), onMutate: ({n})=>{ pushHistory(t("editor.history.changeStaff")); header.setDirty(true); if (isDraft) draftApplyRecord({ staff_count: n }) }, onSuccess: (_d, {n}) => { qc.invalidateQueries({queryKey:["record",recordId]}); if (personIdx >= n) { choosePerson(Math.max(0, n - 1)); push({ kind: "info", title: t("editor.panel.staffShrunk", { who: personName(staffNames, Math.max(0, n - 1)) }) }) } }, onError: mutErr })
  const updateNames = useMutation({ mutationFn: async (names:string[]) => { const clean = sanitizeStaffNames(names); if (isDraft) { draftApplyRecord({ staff_names: clean }); return clean } return persist(() => api.put(`/records/${recordId}`, {staff_names: clean}).then(r => r.data)) }, onMutate: ()=>{ pushHistory(t("editor.history.changeNames")); header.setDirty(true) }, onSuccess: () => { qc.invalidateQueries({queryKey:["record",recordId]}) }, onError: mutErr })
  const saveType = (v:string) => { const txt = v.trim(); if (txt !== (record?.review_type ?? "")) { pushHistory(t("editor.history.changeType")); header.setDirty(true); if (isDraft) draftApplyRecord({ review_type: txt }); else persist(() => api.put(`/records/${recordId}`,{review_type:txt}).then(()=>qc.invalidateQueries({queryKey:["record",recordId]}))) } }
  const isMutating = useIsMutating()
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [validAlert, setValidAlert] = useState<any[] | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const exportPos = useFloatPos(exportBtnRef, exportOpen, 150, exportMenuRef, 120, "right")
  const [fabOpen, setFabOpen] = useState(false)
  useEffect(() => {
    if (!exportOpen) return
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false) }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setExportOpen(false) }
    const s = () => setExportOpen(false)
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    window.addEventListener("scroll", s, true)
    window.addEventListener("resize", s)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); window.removeEventListener("scroll", s, true); window.removeEventListener("resize", s) }
  }, [exportOpen])
  useEffect(() => {
    if (!fabOpen) return
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFabOpen(false) }
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("keydown", k) }
  }, [fabOpen])
  const orderedRows = ((rows as any[]) ?? []).slice().sort((a: any, b: any) => a.position - b.position)
  // required for save/export: every row needs a registered company (months can be filled freely)
  // Regla compartida con backend/movil: packages/validation (mismo codigo, mismos vectores).
  const missingCompany = () => findRowsMissingCompany(orderedRows)
  const { push } = useToast()
  // A seeded empty row carries nothing to persist (no company/name/marks/text)
  const isPristineRow = (f: any, cellList: any[]) =>
    !f.company_id && !(f.name_snapshot ?? "").trim() && !(f.assignee ?? "").trim() && !(f.note ?? "").trim() &&
    !cellList.some((c: any) => c.row_id === f.id && (c.reviewed || c.color))
  // Draft persist: creates the whole sheet on the server in one chain.
  // Returns the new record id, or null when validation stopped the flow.
  // Throws on network/server failure (caller reports with its own retry).
  // Pristine seeded rows are skipped (backend regenerates defaults on open).
  const persistDraft = async (): Promise<{ id: string; title: string } | null> => {
    const title = ((record as any)?.title ?? "").trim()
    if (!title) { push({ kind: "error", title: t("editor.draft.titleRequired") }); return null }
    const draftCells = ((qc.getQueryData(["cells", recordId]) as any[]) ?? [])
    const savable = orderedRows.filter((f: any) => !isPristineRow(f, draftCells))
    const miss = findRowsMissingCompany(orderedRows, { skip: (f: any) => isPristineRow(f, draftCells) })
    if (miss.length) { setValidAlert(miss); return null }
    setSaveState("saving")
    try {
      const rec = (await api.post("/records", {
        title,
        review_type: (record as any)?.review_type ?? "",
        period_start: (record as any)?.period_start ?? currentYear(),
        period_end: (record as any)?.period_end ?? currentYear(),
        staff_count: (record as any)?.staff_count ?? 2,
        staff_names: sanitizeStaffNames((record as any)?.staff_names),
      })).data
      const idMap = new Map<string, string>()
      for (const f of savable) {
        const payload: any = f.company_id ? { company_id: f.company_id } : { name: f.name_snapshot }
        const created = (await api.post(`/records/${rec.id}/rows`, payload)).data
        idMap.set(f.id, created.id)
        const patch: any = {}
        if (f.assignee) patch.assignee = f.assignee
        if (f.note) patch.note = f.note
        if (Object.keys(patch).length) await api.put(`/records/${rec.id}/rows/${created.id}`, patch)
      }
      // The backend seeds 5 empty rows on record creation: drop the pristine ones
      // so the file keeps exactly the rows the user saved (created rows all
      // carry a company, enforced above, so only backend defaults match).
      const created = (await api.get(`/records/${rec.id}/rows`)).data as any[]
      await Promise.all(created.filter((r: any) =>
        !r.company_id && !(r.name_snapshot ?? "").trim() && !(r.assignee ?? "").trim() && !(r.note ?? "").trim()
      ).map((r: any) => api.delete(`/records/${rec.id}/rows/${r.id}`).catch(() => null)))
      const fresh = (await api.get(`/records/${rec.id}/cells`)).data as any[]
      const freshByKey = new Map(fresh.map((c: any) => [`${c.row_id}-${c.year}-${c.month}`, c]))
      const groups = new Map<string, { reviewed: boolean; color: string; keys: string[] }>()
      for (const c of ((qc.getQueryData(["cells", recordId]) as any[]) ?? [])) {
        if (!c.reviewed && !c.color) continue
        const newRowId = idMap.get(c.row_id)
        if (!newRowId) continue
        const gk = `${!!c.reviewed}|${c.color ?? ""}`
        if (!groups.has(gk)) groups.set(gk, { reviewed: !!c.reviewed, color: c.color ?? "", keys: [] })
        groups.get(gk)!.keys.push(`${newRowId}-${c.year}-${c.month}`)
      }
      for (const g of groups.values()) {
        const ids = g.keys.map(k => freshByKey.get(k)?.id).filter(Boolean)
        if (ids.length) await api.post(`/records/${rec.id}/cells/bulk`, { ids, reviewed: g.reviewed, color: g.color })
      }
      for (const sec of ["sheet", "table"] as const) {
        const entry = ((qc.getQueryData(["design", recordId]) as any[]) ?? []).find((d: any) => d.section === sec)
        if (entry && Object.keys(entry.payload ?? {}).length) {
          await api.put(`/records/${rec.id}/layout`, { section: sec, payload: entry.payload })
        }
      }
      try { localStorage.removeItem(`patty-dirty-undefined`) } catch { /* noop */ }
      qc.invalidateQueries({ queryKey: ["records"] })
      return { id: rec.id, title }
    } catch (e) {
      setSaveState("idle")
      throw e
    }
  }
  const saveDraft = async () => {
    try {
      const r = await persistDraft()
      if (!r) return
      setSaveState("saved")
      push({ kind: "success", title: t("common.savedOk") })
      navigate(`/editor/${r.id}`, { replace: true })
    } catch {
      setSaveState("idle")
      push({ kind: "error", title: t("common.saveError"), actionLabel: t("common.retry"), onAction: () => saveDraft() })
    }
  }
  const downloadSaved = async (id: string, title: string, fmt: "pdf" | "excel") => {
    try {
      const res = await api.get(`/records/${id}/export?format=${fmt}&lang=${i18n.language}`, { responseType: "blob" })
      downloadBlob(res.data, exportFilename(title, fmt === "pdf" ? "pdf" : "xlsx"))
      push({ kind: "success", title: t("common.exportOk") })
    } catch {
      push({ kind: "error", title: t("common.exportError"), actionLabel: t("common.retry"), onAction: () => downloadSaved(id, title, fmt) })
    }
  }
  // Draft export: save first (same validations), then download, then land on the file
  const draftExport = async (fmt: "pdf" | "excel") => {
    const draftCells = ((qc.getQueryData(["cells", recordId]) as any[]) ?? [])
    const savable = orderedRows.filter((f: any) => !isPristineRow(f, draftCells))
    if (!savable.length && orderedRows.length) {
      setValidAlert(findRowsMissingCompany(orderedRows))
      return
    }
    let r: { id: string; title: string } | null
    try {
      r = await persistDraft()
      if (!r) return
    } catch {
      setSaveState("idle")
      push({ kind: "error", title: t("common.saveError"), actionLabel: t("common.retry"), onAction: () => draftExport(fmt) })
      return
    }
    await downloadSaved(r.id, r.title, fmt)
    setSaveState("idle")
    navigate(`/editor/${r.id}`, { replace: true })
  }
  const saveAll = async () => {
    if (isDraft) { await saveDraft(); return }
    const miss = missingCompany()
    if (miss.length) { setValidAlert(miss); return }
    setSaveState("saving")
    try {
      if (settings.autosave === false) {
        // Manual mode: reconcile local cache against the last server-confirmed state
        const cur = snapshotCurrent("save")
        await syncSnapshotToServer(cur, savedRef.current ?? { label: "", rows: [], cells: [], record: undefined }, true)
      } else {
        // Autosave honesto: el título/tipo/escala ya hacen PUT al editar.
        // Guardar persiste el layout pendiente y revalida contra servidor.
        const pending = (designTimers.current.sheet || designTimers.current.table)
        if (pending) await new Promise((r) => setTimeout(r, 550))
      }
      await Promise.all([
        qc.refetchQueries({ queryKey: ["record", recordId] }),
        qc.refetchQueries({ queryKey: ["rows", recordId] }),
        qc.refetchQueries({ queryKey: ["cells", recordId] }),
        qc.refetchQueries({ queryKey: ["stats", recordId] }),
      ])
      savedRef.current = {
        label: "saved",
        rows: qc.getQueryData(["rows", recordId]),
        cells: qc.getQueryData(["cells", recordId]),
        record: qc.getQueryData(["record", recordId]),
      }
      header.set({ dirty: false } as any)
      try { localStorage.removeItem(`patty-dirty-${recordId}`) } catch { /* noop */ }
      setSaveState("saved")
      push({ kind: "success", title: t("common.savedOk") })
      setTimeout(() => setSaveState("idle"), 2000)
    } catch {
      setSaveState("idle")
      push({ kind: "error", title: t("common.saveError"), actionLabel: t("common.retry"), onAction: () => saveAll() })
    }
  }
  const exportFile = async (fmt: "pdf" | "excel") => {
    const miss = missingCompany()
    if (miss.length) { setValidAlert(miss); return }
    try {
      push({ kind: "info", title: t("common.exportOk"), desc: t("records.downloadBase") })
      const r = await api.get(`/records/${recordId}/export?format=${fmt}&lang=${i18n.language}`, { responseType: "blob" })
      downloadBlob(r.data, exportFilename((record as any)?.title ?? t("records.downloadBase"), fmt === "pdf" ? "pdf" : "xlsx"))
    } catch (e: any) {
      const falt = e?.response?.data?.detail?.faltantes
      if (e?.response?.status === 422 && falt) setValidAlert(falt)
      else push({ kind: "error", title: t("common.exportError"), desc: e?.response?.data?.detail?.message ?? undefined, actionLabel: t("common.retry"), onAction: () => exportFile(fmt) })
    }
  }
  useEffect(()=>{ if(!record || isDraft) return; header.set({ recordId: record.id, title: record.title, rowCount: (rows as any)?.length ?? 0, dirty:false } as any)}, [record?.id, (record as any)?.title, (rows as any)?.length])
  useEffect(()=>{ if(isDraft) header.set({ rowCount: (rows as any)?.length ?? 0 } as any) }, [isDraft, (rows as any)?.length])
  useEffect(()=>{ header.set({ onSaveTitle: (v:string)=>{ if(v!==(record as any)?.title) { pushHistory(t("editor.history.changeTitle")); header.setDirty(true); if (isDraft) draftApplyRecord({ title: v }); else persist(()=>api.put(`/records/${recordId}`,{title:v}).then(()=>qc.invalidateQueries({queryKey:["record",recordId]}))) } }, onExport: (fmt:any)=>exportFile(fmt) } as any); return ()=>{ header.set({recordId:null} as any)}}, [recordId])
  if (!recordId && !isDraft) return <div className="flex-1 p-8 space-y-3" aria-hidden><div className="h-8 w-64 rounded-lg bg-[var(--surface-2)] animate-pulse" /><div className="h-96 rounded-xl bg-[var(--surface-2)] animate-pulse" /><span className="sr-only">{t("editor.creating")}</span></div>
  if (recError || rowsError) return <div className="flex-1 p-8 text-center text-sm text-[var(--text-dim)]">{t("common.loadError")} <button onClick={() => { recRefetch(); rowsRefetch() }} className="text-[var(--accent)] font-medium hover:underline ml-1">{t("common.retry")}</button></div>
  if (!record || !rows || recPending || rowsPending) return <div className="flex-1 p-8 space-y-3" aria-hidden><div className="h-8 w-64 rounded-lg bg-[var(--surface-2)] animate-pulse" /><div className="h-96 rounded-xl bg-[var(--surface-2)] animate-pulse" /><span className="sr-only">{t("editor.loading")}</span></div>
  const cellMap=new Map<string,any>(); cells?.forEach((c:any)=>cellMap.set(`${c.row_id}-${c.year}-${c.month}`,c))
  // Drafts always render Auto header (theme color): a custom header never leaks into new files
  const headerBg = isDraft ? "" : (settings.table_header_bg && settings.table_header_bg !== "#e0e7ff" ? settings.table_header_bg : "")
  const years=Array.from({length: record.period_end - record.period_start + 1}, (_,i)=>record.period_start+i)
  const monthSum = years.reduce((s: number, y: number) => s + MONTHS.reduce((a: number, _, mi: number) => a + (colWidths[monthKey(y, mi)] ?? MONTH_DEFAULT), 0), 0)

  const staffNames: string[] = Array.isArray((record as any)?.staff_names) ? (record as any).staff_names : []
  const staffOpts = Array.from({length: record.staff_count||2},(_,i)=>personName(staffNames, i))
  const activePerson = Math.min(personIdx, Math.max(0, (record?.staff_count ?? 1) - 1))
  const ownerOf = (color: string | null | undefined) => PERSON_COLORS.indexOf(color ?? "")
  const cellList: any[] = (cells as any[]) ?? []
  const selectedCell = selCell ? cellList.find((c: any) => c.row_id === selCell.rowId && c.year === selCell.year && c.month === selCell.month) : undefined
  const selectedRowName = selCell ? ((orderedRows.find((f: any) => f.id === selCell.rowId) as any)?.name_snapshot ?? "") : ""
  const markRow = async (rowId: string, mark: boolean) => {
    const myColor = PERSON_COLORS[activePerson] ?? ""
    const targets = ((qc.getQueryData(["cells", recordId]) as any[]) ?? []).filter((c: any) => c.row_id === rowId)
    if (!targets.length) return
    pushHistory(mark ? t("editor.history.markAs", { who: personName(staffNames, activePerson) }) : t("editor.history.unmark"))
    header.setDirty(true)
    qc.setQueryData(["cells", recordId], (old: any) => (old ?? []).map((x: any) => x.row_id === rowId ? { ...x, reviewed: mark, color: mark ? myColor : "" } : x))
    try {
      const rs = await persist(() => Promise.all(targets.map((c: any) => api.put(`/records/cells/${c.id}`, { reviewed: mark, color: mark ? myColor : "" }).catch(() => null))))
      if (!localOnly && rs && (rs as any[]).some((r) => r === null)) mutErr(new Error("PUT cells"))
    } catch (e) { if (!localOnly) mutErr(e) }
    qc.invalidateQueries({ queryKey: ["cells", recordId] })
    qc.invalidateQueries({ queryKey: ["stats", recordId] })
  }
  const markYear = async (year: number, mark: boolean) => {
    const myColor = PERSON_COLORS[activePerson] ?? ""
    const targets = ((qc.getQueryData(["cells", recordId]) as any[]) ?? []).filter((c: any) => c.year === year)
    if (!targets.length) return
    pushHistory(mark ? t("editor.history.markAs", { who: personName(staffNames, activePerson) }) : t("editor.history.unmark"))
    header.setDirty(true)
    qc.setQueryData(["cells", recordId], (old: any) => (old ?? []).map((x: any) => x.year === year ? { ...x, reviewed: mark, color: mark ? myColor : "" } : x))
    try {
      const rs = await persist(() => Promise.all(targets.map((c: any) => api.put(`/records/cells/${c.id}`, { reviewed: mark, color: mark ? myColor : "" }).catch(() => null))))
      if (!localOnly && rs && (rs as any[]).some((r) => r === null)) mutErr(new Error("PUT cells"))
    } catch (e) { if (!localOnly) mutErr(e) }
    qc.invalidateQueries({ queryKey: ["cells", recordId] })
    qc.invalidateQueries({ queryKey: ["stats", recordId] })
  }
  const move=(idx:number,dir:-1|1)=>{
    const o=[...orderedRows]; const to=idx+dir; if(to<0||to>=o.length) return
    const tmp=o[idx]; o[idx]=o[to]; o[to]=tmp
    const next=o.map((f:any,i:number)=>({...f,position:i}))
    const prev=qc.getQueryData(["rows",recordId])
    pushHistory(dir===-1 ? t("editor.history.moveUp") : t("editor.history.moveDown"))
    header.setDirty(true)
    qc.setQueryData(["rows",recordId], next)
    persist(() => api.post(`/records/${recordId}/rows/reorder`, {ids: next.map((f:any)=>f.id) }))
      .catch((e)=>{ if(prev) qc.setQueryData(["rows",recordId], prev); if (!localOnly) mutErr(e) })
  }

  return (
    <div className="flex flex-1 min-w-0 min-h-0 bg-[var(--bg)]">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Barra única del editor: título + vista + acciones */}
        <div className="flex items-center gap-2 px-3 h-[52px] bg-[var(--bg)] border-b border-[var(--border)] shrink-0 text-[12px] text-[var(--text-dim)] overflow-x-auto lg:overflow-visible" role="toolbar" aria-label={t("editor.toolbar.label")}>
          <button
            onClick={() => setMobileOpen(true)}
            title={t("nav.openMenu")}
            aria-label={t("nav.openMenu")}
            className="lg:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition"
          >
            <Menu size={18} />
          </button>
          {header.recordId || isDraft ? (
            <span className="flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)] focus-within:border-[var(--accent)] pl-2.5 pr-1 py-[3px] flex-1 min-w-[110px] max-w-[380px] transition shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <Pencil size={13} className="text-[var(--text-dim)] shrink-0" aria-hidden />
              <input
                value={header.title}
                onChange={e=>{ header.set({ title: e.target.value }); header.setDirty(true) }}
                onBlur={e=>header.onSaveTitle?.(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }}
                placeholder={t("editor.fileNamePh")}
                aria-label={t("editor.fileNameAria")}
                className="flex-1 min-w-0 bg-transparent px-1 py-[3px] text-base font-medium text-[var(--text)] text-left truncate focus:outline-none placeholder:text-[var(--text-dim)] placeholder:font-normal cursor-text"
              />
              <span className="hidden lg:flex items-center gap-1.5 text-[12px] text-[var(--text-dim)] shrink-0">
                <span className={`w-2 h-2 rounded-full inline-block ${header.dirty ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`} />
                {header.dirty ? t("editor.unsavedStatus") : t("editor.savedStatus")} · {t("editor.rowsCount", { count: header.rowCount })}
              </span>
            </span>
          ) : (
            <span className="flex-1 min-w-0" aria-hidden />
          )}
          <span className="hidden lg:block flex-1" aria-hidden />
          <div className="hidden lg:flex items-center gap-1 shrink-0" role="group" aria-label={t("editor.toolbar.editGroup")}>
            <div className="flex items-center gap-0.5" role="group" aria-label={t("editor.toolbar.orientation")}>
              <button onClick={()=>changeOrientation("vertical")} title={t("editor.toolbar.vertical")} aria-pressed={orientation==="vertical"} className={`w-10 h-10 flex items-center justify-center rounded-full transition ${orientation==="vertical" ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}>
                <RectangleVertical size={15}/>
              </button>
              <button onClick={()=>changeOrientation("horizontal")} title={t("editor.toolbar.horizontal")} aria-pressed={orientation==="horizontal"} className={`w-10 h-10 flex items-center justify-center rounded-full transition ${orientation==="horizontal" ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}>
                <RectangleHorizontal size={15}/>
              </button>
            </div>
            <span aria-hidden className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
            <div className="flex items-center gap-0.5" role="group" aria-label={t("editor.toolbar.zoom")}>
              <button onClick={()=>stepZoom(-1)} title={t("editor.toolbar.zoomOut")} aria-label={t("editor.toolbar.zoomOut")} className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition">
                <Minus size={15}/>
              </button>
              <button onClick={()=>changeZoom(defaultZoom())} title={t("editor.toolbar.zoomReset")} className="px-1.5 text-[11px] font-mono text-[var(--text)] hover:text-[var(--text)] min-w-[44px] min-h-[44px] text-center">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={()=>stepZoom(1)} title={t("editor.toolbar.zoomIn")} aria-label={t("editor.toolbar.zoomIn")} className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition">
                <Plus size={15}/>
              </button>
            </div>
            <span aria-hidden className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
            <div className="flex items-center gap-0.5" role="group" aria-label={t("editor.toolbar.editGroup")}>
              <button onClick={doUndo} disabled={pastLen===0} title={undoTip ? t("editor.toolbar.undoWithAction", { action: undoTip }) : t("editor.toolbar.undo") + " (Ctrl+Z)"} className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition disabled:opacity-40 disabled:hover:text-[var(--text-dim)] disabled:cursor-not-allowed" aria-label={t("editor.toolbar.undo")}><Undo2 size={15}/></button>
              <button onClick={doRedo} disabled={futureLen===0} title={redoTip ? t("editor.toolbar.redoWithAction", { action: redoTip }) : t("editor.toolbar.redo") + " (Ctrl+Y)"} className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition disabled:opacity-40 disabled:hover:text-[var(--text-dim)] disabled:cursor-not-allowed" aria-label={t("editor.toolbar.redo")}><Redo2 size={15}/></button>
              <button onClick={()=>{ setPreview(true); setSelCell(null) }} title={t("editor.toolbar.previewHint")} aria-label={t("editor.toolbar.preview")} aria-pressed={preview} className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition"><Eye size={15}/></button>
            </div>
            <span aria-hidden className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
          </div>
          <button onClick={saveAll} disabled={isMutating > 0 || saveState === "saving"} title={isDraft ? t("editor.draft.saveHint") : t("editor.toolbar.save")} className={`flex items-center gap-1.5 rounded-full px-4 min-h-[44px] text-[12px] font-medium transition border shrink-0 ${(isDraft || header.dirty) && saveState !== "saving" ? "bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] border-transparent" : saveState === "saved" ? "bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--success)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:text-[var(--text)] hover:border-[var(--accent-border)]"} disabled:opacity-50`}>
              {saveState === "saving" ? <><Save size={13}/><span className="hidden min-[420px]:inline">{t("editor.toolbar.saving")}</span></> : <>{saveState === "saved" && !header.dirty ? <Check size={13}/> : <Save size={13}/>}<span className="hidden min-[420px]:inline">{t("editor.toolbar.save")}</span></>}
          </button>
          <div ref={exportRef} className="relative shrink-0">
                          <button ref={exportBtnRef} onClick={()=>setExportOpen(!exportOpen)} title={t("editor.toolbar.export")} aria-haspopup="menu" aria-expanded={exportOpen} className="flex items-center gap-1.5 rounded-full px-4 min-h-[44px] text-[12px] font-medium bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] transition whitespace-nowrap disabled:opacity-50">
              <Download size={13}/><span className="hidden min-[420px]:inline">{t("editor.toolbar.export")}</span> <span className="text-[10px]">▾</span>
            </button>
            {exportOpen && exportPos && createPortal(
              <div ref={exportMenuRef} role="menu" aria-label={t("editor.toolbar.export")} style={{ position: "fixed", top: exportPos.top, left: exportPos.left, width: 150, zIndex: 70 }} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-1.5">
                  <button role="menuitem" onClick={()=>{ setExportOpen(false); (isDraft ? draftExport : exportFile)("pdf") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">{t("editor.toolbar.downloadPdf")}</button>
                  <button role="menuitem" onClick={()=>{ setExportOpen(false); (isDraft ? draftExport : exportFile)("excel") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">{t("editor.toolbar.downloadExcel")}</button>
              </div>,
              document.body
            )}
          </div>
          <div className="relative shrink-0 lg:hidden">
            <button onClick={()=>{ setMPanel(true); setFabOpen(false) }} title={t("editor.panel.label")} aria-label={t("editor.panel.label")} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] transition">
              <Settings2 size={16}/>
            </button>
          </div>
        </div>
        <div className="flex flex-1 min-w-0 min-h-0">
        {/* Canvas — white page like Foliora */}
        <div className="flex-1 bg-[var(--bg)] flex flex-col min-w-0 overflow-auto">
        <div className="flex-1 min-w-0 p-6 overflow-auto bg-[var(--bg)]">
          {preview && (
            <>
              <div className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-md" onClick={()=>setPreview(false)} aria-hidden />
              <button onClick={()=>setPreview(false)} title={t("editor.toolbar.previewHint")} className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 h-9 text-[12px] font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shadow-xl hover:border-[var(--accent-border)] transition">
                {t("editor.preview.exit")} <span className="text-[10px] text-[var(--text-dim)]">{t("editor.preview.esc")}</span>
              </button>
            </>
          )}
          <div className="max-w-none mx-auto w-fit">
          <div style={{ width: sheetBase.w, minHeight: sheetBase.h, zoom }} className={`bg-white [color-scheme:light] shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-lg overflow-clip transition-[box-shadow,opacity] duration-200 relative ${preview ? "z-50 ring-2 ring-[var(--accent-border)]" : ""}`}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3 text-xs">
                {record.review_type ? <span className="px-2 py-1 rounded bg-[var(--sheet-soft)] border border-[var(--sheet-border)] text-[var(--sheet-ink)]">{record.review_type}</span> : null}
                <span className="text-[var(--text-dim)]">{record.period_start} — {record.period_end} • {t("editor.rowsCount", { count: (rows as any)?.length ?? 0 })}</span>
              </div>
              <div className="flex items-center gap-3 mb-3 px-3 py-1.5 text-[11px] text-[var(--sheet-ink)]" aria-label={t("editor.table.legend")}>
                <span className="font-semibold shrink-0">{t("editor.table.legend")}</span>
                <span className="flex items-center gap-2 flex-wrap">
                  {staffOpts.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: PERSON_COLORS[i] }} />
                      {p}
                    </span>
                  ))}
                </span>
              </div>
              {settings.show_summary && stats && (
                <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-[var(--sheet-soft)] border border-[var(--sheet-border)] text-[11px]">
                  <span className="flex items-center gap-1.5 text-[var(--success)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"/>{t("editor.panel.summaryReviewed")} <b>{stats.reviewed}/{stats.total || rows.length}</b></span>
                  <span className="flex items-center gap-1.5 text-[var(--warning)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]"/>{t("editor.panel.summaryPending")} <b>{stats.pending}</b></span>
                  <span className="flex items-center gap-2 text-[var(--sheet-ink)] ml-auto"><span>{t("editor.panel.summaryProgress")} <b>{stats.progress}%</b></span><span className="w-24 h-1.5 bg-[var(--surface)] border border-[var(--sheet-border)] rounded-full overflow-hidden inline-block"><span className="block h-full bg-[var(--sheet-accent)]" style={{width:`${stats.progress}%`}}/></span></span>
                </div>
              )}
              {(cellsError || companiesError) && (
                <div role="alert" className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-xs text-[var(--danger)]">
                  <span>{t("common.loadError")}</span>
                  <button onClick={() => { if (cellsError) cellsRefetch(); if (companiesError) companiesRefetch() }} className="font-medium underline underline-offset-2">{t("common.retry")}</button>
                </div>
              )}
              <div className={`overflow-auto sheet-scroll ${preview ? "pointer-events-none select-none" : ""}`}>
                <table className={`text-xs border-collapse border border-[var(--sheet-border)] table-${settings.table_density} table-fixed`} style={{ width: "max-content" }} aria-readonly={preview || undefined}>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[var(--sheet-soft)] border-y border-[var(--sheet-border)]" style={headerBg ? { background: headerBg } : undefined}>
                      <th rowSpan={2} style={{ ...colStyle("n"), ...guideShadowX("n"), ...guideShadowY(HEADER_KEY) }} className="p-2 w-[44px] text-left text-[var(--sheet-ink)] font-semibold align-middle border-x border-[var(--sheet-border)] relative">{t("editor.table.numberCol")}{!preview && <DragHandle axis="x" title={t("editor.resize.colWidth")} zoom={zoom} startV={colWidths.n ?? 44} min={28} onV={(w)=>resizeCol("n", w)} onReset={()=>resetCol("n")} {...guideProps("x", "n")} />}{!preview && <DragHandle axis="y" title={t("editor.resize.headerHeight")} zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>
                      <th rowSpan={2} style={{ ...colStyle("company"), ...guideShadowX("company"), ...guideShadowY(HEADER_KEY) }} className="p-2 text-center text-[var(--sheet-ink)] font-semibold min-w-[160px] align-middle border-x border-[var(--sheet-border)] relative">{t("editor.table.company")}{!preview && <DragHandle axis="x" title={t("editor.resize.colWidth")} zoom={zoom} startV={colWidths.company ?? 160} min={60} onV={(w)=>resizeCol("company", w)} onReset={()=>resetCol("company")} {...guideProps("x", "company")} />}{!preview && <DragHandle axis="y" title={t("editor.resize.headerHeight")} zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>
                      <th colSpan={years.length * 12} style={guideShadowBlock ?? undefined} className="p-2 text-center text-[var(--sheet-ink)] font-semibold text-[12px] border-x border-[var(--sheet-border)] relative">{t("editor.table.yearMonths")}{!preview && <DragHandle axis="x" title={t("editor.resize.blockWidth")} zoom={zoom} startV={monthSum} min={16 * years.length * 12} onV={(w)=>resizeBlock(w)} onReset={()=>resetBlock()} {...guideProps("x", BLOCK_KEY)} />}</th>
                      {settings.visible_fields.assignee && <th rowSpan={2} style={{ ...colStyle("assignee"), ...guideShadowX("assignee"), ...guideShadowY(HEADER_KEY) }} className="p-2 text-center text-[var(--sheet-ink)] font-semibold align-middle min-w-[90px] border-x border-[var(--sheet-border)] relative">{t("editor.table.responsible")}{!preview && <DragHandle axis="x" title={t("editor.resize.colWidth")} zoom={zoom} startV={colWidths.assignee ?? 90} min={60} onV={(w)=>resizeCol("assignee", w)} onReset={()=>resetCol("assignee")} {...guideProps("x", "assignee")} />}{!preview && <DragHandle axis="y" title={t("editor.resize.headerHeight")} zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>}
                      {settings.visible_fields.notes && <th rowSpan={2} style={{ ...colStyle("notes"), ...guideShadowX("notes"), ...guideShadowY(HEADER_KEY) }} className="p-2 text-center text-[var(--sheet-ink)] font-semibold align-middle min-w-[140px] border-x border-[var(--sheet-border)] relative">{t("editor.table.notes")}{!preview && <DragHandle axis="x" title={t("editor.resize.colWidth")} zoom={zoom} startV={colWidths.notes ?? 140} min={60} onV={(w)=>resizeCol("notes", w)} onReset={()=>resetCol("notes")} {...guideProps("x", "notes")} />}{!preview && <DragHandle axis="y" title={t("editor.resize.headerHeight")} zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>}
                    </tr>
                    <tr style={{ ...(headerBg ? { background: headerBg } : null), ...(headerH ? { height: headerH } : null) }} className="bg-[var(--sheet-soft)] border-b border-[var(--sheet-border)]">
                      {years.map((y, yi)=>(
                        <th key={y} colSpan={12} style={{ width: yearWidth(y), ...(guideBlock && yi === years.length - 1 ? guideShadowBlock : guideShadowY(HEADER_KEY) ?? undefined) }} className="p-0 text-center text-[var(--sheet-ink)] font-semibold text-[11px] border-x border-[var(--sheet-border)] relative"><div className="pt-1 pb-0.5 border-b border-[var(--sheet-border)] flex items-center justify-center gap-1">{y}{!preview && <button onClick={(e) => { const el = e.currentTarget as HTMLButtonElement & { lpFired?: boolean }; if (el.lpFired) { el.lpFired = false; return } markYear(y, true) }} onContextMenu={(e) => { e.preventDefault(); markYear(y, false) }} onTouchStart={(e) => { const el = e.currentTarget as HTMLButtonElement & { lpTimer?: number; lpFired?: boolean }; el.lpTimer = window.setTimeout(() => { el.lpFired = true; markYear(y, false) }, 550) }} onTouchEnd={(e) => { window.clearTimeout((e.currentTarget as HTMLButtonElement & { lpTimer?: number }).lpTimer) }} onTouchMove={(e) => { window.clearTimeout((e.currentTarget as HTMLButtonElement & { lpTimer?: number }).lpTimer) }} title={`${t("editor.table.markYear", { year: y })} · ${t("editor.table.unmarkYear", { year: y })}`} aria-label={t("editor.table.markYear", { year: y })} className="w-6 h-6 [@media(hover:none)]:w-11 [@media(hover:none)]:h-11 grid place-items-center rounded text-[10px] text-[var(--sheet-ink)]/60 hover:text-[var(--sheet-ink)] hover:bg-[var(--sheet-soft)]">✓</button>}</div><div className="flex items-stretch text-[10px] font-medium tracking-wide text-[var(--sheet-ink)]">{MONTHS.map((m, mi)=> {
                          const mk = monthKey(y, mi)
                          return <span key={`${y}-${mi}-${m}`} style={{ ...monthStyle(mk), ...guideShadowX(mk), ...(guideRow(HEADER_KEY) ? { borderLeftColor: GUIDE } : null) }} className={`${monthClass(mk)} flex items-center justify-center ${mi === 0 ? "border-l-0" : "border-l border-[var(--sheet-border)]"}`}>{m}{!preview && <DragHandle axis="x" title={t("editor.resize.monthWidth")} zoom={zoom} startV={colWidths[mk] ?? 20} min={16} onV={(w)=>resizeCol(mk, w)} onReset={()=>resetCol(mk)} {...guideProps("x", mk)} />}</span>
                        })}</div>
                          {!preview && <DragHandle axis="y" title={t("editor.resize.headerHeight")} zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length===0 ? (
                      <tr><td colSpan={2 + years.length*12 + (settings.visible_fields.assignee?1:0) + (settings.visible_fields.notes?1:0)} className="p-12 text-center text-[var(--text-dim)]"><div className="text-sm">{t("editor.table.blank")}</div></td></tr>
                    ) : (
                      rows.slice().sort((a:any,b:any)=>a.position-b.position).map((row:any, idx:number)=>(
                        <tr key={row.id} style={rowHeights[row.id] ? { height: rowHeights[row.id] } : undefined} className="border-t border-b border-[var(--sheet-border)] hover:bg-[var(--sheet-soft)]">
                          <td className="p-2 text-center text-[var(--text-dim)] text-xs relative group border-x border-[var(--sheet-border)]" style={{ ...colStyle("n"), ...guideShadowX("n"), ...guideShadowY(row.id) }}>
                            {idx+1}
                            {!preview && <RowMenu row={row} idx={idx} total={orderedRows.length} onMove={(dir)=>move(idx,dir)} onDelete={()=>deleteRow.mutate(row.id)} onMarkRow={(mark)=>markRow(row.id, mark)} />}
                            {!preview && <DragHandle axis="y" title={t("editor.resize.rowHeight")} zoom={zoom} startV={rowHeights[row.id] ?? 33} min={28} onV={(h)=>resizeRow(row.id, h)} onReset={()=>resetRow(row.id)} {...guideProps("y", row.id)} />}
                          </td>
                          <td className="p-2 relative text-center border-x border-[var(--sheet-border)]" style={{ ...colStyle("company"), ...guideShadowX("company"), ...guideShadowY(row.id) }}>
                            <button ref={(el)=>{ if (row.id===pickRowId) pickBtnRef.current = el }} disabled={preview} onClick={()=>setPickRowId(pickRowId===row.id?null:row.id)} title={row.name_snapshot ? t("editor.table.changeCompany") : t("editor.table.chooseCompany")} aria-haspopup="listbox" aria-expanded={pickRowId===row.id} className={`rounded px-2 h-8 w-full text-xs flex items-center gap-1 border hover:border-[var(--sheet-border)] hover:bg-[var(--sheet-soft)] disabled:hover:border-transparent disabled:hover:bg-transparent disabled:cursor-default ${row.name_snapshot ? "font-medium text-[#1e293b] border-transparent" : "border-dashed border-[var(--sheet-border)] text-[var(--text-dim)]"}`}>
                              <span className="flex-1 text-left truncate">{row.name_snapshot || t("editor.table.chooseCompany")}</span>
                              <span aria-hidden className="text-[10px] ml-auto text-[var(--text-dim)]">▾</span>
                            </button>
                            {pickRowId===row.id && companies && <CompanyPicker row={row} companies={companies} anchorRef={pickBtnRef} onClose={()=>setPickRowId(null)} onSelect={async(v)=>{ await updateRow.mutateAsync({ rowId: row.id, patch: v as any }); setPickRowId(null) }} />}
                          </td>
                          {years.map((y, yi)=>(
                            <td key={y} colSpan={12} className="p-0 border-x border-[var(--sheet-border)]" style={{ width: yearWidth(y), ...(guideBlock && yi === years.length - 1 ? guideShadowBlock : guideShadowY(row.id) ?? undefined) }}>
                              <div className="flex items-stretch h-full">
                                {MONTHS.map((_, mi)=>{
                                  const c = cellMap.get(`${row.id}-${y}-${mi+1}`)
                                  const mk = monthKey(y, mi)
                                  const accentL = guideRow(row.id) ? { borderLeftColor: GUIDE } : null
                                   if(!c) return <span key={mi} style={{ ...monthStyle(mk), ...accentL, ...guideShadowY(row.id) }} className={`${monthClass(mk)} grid place-items-center py-2 ${mi === 0 ? "border-l-0" : "border-l border-[var(--sheet-border)]"}`} title={t("editor.table.loadingMonth")}><input type="checkbox" disabled aria-label={t("editor.table.loadingMonthAria")} className="w-6 h-6 accent-[var(--sheet-accent)] opacity-60" /></span>
                                  const owner = ownerOf(c.color)
                                  const isMine = owner === activePerson
                                  const selected = !preview && selCell?.rowId === row.id && selCell?.year === y && selCell?.month === mi + 1
                                                                     return <label key={mi} data-sel-zone onClick={(e)=>{ if ((e.target as HTMLElement).tagName === "INPUT") return; if (window.matchMedia?.("(hover: none)").matches) { e.preventDefault(); toggle.mutate(c); setSelCell(null); return } e.preventDefault(); setSelCell((s) => (s && s.rowId === row.id && s.year === y && s.month === mi + 1 ? null : { rowId: row.id, year: y, month: mi + 1 })) }} style={{ ...monthStyle(mk), ...accentL, ...guideShadowY(row.id) }} className={`${monthClass(mk)} grid place-items-center py-2 min-h-[44px] h-full ${mi === 0 ? "border-l-0" : "border-l border-[var(--sheet-border)]"} cursor-pointer hover:bg-[var(--sheet-soft)] [touch-action:manipulation]`} title={c.reviewed ? (owner >= 0 && !isMine ? t("editor.table.markedBy", { who: personName(staffNames, owner), me: personName(staffNames, activePerson) }) : t("editor.table.markedGeneric")) : t("editor.table.markAsWho", { who: personName(staffNames, activePerson) })}>
                                    <input type="checkbox" aria-label={t("editor.table.monthAria", { month: MONTHS[mi] ?? mi + 1, year: y })} checked={!!c.reviewed} onChange={()=>{ toggle.mutate(c); setSelCell(null) }} style={c.color ? { accentColor: c.color } : undefined} className={`w-6 h-6 accent-[var(--sheet-accent)] cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sheet-accent)] ${selected ? "outline outline-2 outline-offset-2 outline-[var(--sheet-accent)]" : "outline-none"}`} />
                                  </label>
                                })}
                              </div>
                            </td>
                          ))}
                          {settings.visible_fields.assignee && (
                            <td className="p-0 min-w-[90px] border-x border-[var(--sheet-border)]" style={{ ...colStyle("assignee"), ...guideShadowX("assignee"), ...guideShadowY(row.id) }}>
                              <RowTextCell field="assignee" row={row} onSave={v=>updateRow.mutate({ rowId: row.id, patch:{assignee: v } })} />
                            </td>
                          )}
                          {settings.visible_fields.notes && (
                            <td className="p-0 min-w-[140px] border-x border-[var(--sheet-border)]" style={{ ...colStyle("notes"), ...guideShadowX("notes"), ...guideShadowY(row.id) }}>
                              <RowTextCell field="note" row={row} onSave={v=>updateRow.mutate({ rowId: row.id, patch:{note: v } })} />
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!preview && (
              <div className="p-3 border-t border-[var(--sheet-border)]">
                <Button onClick={()=>addRow.mutate({})} className="w-full h-8 rounded-lg border border-dashed border-[var(--sheet-border)] bg-[var(--sheet-soft)] hover:brightness-95 text-[var(--sheet-accent)] text-xs font-medium gap-1.5"><Plus size={13}/> {t("editor.table.addRow")}</Button>
              </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Right Panel fusionado — 2 subpestañas, colapsable; drawer en <lg (siempre montado: anima como el sidebar) */}
      <div className={`fixed inset-0 z-30 bg-black/60 lg:hidden transition-opacity duration-200 motion-reduce:transition-none ${mPanel ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMPanel(false)} aria-hidden />
      <div className={`${rightCollapsed && !mPanel ? "lg:w-[56px]" : "lg:w-[320px]"} fixed lg:static inset-y-0 right-0 z-40 w-[min(320px,85vw)] bg-[var(--bg)] border-l border-[var(--border)] flex flex-col shrink-0 overflow-hidden pb-[env(safe-area-inset-bottom)] ${mPanel ? "max-lg:translate-x-0 max-lg:visible" : "max-lg:translate-x-full max-lg:invisible max-lg:pointer-events-none"} lg:translate-x-0 lg:visible transition-[width,transform,opacity] duration-200 ease-out motion-reduce:transition-none`}>
        <div className="lg:hidden flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
          <span className="text-[13px] font-semibold text-[var(--text)]">{t("editor.panel.label")}</span>
          <button onClick={()=>setMPanel(false)} aria-label={t("common.close")} className="w-11 h-11 rounded-lg hover:bg-[var(--surface)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition">
            <X size={18}/>
          </button>
        </div>
        {(rightCollapsed && !mPanel) ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <button onClick={()=>setRightCollapsed(false)} title={t("editor.panel.expandWithTab", { tab: panelTab === "table" ? t("editor.panel.tableTab") : t("editor.panel.designTab") })} aria-label={t("editor.panel.expand")} className="group/panel relative w-11 h-11 rounded-xl hover:bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition">
              {panelTab === "table" ? <Table2 size={16} className="transition-opacity duration-150 group-hover/panel:opacity-0" /> : <Palette size={16} className="transition-opacity duration-150 group-hover/panel:opacity-0" />}
              <PanelRightOpen size={16} className="absolute inset-0 m-auto opacity-0 group-hover/panel:opacity-100 transition-opacity duration-150" />
            </button>
            {panelTab === "table" ? (
              <button onClick={()=>{ setPanelTab("design"); setRightCollapsed(false) }} title={t("editor.panel.goDesign")} aria-label={t("editor.panel.goDesign")} className="w-9 h-9 rounded-xl flex items-center justify-center transition text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent">
                <Palette size={16}/>
              </button>
            ) : (
              <button onClick={()=>{ setPanelTab("table"); setRightCollapsed(false) }} title={t("editor.panel.goTable")} aria-label={t("editor.panel.goTable")} className="w-9 h-9 rounded-xl flex items-center justify-center transition text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent">
                <Table2 size={16}/>
              </button>
            )}
          </div>
        ) : (
        <>
        <div className="px-3 pt-3 shrink-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)] px-1 mb-2">
            <Settings2 size={14}/> {t("editor.panel.label")}
            <button onClick={()=>setRightCollapsed(true)} title={t("editor.panel.collapse")} className="ml-auto w-10 h-10 rounded-lg hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition">
              <PanelRightClose size={14}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]" role="tablist" aria-label={t("editor.panel.panelTabs")}>
            <button
              role="tab"
              aria-selected={panelTab === "table"}
              onClick={() => setPanelTab("table")}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition ${panelTab === "table" ? "bg-[var(--surface-2)] text-[var(--text)] shadow-sm border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}
            >
              <Table2 size={13}/> {t("editor.panel.tableTab")}
            </button>
            <button
              role="tab"
              aria-selected={panelTab === "design"}
              onClick={() => setPanelTab("design")}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition ${panelTab === "design" ? "bg-[var(--surface-2)] text-[var(--text)] shadow-sm border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}
            >
              <Palette size={13}/> {t("editor.panel.designTab")}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          {panelTab === "table" ? (
          <>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-3">
            <div className="text-[11px] font-semibold text-[var(--text)] tracking-wide flex items-center gap-1.5"><Calendar size={12}/> {t("editor.panel.tableData")}</div>
            <div><label className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.reviewType")}</label><Input placeholder={t("editor.panel.reviewTypePh")} value={typeDraft} onChange={e=>setTypeDraft(e.target.value)} onBlur={()=>saveType(typeDraft)} onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }} className="h-11 mt-1 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)]" /></div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.start")}</label><NumberStepper ariaLabel={t("editor.panel.start")} value={scaleStart} onChange={setScaleStart} className="mt-1 w-full" /></div>
              <div className="flex-1"><label className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.end")}</label><NumberStepper ariaLabel={t("editor.panel.end")} value={scaleEnd} onChange={setScaleEnd} className="mt-1 w-full" /></div>
            </div>
            <Button onClick={()=>applyScale.mutate()} disabled={applyScale.isPending || scaleStart>scaleEnd} title={scaleStart>scaleEnd ? t("editor.panel.badScale") : undefined} className="w-full min-h-[44px] bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] text-xs rounded-full">{t("editor.panel.applyScale")}</Button>
            {scaleStart>scaleEnd && <p role="alert" className="text-[11px] text-[var(--danger)]">{t("editor.panel.badScale")}</p>}
            <div className="flex items-center gap-2 pt-1">
              <Users size={12} className="text-[var(--text-dim)] shrink-0" />
              <NumberStepper dense ariaLabel={t("editor.panel.staffAria")} min={1} max={10} value={record.staff_count ?? 2} onChange={(n)=>{ const cur = record.staff_count ?? 2; const names = n < cur ? [...sanitizeStaffNames(staffNames), ...Array(Math.max(0, n)).fill("")].slice(0, n) : undefined; updateStaff.mutate({n, names}) }} className="w-[104px]" />
              <span className="text-xs text-[var(--text-dim)] truncate">{staffOpts.join(", ")}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
              <div className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.persons")}</div>
              <div className="grid grid-cols-2 gap-1">
                {staffOpts.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    onClick={()=>choosePerson(i)}
                    aria-pressed={activePerson === i}
                    title={t("editor.panel.markAs", { who: p })}
                    className={`flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg text-xs transition border ${activePerson === i ? "bg-[var(--surface-2)] text-[var(--text)] border-[var(--accent-border)] font-medium" : "text-[var(--text-dim)] hover:text-[var(--text)] border-transparent hover:bg-[var(--surface-2)]"}`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ background: PERSON_COLORS[i] }} />
                    <span className="truncate">{p}</span>
                    {activePerson === i && <Check size={12} className="ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
              <div className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.staffNames")}</div>
              {staffOpts.map((p, i) => (
                <div key={`${recordId}-${i}-${staffNames[i] ?? ""}`} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ background: PERSON_COLORS[i] }} />
                  <Input
                    aria-label={t("editor.panel.staffNameAria", { who: `P${i + 1}` })}
                    placeholder={`P${i + 1}`}
                    defaultValue={staffNames[i] ?? ""}
                    maxLength={24}
                    onBlur={(e) => {
                      const v = e.target.value.trim().slice(0, 24)
                      const cur = [...sanitizeStaffNames(staffNames), ...Array(Math.max(0, (record.staff_count ?? 2))).fill("")].slice(0, record.staff_count ?? 2)
                      if ((cur[i] ?? "") === v) return
                      cur[i] = v
                      updateNames.mutate(cur)
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                    className="h-11 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
                  />
                </div>
              ))}
            </div>
            {selectedCell && (
              <div data-sel-zone className="border-t border-[var(--border)] pt-2 space-y-1.5">
                <div className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.selectedColor")}</div>
                <div className="text-xs text-[var(--text)] font-medium truncate">
                  {selectedRowName || t("editor.table.defaultRowName", { n: "" }).trim()} · {MONTHS[(selCell?.month ?? 1) - 1]} {selCell?.year} · {selectedCell.color && ownerOf(selectedCell.color) >= 0 ? personName(staffNames, ownerOf(selectedCell.color)) : t("editor.panel.noMark")}
                </div>
                <div className="grid grid-cols-5 gap-1" role="group" aria-label={t("editor.panel.persons")}>
                  {PERSON_COLORS.slice(0, record.staff_count || 2).map((cc, i) => (
                    <button
                      key={cc}
                      type="button"
                      onClick={()=>recolor.mutate({ cellId: selectedCell.id, color: cc })}
                      aria-pressed={selectedCell.color === cc}
                      aria-label={t("editor.panel.paintAs", { who: personName(staffNames, i) })}
                      title={personName(staffNames, i)}
                      className={`min-h-[44px] rounded-lg border-2 transition ${selectedCell.color === cc ? "border-[var(--accent)]" : "border-black/10 hover:scale-105"}`}
                      style={{ background: cc }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between text-xs"><span className="text-[var(--text-dim)]">{t("editor.panel.total")}</span><span className="text-[var(--text)] font-medium">{t("editor.panel.totalMeta", { rows: rows.length, years: years.length })}</span></div>
            <div className="border-t border-[var(--border)] pt-2 space-y-2">
              <div className="text-[10px] text-[var(--text-dim)]">{t("editor.panel.visibleColumns")}</div>
              <label className="flex items-center justify-between text-xs text-[var(--text-dim)] cursor-pointer min-h-[44px]">{t("editor.panel.responsible")}<input type="checkbox" checked={settings.visible_fields.assignee} onChange={e=>settings.set({visible_fields:{...settings.visible_fields,assignee:e.target.checked}})} className="w-6 h-6 accent-[var(--sheet-accent)] cursor-pointer" /></label>
              <label className="flex items-center justify-between text-xs text-[var(--text-dim)] cursor-pointer min-h-[44px]">{t("editor.panel.notes")}<input type="checkbox" checked={settings.visible_fields.notes} onChange={e=>settings.set({visible_fields:{...settings.visible_fields,notes:e.target.checked}})} className="w-6 h-6 accent-[var(--sheet-accent)] cursor-pointer" /></label>
            </div>
          </div>
          </>
          ) : (
          <>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-3">
            <div className="text-[12px] font-medium text-[var(--text)] flex items-center gap-1.5"><Palette size={12}/> {t("editor.panel.styles")}</div>
            <div className="flex items-center justify-between"><span className="text-[11px] text-[var(--text-dim)]">{t("editor.panel.sheetColor")}</span><Button onClick={()=>settings.set({primary_color:""})} aria-pressed={!settings.primary_color || ["#6366f1","#EC4899","#ec4899"].includes(settings.primary_color)} title={t("editor.panel.followAccent")} className="h-6 px-2.5 rounded-full text-[11px] bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]">{t("editor.panel.auto")}</Button></div>
            <div className="flex items-center justify-between"><span className="text-[11px] text-[var(--text-dim)]">{t("editor.panel.custom")}</span><div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] focus-within:border-[var(--accent)] rounded-lg px-2 py-1 w-[148px] justify-between relative"><span className="w-4 h-4 rounded" style={{background: settings.primary_color || "var(--accent)"}}/><span className="text-[11px] text-[var(--text)]">{settings.primary_color || t("editor.panel.themed")}</span><input type="color" aria-label={t("editor.panel.customSheetColor")} value={settings.primary_color || "#EC4899"} onChange={e=>settings.set({primary_color:e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div>
            <div className="flex gap-1.5 flex-wrap">
              {["#EC4899","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444"].map(c=>(
                <button key={c} title={c} aria-label={t("editor.panel.colorValue", { hex: c })} aria-pressed={settings.primary_color===c} onClick={()=>settings.set({primary_color:c})} className="w-10 h-10 rounded-full border-2" style={{background:c, borderColor: settings.primary_color===c ? "white" : "var(--border)", boxShadow: settings.primary_color===c ? "0 0 0 2px var(--accent)" : "none"}}/>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-2">
            <div className="text-[12px] font-medium text-[var(--text)] flex items-center gap-1.5"><FileText size={12}/> {t("editor.panel.tableLook")}</div>
            <label className="flex items-center justify-between text-xs text-[var(--text-dim)]">{t("editor.panel.density")}
              <select value={settings.table_density} onChange={e=>settings.set({table_density:e.target.value as any})} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 min-h-[44px] text-base text-[var(--text)]">
                <option value="compact">{t("editor.panel.densityCompact")}</option><option value="normal">{t("editor.panel.densityNormal")}</option><option value="comfortable">{t("editor.panel.densityComfortable")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-xs text-[var(--text-dim)]">{t("editor.panel.summary")}<input type="checkbox" checked={settings.show_summary} onChange={e=>settings.set({show_summary:e.target.checked})} className="accent-[var(--sheet-accent)]" /></label>
            <button type="button" onClick={()=>patchDesign("table", (p)=>({ ...p, cols: {}, rows: {} }))} className="w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm font-medium hover:border-[var(--accent)] transition">{t("editor.panel.resetLayout")}</button>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-2">
            <div className="text-[12px] font-medium text-[var(--text)] flex items-center justify-between">{t("editor.panel.headerBg")}<Button onClick={()=>settings.set({table_header_bg:""})} aria-pressed={!headerBg} title={t("editor.panel.followAccent")} className="h-6 px-2.5 rounded-full text-[11px] bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]">{t("editor.panel.auto")}</Button></div>
            <div className="flex items-center gap-2"><span className="w-6 h-6 rounded border" style={{background: headerBg || "var(--sheet-soft)"}}/><input type="color" aria-label={t("editor.panel.headerBgAria")} value={headerBg || "#EC4899"} onChange={e=>settings.set({table_header_bg:e.target.value})} className="flex-1 h-8 bg-transparent cursor-pointer" /><span className="text-xs text-[var(--text-dim)]">{headerBg || t("editor.panel.auto")}</span></div>
          </div>
          </>
          )}
        </div>
        </div>
        </>
        )}
      </div>
      </div>

      {/* FAB móvil: desborde del toolbar (el menú "..." se eliminó: lo recortaba el overflow) */}
      <div
        aria-hidden
        onClick={() => setFabOpen(false)}
        className={`lg:hidden fixed inset-0 z-20 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${fabOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <div className={`lg:hidden fixed bottom-6 right-4 z-20 mb-[env(safe-area-inset-bottom)] flex flex-col items-end gap-3 ${fabOpen ? "" : "pointer-events-none"}`}>
        <div style={{ transitionDelay: fabOpen ? "120ms" : "0ms" }} className={`flex items-center justify-end gap-2 transition-all duration-200 motion-reduce:transition-none ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
          <span className="text-xs font-medium text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-lg">{t("editor.toolbar.preview")}</span>
          <button onClick={() => { setPreview(true); setSelCell(null); setFabOpen(false) }} aria-label={t("editor.toolbar.preview")} className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text)] active:scale-95 transition"><Eye size={18}/></button>
        </div>
        <div style={{ transitionDelay: fabOpen ? "90ms" : "0ms" }} className={`flex items-center justify-end gap-2 transition-all duration-200 motion-reduce:transition-none ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
          <span className="text-xs font-medium text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-lg">{t("editor.toolbar.redo")}</span>
          <button onClick={() => { doRedo(); setFabOpen(false) }} disabled={futureLen===0} aria-label={t("editor.toolbar.redo")} className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text)] active:scale-95 transition disabled:opacity-40"><Redo2 size={18}/></button>
        </div>
        <div style={{ transitionDelay: fabOpen ? "60ms" : "0ms" }} className={`flex items-center justify-end gap-2 transition-all duration-200 motion-reduce:transition-none ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
          <span className="text-xs font-medium text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-lg">{t("editor.toolbar.undo")}</span>
          <button onClick={() => { doUndo(); setFabOpen(false) }} disabled={pastLen===0} aria-label={t("editor.toolbar.undo")} className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text)] active:scale-95 transition disabled:opacity-40"><Undo2 size={18}/></button>
        </div>
        <div style={{ transitionDelay: fabOpen ? "30ms" : "0ms" }} className={`flex items-center justify-end gap-2 transition-all duration-200 motion-reduce:transition-none ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
          <span className="text-xs font-medium text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-lg">{t("editor.toolbar.zoom")}</span>
          <button onClick={()=>stepZoom(-1)} aria-label={t("editor.toolbar.zoomOut")} className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text)] active:scale-95 transition"><Minus size={18}/></button>
          <button onClick={()=>changeZoom(defaultZoom())} title={t("editor.toolbar.zoomReset")} className="h-12 px-3 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl text-[11px] font-mono text-[var(--text)] active:scale-95 transition">{Math.round(zoom * 100)}%</button>
          <button onClick={()=>stepZoom(1)} aria-label={t("editor.toolbar.zoomIn")} className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-xl flex items-center justify-center text-[var(--text)] active:scale-95 transition"><Plus size={18}/></button>
        </div>
        <div style={{ transitionDelay: fabOpen ? "0ms" : "0ms" }} className={`flex items-center justify-end gap-2 transition-all duration-200 motion-reduce:transition-none ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
          <span className="text-xs font-medium text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-lg">{t("editor.toolbar.orientation")}</span>
          <button onClick={()=>{ changeOrientation("vertical"); setFabOpen(false) }} aria-pressed={orientation==="vertical"} aria-label={t("editor.toolbar.vertical")} className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition ${orientation==="vertical" ? "bg-[var(--accent)] text-[var(--on-accent)] border border-transparent" : "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]"}`}><RectangleVertical size={18}/></button>
          <button onClick={()=>{ changeOrientation("horizontal"); setFabOpen(false) }} aria-pressed={orientation==="horizontal"} aria-label={t("editor.toolbar.horizontal")} className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition ${orientation==="horizontal" ? "bg-[var(--accent)] text-[var(--on-accent)] border border-transparent" : "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]"}`}><RectangleHorizontal size={18}/></button>
        </div>
        <button onClick={()=>setFabOpen(!fabOpen)} aria-label={t("editor.toolbar.moreTools")} aria-expanded={fabOpen} className={`w-14 h-14 rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-xl flex items-center justify-center transition-transform duration-200 motion-reduce:transition-none active:scale-95 ${fabOpen ? "rotate-45" : ""}`}>
          <Plus size={22}/>
        </button>
      </div>

      {/* Alert: required fields missing for save/export */}
      {validAlert && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={()=>setValidAlert(null)}>
          <div className="w-[400px] max-w-full bg-[var(--surface)] rounded-2xl shadow-2xl p-5 text-[var(--text)]" onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-semibold mb-1">{t("editor.validation.missingTitle")}</div>
            <p className="text-xs text-[var(--text-dim)] mb-3">{t("editor.validation.missingDesc")}</p>
            <ul className="max-h-[220px] overflow-auto space-y-1.5 mb-4">
              {validAlert.map((m:any)=>(
                <li key={m.id}>
                  <button onClick={() => { setPickRowId(m.id); setValidAlert(null) }} className="w-full text-left text-xs px-3 py-2.5 rounded-lg bg-[var(--sheet-soft)] border border-[var(--sheet-border)] hover:border-[var(--accent-border)]">
                    {t("editor.validation.rowNoCompany", { row: m.row, name: m.name })}
                  </button>
                </li>
              ))}
            </ul>
            <Button onClick={()=>setValidAlert(null)} className="w-full bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)]">{t("editor.validation.review")}</Button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
