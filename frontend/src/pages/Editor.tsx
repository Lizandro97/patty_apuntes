import { useQuery, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useParams } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfigStore } from "@/stores/config"
import { useEditorHeaderStore } from "@/stores/editorHeader"
import { useHistoryStore, type HistorySnapshot } from "@/stores/history"
import { useUiStore } from "@/stores/ui"
import { currentYear, newArchivoPayload } from "@/lib/defaults"
import { Plus, Minus, Trash2, ArrowUp, ArrowDown, Users, Calendar, Check, Save, Download, Eye, Undo2, Redo2, Settings2, FileText, Table2, Palette, RectangleVertical, RectangleHorizontal, PanelRightClose, PanelRightOpen, ChevronUp, ChevronDown } from "lucide-react"

const MESES = ["E","F","M","A","M","J","J","A","S","O","N","D"]

// Color por persona (índice P1..Pn). Paleta fija distinguible y apta daltónicos;
// la hoja siempre es clara, así que vale para los 3 temas.
export const PERSON_COLORS = [
  "#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7",
  "#56B4E9", "#F0E442", "#8B5CF6", "#10B981", "#999999",
]

function EmpresaPicker({ fila, empresas, onSelect, onClose }: { fila: any; empresas: any[]; onSelect: (v: { empresa_id?: string }) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h) }, [onClose])
  const filtered = empresas.filter((e: any) => e.nombre.toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={ref} className="absolute z-30 top-full left-0 mt-1 w-[280px] bg-white border border-[var(--sheet-border)] rounded-xl shadow-[0_12px_32px_rgba(132,24,67,0.15)] p-2">
      <Input autoFocus aria-label="Buscar empresa registrada" placeholder="Buscar empresa registrada..." value={q} onChange={e=>setQ(e.target.value)} className="h-8 text-sm mb-2 bg-[var(--sheet-soft)] border-[var(--sheet-border)] text-[#1e293b] placeholder:text-[var(--text-dim)]" />
      <div className="max-h-[180px] overflow-auto space-y-1">
        {filtered.map((e:any)=>(<button key={e.id} onClick={()=>onSelect({ empresa_id: e.id })} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--sheet-soft)] text-sm flex items-center justify-between text-[#1e293b]"><span>{e.nombre}</span><span className="text-[11px] text-[var(--sheet-accent)]">{fila.empresa_id===e.id ? "✓" : ""}</span></button>))}
        {filtered.length===0 && <div className="text-xs text-[var(--text-dim)] px-3 py-2">Sin resultados. Registra la empresa primero en la página Empresas.</div>}
      </div>
      {fila.empresa_id && (
        <div className="border-t border-[var(--sheet-border)] mt-2 pt-2">
          <button onClick={()=>onSelect({ empresa_id: "" })} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-xs text-[var(--text-dim)] hover:text-red-600">Quitar empresa de esta fila</button>
        </div>
      )}
    </div>
  )
}

function RowMenu({ fila, idx, total, onMove, onDelete }: { fila: any; idx: number; total: number; onMove: (dir: -1 | 1) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirming(false) } }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setConfirming(false) } }
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [open])
  return (
    <div ref={ref} className="absolute bottom-0 right-0">
      <button
        onClick={() => { setOpen(!open); setConfirming(false) }}
        title="Opciones de fila"
        aria-label="Opciones de fila"
        aria-haspopup="menu"
        aria-expanded={open}
        className="block w-0 h-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer border-b-[12px] border-b-[var(--sheet-accent)] hover:brightness-125 border-l-[12px] border-l-transparent"
      />
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[190px] bg-white border border-[var(--sheet-border)] rounded-xl shadow-[0_12px_32px_rgba(132,24,67,0.15)] p-1.5 z-30 text-left">
          {!confirming ? (
            <>
              <button onClick={() => { onMove(-1); setOpen(false) }} disabled={idx === 0} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#1e293b] hover:bg-[var(--sheet-soft)] disabled:opacity-40 disabled:hover:bg-transparent"><ArrowUp size={13}/> Subir fila</button>
              <button onClick={() => { onMove(1); setOpen(false) }} disabled={idx === total - 1} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#1e293b] hover:bg-[var(--sheet-soft)] disabled:opacity-40 disabled:hover:bg-transparent"><ArrowDown size={13}/> Bajar fila</button>
              <div className="border-t border-[var(--sheet-border)] mt-1 pt-1">
                <button onClick={() => setConfirming(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50"><Trash2 size={13}/> Eliminar fila</button>
              </div>
            </>
          ) : (
            <div className="p-1.5">
              <div className="text-xs font-medium text-[#1e293b] px-1.5 pb-1">¿Eliminar “{fila.nombre_snapshot || `Fila ${idx + 1}`}”?</div>
              <div className="text-[11px] text-[var(--text-dim)] px-1.5 pb-2.5">Se borrarán sus meses anotados.</div>
              <div className="flex gap-1.5">
                <button onClick={() => setConfirming(false)} className="flex-1 h-7 rounded-lg border border-[var(--sheet-border)] text-xs text-[#64748b] hover:bg-[var(--sheet-soft)]">Cancelar</button>
                <button onClick={() => { onDelete(); setOpen(false); setConfirming(false) }} className="flex-1 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-xs text-white font-medium">Eliminar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Stepper numérico con flechas del tema (sin spinners nativos).
function NumberStepper({ value, onChange, min, max, ariaLabel, className, dense }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
  ariaLabel?: string; className?: string; dense?: boolean
}) {
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
        className={`themed-number ${dense ? "h-7" : "h-8"} flex-1 min-w-0 bg-transparent border-0 text-[var(--text)] text-xs px-2 focus-visible:ring-0 focus-visible:outline-none`}
      />
      <span className="flex flex-col w-6 shrink-0 border-l border-[var(--border)]" role="group" aria-label={ariaLabel}>
        <button type="button" aria-label="Aumentar" onClick={()=>onChange(clamp(value + 1))} className={btn}><ChevronUp size={12}/></button>
        <button type="button" aria-label="Disminuir" onClick={()=>onChange(clamp(value - 1))} className={`${btn} border-t border-[var(--border)]`}><ChevronDown size={12}/></button>
      </span>
    </span>
  )
}

function FilaTextCell({ fila, field, onSave }: { fila: any; field: "responsable" | "observacion"; onSave: (v: string) => void }) {
  const [v, setV] = useState(fila?.[field] ?? "")
  useEffect(()=> setV(fila?.[field] ?? ""), [fila?.id, fila?.[field]])
  return <input aria-label={field === "responsable" ? "Responsable" : "Observaciones"} value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!== (fila?.[field] ?? "")) onSave(v)}} onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }} placeholder="—" className="w-full min-w-0 max-w-full h-7 px-2 text-xs border border-transparent hover:border-[var(--sheet-border)] focus:border-[var(--sheet-accent)] rounded focus:outline-none bg-transparent text-[#1e293b]" />
}

// Handle arrastrable estilo Excel sobre las líneas del grid.
// axis x = borde derecho (ancho de columna), axis y = borde inferior (alto de fila).
// Avisa hover y drag para pintar la guía full-length (una misma columna/fila).
function DragHandle({ axis, title, zoom, startV, min, onV, onReset, onHover, onDrag }: {
  axis: "x" | "y"; title: string; zoom: number; startV: number; min: number;
  onV: (v: number) => void; onReset: () => void;
  onHover?: (active: boolean) => void; onDrag?: (active: boolean) => void
}) {
  const st = useRef<{ p: number; v: number } | null>(null)
  const [on, setOn] = useState(false)
  const end = (notify = true) => {
    const was = st.current !== null
    st.current = null
    setOn(false)
    if (was && notify) onDrag?.(false)
  }
  const pos = axis === "x"
    ? "top-0 bottom-0 -right-[4px] w-[9px] cursor-col-resize"
    : "left-0 right-0 -bottom-[4px] h-[9px] cursor-row-resize"
  const line = axis === "x"
    ? "absolute inset-y-0 left-1/2 -ml-px w-[2px]"
    : "absolute inset-x-0 top-1/2 -mt-px h-[2px]"
  return (
    <span
      title={title}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onDoubleClick={(e) => { e.stopPropagation(); onReset() }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId)
        st.current = { p: axis === "x" ? e.clientX : e.clientY, v: startV }
        setOn(true)
        onDrag?.(true)
        e.preventDefault()
        e.stopPropagation()
      }}
      onPointerMove={(e) => {
        const s = st.current
        if (!s) return
        const d = ((axis === "x" ? e.clientX : e.clientY) - s.p) / (zoom || 1)
        onV(Math.max(min, Math.round(s.v + d)))
      }}
      onPointerUp={(e) => { end(); try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } }}
      onPointerCancel={() => end()}
      className={`absolute ${pos} z-10 group/handle`}
    >
      <span className={`${line} ${on ? "bg-[var(--accent)]" : "bg-transparent group-hover/handle:bg-[var(--accent)]"} transition-colors`} />
    </span>
  )
}

export function Editor() {
  const { id } = useParams()
  const qc = useQueryClient()
  const cfg = useConfigStore()
  const hdr = useEditorHeaderStore()
  const [archivoId, setArchivoId] = useState<string | undefined>(id)
  const [pickFilaId, setPickFilaId] = useState<string | null>(null)
  const [scaleStart, setScaleStart] = useState(currentYear())
  const [scaleEnd, setScaleEnd] = useState(currentYear())
  const [tipoTmp, setTipoTmp] = useState("")
  const [panelTab, setPanelTab] = useState<"tabla" | "diseno">("tabla")
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical")
  const [preview, setPreview] = useState(false)
  // Persona activa que marca (índice en PERSON_COLORS). Es de este dispositivo:
  // se guarda en localStorage, no en el backend.
  const [personIdx, setPersonIdx] = useState(0)
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(`patty-persona-${archivoId}`) ?? 0)
      setPersonIdx(Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
    } catch { setPersonIdx(0) }
  }, [archivoId])
  const choosePerson = (i: number) => {
    setPersonIdx(i)
    try { localStorage.setItem(`patty-persona-${archivoId}`, String(i)) } catch { /* noop */ }
  }
  const pastLen = useHistoryStore((s) => s.past.length)
  const futureLen = useHistoryStore((s) => s.future.length)
  const undoTip = useHistoryStore((s) => (s.past.length ? s.past[s.past.length - 1].label : null))
  const redoTip = useHistoryStore((s) => (s.future.length ? s.future[s.future.length - 1].label : null))
  const ZOOM_STEPS = [0.5, 0.6, 0.75, 1, 1.25, 1.5]
  const defaultZoom = (_o: "vertical" | "horizontal") => 1
  const [zoom, setZoom] = useState(1)
  const stepZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.reduce((best, v, idx) => (Math.abs(v - zoom) < Math.abs(ZOOM_STEPS[best] - zoom) ? idx : best), 0)
    const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + dir))
    changeZoom(ZOOM_STEPS[next])
  }
  const sheetBase = orientation === "horizontal" ? { w: 1273, h: 900 } : { w: 900, h: 1273 }
  const rightOpen = useUiStore((s) => s.rightOpen)
  const setRightOpen = useUiStore((s) => s.setRightOpen)
  const rightCollapsed = !rightOpen
  const setRightCollapsed = (v: boolean) => setRightOpen(!v)
  const { data: archivo } = useQuery({ queryKey: ["archivo", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}`)).data })
  const { data: filas } = useQuery({ queryKey: ["filas", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/filas`)).data })
  const { data: celdas } = useQuery({ queryKey: ["celdas", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/celdas`)).data })
  const { data: stats } = useQuery({ queryKey: ["stats", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/stats`)).data })
  const { data: empresas } = useQuery({ queryKey: ["empresas"], queryFn: async () => (await api.get("/empresas")).data })
  const { data: diseno } = useQuery({ queryKey: ["diseno", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/diseno`)).data })
  const disenoPayload = (sec: "hoja" | "tabla"): any =>
    ((diseno as any[]) ?? []).find((d: any) => d.seccion === sec)?.payload ?? {}
  const colW: Record<string, number> = disenoPayload("tabla").cols ?? {}
  const rowH: Record<string, number> = disenoPayload("tabla").rows ?? {}
  const disenoTimers = useRef<{ hoja?: any; tabla?: any }>({})
  useEffect(() => () => { clearTimeout(disenoTimers.current.hoja); clearTimeout(disenoTimers.current.tabla) }, [archivoId])
  const schedulePutDiseno = (seccion: "hoja" | "tabla") => {
    clearTimeout(disenoTimers.current[seccion])
    disenoTimers.current[seccion] = setTimeout(async () => {
      try {
        const cur = ((qc.getQueryData(["diseno", archivoId]) as any[]) ?? []).find((d: any) => d.seccion === seccion)
        await api.put(`/archivos/${archivoId}/diseno`, { seccion, payload: cur?.payload ?? {} })
      } catch { /* best-effort: queda en caché y se reintenta en el próximo cambio */ }
    }, 500)
  }
  const patchDiseno = (seccion: "hoja" | "tabla", fn: (p: any) => any) => {
    const cur = ((qc.getQueryData(["diseno", archivoId]) as any[]) ?? []).slice()
    const i = cur.findIndex((d: any) => d.seccion === seccion)
    if (i >= 0) cur[i] = { ...cur[i], payload: fn(cur[i].payload ?? {}) }
    else cur.push({ seccion, payload: fn({}), updated_at: new Date().toISOString() })
    qc.setQueryData(["diseno", archivoId], cur)
    schedulePutDiseno(seccion)
  }
  const changeOrientation = (o: "vertical" | "horizontal") => {
    setOrientation(o)
    setZoom(1)
    patchDiseno("hoja", (p) => ({ ...p, orientation: o, zoom: 1 }))
  }
  const changeZoom = (z: number) => {
    setZoom(z)
    patchDiseno("hoja", (p) => ({ ...p, orientation, zoom: z }))
  }
  const disenoInit = useRef<string | null>(null)
  useEffect(() => {
    if (!diseno || !archivoId || disenoInit.current === archivoId) return
    disenoInit.current = archivoId
    const h = disenoPayload("hoja")
    if (h.orientation === "vertical" || h.orientation === "horizontal") setOrientation(h.orientation)
    if (typeof h.zoom === "number" && h.zoom >= 0.5 && h.zoom <= 1.5) setZoom(h.zoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diseno, archivoId])
  const mKey = (y: number, mi: number) => `m:${y}:${mi + 1}`
  const colStyle = (key: string) =>
    (colW[key] ? { width: colW[key], minWidth: colW[key] } : undefined) as any
  const monthCls = (key: string) =>
    `${colW[key] ? "flex-none" : "flex-1"} text-center relative`
  const monthStyle = (key: string) => (colW[key] ? { width: colW[key] } : undefined) as any
  const resizeCol = (key: string, w: number) =>
    patchDiseno("tabla", (p) => ({ ...p, cols: { ...(p.cols ?? {}), [key]: w } }))
  const resetCol = (key: string) =>
    patchDiseno("tabla", (p) => { const cols = { ...(p.cols ?? {}) }; delete cols[key]; return { ...p, cols } })
  const resizeRow = (fid: string, h: number) =>
    patchDiseno("tabla", (p) => ({ ...p, rows: { ...(p.rows ?? {}), [fid]: h } }))
  const resetRow = (fid: string) =>
    patchDiseno("tabla", (p) => { const rows = { ...(p.rows ?? {}) }; delete rows[fid]; return { ...p, rows } })
  // Guía full-length (una misma columna/fila) en hover o drag, color éxito del tema
  const [hoverGuide, setHoverGuide] = useState<{ axis: "x" | "y"; key: string } | null>(null)
  const [dragGuide, setDragGuide] = useState<{ axis: "x" | "y"; key: string } | null>(null)
  const activeGuide = dragGuide ?? hoverGuide
  const guideProps = (axis: "x" | "y", key: string) => ({
    onHover: (a: boolean) => setHoverGuide(a ? { axis, key } : (g) => (g && g.axis === axis && g.key === key ? null : g)),
    onDrag: (a: boolean) => setDragGuide(a ? { axis, key } : (g) => (g && g.axis === axis && g.key === key ? null : g)),
  })
  const GUIDE = "var(--accent)"
  // Guía 2px pareja con sombra interna (no mueve el layout): cada celda pinta su
  // segmento y se ve una línea continua de header a última fila / última columna.
  const guideShadowX = (key: string) =>
    (guideCol(key) ? { boxShadow: `inset -2px 0 0 ${GUIDE}` } : null) as any
  const guideShadowY = (fid: string) =>
    (guideRow(fid) ? { boxShadow: `inset 0 -2px 0 ${GUIDE}` } : null) as any
  const guideCol = (key: string) => activeGuide?.axis === "x" && activeGuide.key === key
  const guideRow = (fid: string) => activeGuide?.axis === "y" && activeGuide.key === fid
  const HEADER_KEY = "header"
  const headerH: number | undefined = rowH[HEADER_KEY]
  // Celda seleccionada (foco para recolorear desde el panel sin desmarcar).
  // Se limpia al alternar un check, con Esc, en preview o al clicar fuera de la selección/paleta.
  const [sel, setSel] = useState<{ filaId: string; anio: number; mes: number } | null>(null)
  useEffect(() => {
    const h = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.("[data-sel-zone]")) return
      setSel((s) => (s ? null : s))
    }
    document.addEventListener("pointerdown", h)
    return () => document.removeEventListener("pointerdown", h)
  }, [])
  useEffect(() => { if (archivo) { setScaleStart(archivo.periodo_inicio); setScaleEnd(archivo.periodo_fin); setTipoTmp(archivo.tipo_revision ?? "") } }, [archivo])
  const createArchivo = useMutation({ mutationFn: async () => (await api.post("/archivos", newArchivoPayload())).data, onSuccess: (d) => setArchivoId(d.id) })
  useEffect(() => { if (!id && !archivoId) createArchivo.mutate() }, [])
  useEffect(() => { useHistoryStore.getState().clear() }, [archivoId])

  const snapshotCurrent = (label: string): HistorySnapshot => ({
    label,
    filas: qc.getQueryData(["filas", archivoId]),
    celdas: qc.getQueryData(["celdas", archivoId]),
    archivo: qc.getQueryData(["archivo", archivoId]),
  })
  const pushHistory = (label: string) => {
    const s = snapshotCurrent(label)
    // Don't push empty initial snapshots (nothing loaded yet)
    if (!s.filas && !s.celdas && !s.archivo) return
    useHistoryStore.getState().push(s)
  }
  const applySnapshot = (s: HistorySnapshot) => {
    if (s.filas !== undefined) qc.setQueryData(["filas", archivoId], s.filas)
    if (s.celdas !== undefined) qc.setQueryData(["celdas", archivoId], s.celdas)
    if (s.archivo !== undefined) qc.setQueryData(["archivo", archivoId], s.archivo)
  }
  // Lleva el servidor al estado `target`, usando `source` (estado previo local) para un diff mínimo.
  const syncSnapshotToServer = async (target: HistorySnapshot, source: HistorySnapshot) => {
    const tFilas: any[] = target.filas ?? []
    const sFilas: any[] = source.filas ?? []
    const tCeldas: any[] = target.celdas ?? []
    const sCeldas: any[] = source.celdas ?? []
    // Archivo
    const ta = target.archivo as any, sa = source.archivo as any
    if (ta && sa) {
      const patch: any = {}
      for (const k of ["titulo", "tipo_revision", "periodo_inicio", "periodo_fin", "personal_count"]) {
        if (ta[k] !== sa[k] && ta[k] !== undefined) patch[k] = ta[k]
      }
      if (Object.keys(patch).length) {
        try { await api.put(`/archivos/${archivoId}`, patch) } catch { /* best-effort */ }
      }
    }
    // Filas eliminadas en target (sobran en servidor) -> DELETE
    const tIds = new Set(tFilas.map((f: any) => f.id))
    const sIds = new Set(sFilas.map((f: any) => f.id))
    const recreatedOldIds = new Set<string>()
    for (const f of sFilas) {
      if (!tIds.has(f.id)) {
        try { await api.delete(`/archivos/${archivoId}/filas/${f.id}`) } catch { /* best-effort */ }
      }
    }
    // Filas que faltan en servidor (se habían borrado) -> recrear
    for (const f of tFilas) {
      if (!sIds.has(f.id)) {
        recreatedOldIds.add(f.id)
        try {
          const payload: any = f.empresa_id ? { empresa_id: f.empresa_id } : { nombre: f.nombre_snapshot || "Fila" }
          const created = (await api.post(`/archivos/${archivoId}/filas`, payload)).data
          const patch: any = {}
          if (f.responsable) patch.responsable = f.responsable
          if (f.observacion) patch.observacion = f.observacion
          if (Object.keys(patch).length) await api.put(`/archivos/${archivoId}/filas/${created.id}`, patch)
          // Restaurar checks de esa fila (los recreados nacen sin revisar)
          const want = tCeldas.filter((c: any) => c.fila_id === f.id && c.revisado)
          if (want.length) {
            const fresh = (await api.get(`/archivos/${archivoId}/celdas`)).data as any[]
            const byKey = new Map(fresh.filter((c: any) => c.fila_id === created.id).map((c: any) => [`${c.anio}-${c.mes}`, c]))
            await Promise.all(want.map((w: any) => {
              const hit = byKey.get(`${w.anio}-${w.mes}`)
              return hit ? api.put(`/archivos/celdas/${hit.id}`, { revisado: true }).catch(() => null) : null
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
      if (f.empresa_id !== s.empresa_id) patch.empresa_id = f.empresa_id ?? ""
      if ((f.nombre_snapshot ?? "") !== (s.nombre_snapshot ?? "") && !f.empresa_id) patch.nombre = f.nombre_snapshot
      if ((f.responsable ?? "") !== (s.responsable ?? "")) patch.responsable = f.responsable ?? ""
      if ((f.observacion ?? "") !== (s.observacion ?? "")) patch.observacion = f.observacion ?? ""
      if (Object.keys(patch).length) {
        try { await api.put(`/archivos/${archivoId}/filas/${f.id}`, patch) } catch { /* best-effort */ }
      }
      return null
    }))
    // Orden -> reorder si cambió la secuencia
    const tOrder = tFilas.slice().sort((a: any, b: any) => a.orden - b.orden).map((f: any) => f.id).join(",")
    const sOrder = sFilas.slice().sort((a: any, b: any) => a.orden - b.orden).map((f: any) => f.id).join(",")
    if (tOrder && tOrder !== sOrder) {
      try { await api.post(`/archivos/${archivoId}/filas/reorder`, { order: tFilas.slice().sort((a: any, b: any) => a.orden - b.orden).map((f: any) => f.id) }) } catch { /* best-effort */ }
    }
    // Celdas comunes (mismo id) con revisado distinto -> PUT
    const sById = new Map(sCeldas.map((c: any) => [c.id, c]))
    const changed = tCeldas.filter((c: any) => {
      if (recreatedOldIds.has(c.fila_id)) return false
      const s = sById.get(c.id)
      return s && !!s.revisado !== !!c.revisado
    })
    if (changed.length) {
      await Promise.all(changed.map((c: any) =>
        api.put(`/archivos/celdas/${c.id}`, { revisado: !!c.revisado }).catch(() => null)
      ))
    }
  }
  const doUndo = async () => {
    const st = useHistoryStore.getState()
    const current = snapshotCurrent(st.undoLabel() ?? "estado actual")
    const prev = st.popUndo(current)
    if (!prev) return
    applySnapshot(prev)
    hdr.setDirty(true)
    try { await syncSnapshotToServer(prev, current) } finally {
      qc.invalidateQueries({ queryKey: ["filas", archivoId] })
      qc.invalidateQueries({ queryKey: ["celdas", archivoId] })
      qc.invalidateQueries({ queryKey: ["archivo", archivoId] })
      qc.invalidateQueries({ queryKey: ["stats", archivoId] })
    }
  }
  const doRedo = async () => {
    const st = useHistoryStore.getState()
    const current = snapshotCurrent(st.redoLabel() ?? "estado actual")
    const next = st.popRedo(current)
    if (!next) return
    applySnapshot(next)
    hdr.setDirty(true)
    try { await syncSnapshotToServer(next, current) } finally {
      qc.invalidateQueries({ queryKey: ["filas", archivoId] })
      qc.invalidateQueries({ queryKey: ["celdas", archivoId] })
      qc.invalidateQueries({ queryKey: ["archivo", archivoId] })
      qc.invalidateQueries({ queryKey: ["stats", archivoId] })
    }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const editable = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)
      if (e.key === "Escape") {
        if (preview) { setPreview(false); return }
        if (sel) { setSel(null); return }
        return
      }
      if ((e.ctrlKey || e.metaKey) && !editable) {
        const k = e.key.toLowerCase()
        if (k === "z" && !e.shiftKey) { e.preventDefault(); doUndo() }
        else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); doRedo() }
      }
    }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [preview, sel, archivoId, filas, celdas, archivo])
  const toggle = useMutation({
    mutationFn: async (c: any) => {
      const myColor = PERSON_COLORS[activePerson] ?? ""
      if (!c.revisado) return (await api.put(`/archivos/celdas/${c.id}`, { revisado: true, color: myColor })).data
      const owner = PERSON_COLORS.indexOf(c.color ?? "")
      if (owner !== activePerson) return (await api.put(`/archivos/celdas/${c.id}`, { revisado: true, color: myColor })).data
      return (await api.put(`/archivos/celdas/${c.id}`, { revisado: false, color: "" })).data
    },
    onMutate: async (c: any) => {
      const myColor = PERSON_COLORS[activePerson] ?? ""
      const owner = PERSON_COLORS.indexOf(c?.color ?? "")
      const action = !c?.revisado ? "mark" : (owner !== activePerson ? "recolor" : "unmark")
      const color = action === "unmark" ? "" : myColor
      pushHistory(action === "mark" ? `Marcar mes · P${activePerson + 1}` : action === "recolor" ? `Recolorear mes P${owner + 1}→P${activePerson + 1}` : "Desmarcar mes")
      hdr.setDirty(true)
      await qc.cancelQueries({ queryKey: ["celdas", archivoId] })
      const prev = qc.getQueryData(["celdas", archivoId])
      qc.setQueryData(["celdas", archivoId], (old: any) => (old ?? []).map((x: any) => x.id === c.id ? { ...x, revisado: action !== "unmark", color } : x))
      return { prev }
    },
    onError: (_e, _c, ctx: any) => { if (ctx?.prev) qc.setQueryData(["celdas", archivoId], ctx.prev) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["celdas", archivoId] }); qc.invalidateQueries({ queryKey: ["stats", archivoId] }) },
  })
  // Recolorear la celda seleccionada desde el panel (marca si estaba vacía, nunca desmarca)
  const recolor = useMutation({
    mutationFn: async ({ id, color }: { id: string; color: string }) => (await api.put(`/archivos/celdas/${id}`, { revisado: true, color })).data,
    onMutate: async (v: { id: string; color: string }) => {
      await qc.cancelQueries({ queryKey: ["celdas", archivoId] })
      const prev = qc.getQueryData(["celdas", archivoId])
      const cur = ((prev as any[]) ?? []).find((x: any) => x.id === v.id)
      const from = PERSON_COLORS.indexOf(cur?.color ?? "")
      const to = PERSON_COLORS.indexOf(v.color)
      pushHistory(cur?.revisado ? `Recolorear mes ${from >= 0 ? `P${from + 1}→` : ""}P${to + 1}` : `Marcar mes · P${to + 1}`)
      hdr.setDirty(true)
      qc.setQueryData(["celdas", archivoId], (old: any) => (old ?? []).map((x: any) => x.id === v.id ? { ...x, revisado: true, color: v.color } : x))
      return { prev }
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(["celdas", archivoId], ctx.prev) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["celdas", archivoId] }); qc.invalidateQueries({ queryKey: ["stats", archivoId] }) },
  })
  const addFila = useMutation({ mutationFn: async (p:any) => (await api.post(`/archivos/${archivoId}/filas`, p)).data, onMutate: () => { pushHistory("Agregar fila"); hdr.setDirty(true) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["celdas", archivoId] }) } })
  const updateFila = useMutation({ mutationFn: async ({ fid, patch }: { fid: string; patch: any }) => (await api.put(`/archivos/${archivoId}/filas/${fid}`, patch)).data, onMutate: (v: any) => { pushHistory(v?.patch?.empresa_id !== undefined ? "Cambiar empresa" : "Editar fila"); hdr.setDirty(true) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["celdas", archivoId] }) } })
  const deleteFila = useMutation({ mutationFn: async (fid: string) => await api.delete(`/archivos/${archivoId}/filas/${fid}`), onMutate: () => { pushHistory("Eliminar fila"); hdr.setDirty(true) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["diseno", archivoId] }) } })
  const applyScale = useMutation({ mutationFn: async () => (await api.put(`/archivos/${archivoId}`, { periodo_inicio: Number(scaleStart), periodo_fin: Number(scaleEnd) })).data, onMutate: () => { pushHistory("Cambiar escala de años"); hdr.setDirty(true) }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["archivo", archivoId] }); qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["celdas", archivoId] }); qc.invalidateQueries({ queryKey: ["stats", archivoId] }) } })
  const updatePersonal = useMutation({ mutationFn: async (n:number) => (await api.put(`/archivos/${archivoId}`, { personal_count: n })).data, onMutate: ()=>{ pushHistory("Cambiar personal"); hdr.setDirty(true) }, onSuccess: ()=>qc.invalidateQueries({queryKey:["archivo",archivoId]}) })
  const saveTipo = (v:string) => { const t = v.trim(); if (t !== (archivo?.tipo_revision ?? "")) { pushHistory("Cambiar tipo de revisión"); hdr.setDirty(true); api.put(`/archivos/${archivoId}`,{tipo_revision:t}).then(()=>qc.invalidateQueries({queryKey:["archivo",archivoId]})) } }
  const isMutating = useIsMutating()
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [validAlert, setValidAlert] = useState<any[] | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!exportOpen) return
    const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false) }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setExportOpen(false) }
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [exportOpen])
  const orderedFilas = ((filas as any[]) ?? []).slice().sort((a: any, b: any) => a.orden - b.orden)
  // required for save/export: every row needs a registered empresa (months can be filled freely)
  const missingEmpresa = () => orderedFilas.filter((f: any) => !f.empresa_id).map((f: any, i: number) => ({ fila: i + 1, id: f.id, campo: "empresa", nombre: f.nombre_snapshot }))
  const guardar = async () => {
    const miss = missingEmpresa()
    if (miss.length) { setValidAlert(miss); return }
    setSaveState("saving")
    try {
      await Promise.all([
        qc.refetchQueries({ queryKey: ["archivo", archivoId] }),
        qc.refetchQueries({ queryKey: ["filas", archivoId] }),
        qc.refetchQueries({ queryKey: ["celdas", archivoId] }),
        qc.refetchQueries({ queryKey: ["stats", archivoId] }),
      ])
      hdr.set({ dirty: false } as any)
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 2000)
    } catch {
      setSaveState("idle")
    }
  }
  const exportar = async (fmt: "pdf" | "excel") => {
    const miss = missingEmpresa()
    if (miss.length) { setValidAlert(miss); return }
    try {
      const r = await api.get(`/archivos/${archivoId}/export?format=${fmt}`, { responseType: "blob" }); const url = URL.createObjectURL(r.data); const a=document.createElement("a"); a.href=url; a.download=`revision.${fmt==="pdf"?"pdf":"xlsx"}`; a.click(); URL.revokeObjectURL(url)
    } catch (e: any) {
      const falt = e?.response?.data?.detail?.faltantes
      if (e?.response?.status === 422 && falt) setValidAlert(falt)
    }
  }
  useEffect(()=>{ if(!archivo) return; hdr.set({ archivoId: archivo.id, titulo: archivo.titulo, filas: (filas as any)?.length ?? 0, dirty:false } as any)}, [archivo?.id, (archivo as any)?.titulo, (filas as any)?.length])
  useEffect(()=>{ hdr.set({ onSaveTitle: (v:string)=>{ if(v!==archivo?.titulo) { pushHistory("Cambiar título"); api.put(`/archivos/${archivoId}`,{titulo:v}).then(()=>qc.invalidateQueries({queryKey:["archivo",archivoId]})) } }, onExport: (fmt:any)=>exportar(fmt) } as any); return ()=>{ hdr.set({archivoId:null} as any)}}, [archivoId])
  if (!archivoId) return <div className="p-8 text-center text-[var(--text-dim)]">Creando...</div>
  if (!archivo || !filas) return <div className="p-8 text-[var(--text-dim)]">Cargando...</div>
  const map=new Map<string,any>(); celdas?.forEach((c:any)=>map.set(`${c.fila_id}-${c.anio}-${c.mes}`,c))
  const headBg = cfg.table_header_bg && cfg.table_header_bg !== "#e0e7ff" ? cfg.table_header_bg : ""
  const years=Array.from({length: archivo.periodo_fin - archivo.periodo_inicio + 1}, (_,i)=>archivo.periodo_inicio+i)
  const monthSum = years.reduce((s: number, y: number) => s + MESES.reduce((a: number, _, mi: number) => a + (colW[mKey(y, mi)] ?? 20), 0), 0)
  const fixedSum = (colW.n ?? 44) + (colW.empresa ?? 160) + 54
    + (cfg.visible_fields.responsable ? (colW.responsable ?? 90) : 0)
    + (cfg.visible_fields.observaciones ? (colW.observaciones ?? 140) : 0)
  const tableMinWidth = fixedSum + monthSum
  const personalOpts=Array.from({length: archivo.personal_count||2},(_,i)=>`P${i+1}`)
  const activePerson = Math.min(personIdx, Math.max(0, (archivo?.personal_count ?? 1) - 1))
  const ownerOf = (color: string | null | undefined) => PERSON_COLORS.indexOf(color ?? "")
  const selCeldas: any[] = (celdas as any[]) ?? []
  const selCelda = sel ? selCeldas.find((c: any) => c.fila_id === sel.filaId && c.anio === sel.anio && c.mes === sel.mes) : undefined
  const selFilaNombre = sel ? ((orderedFilas.find((f: any) => f.id === sel.filaId) as any)?.nombre_snapshot ?? "") : ""
  const move=(idx:number,dir:-1|1)=>{
    const o=[...orderedFilas]; const t=idx+dir; if(t<0||t>=o.length) return
    const tmp=o[idx]; o[idx]=o[t]; o[t]=tmp
    const next=o.map((f:any,i:number)=>({...f,orden:i}))
    const prev=qc.getQueryData(["filas",archivoId])
    pushHistory(dir===-1 ? "Subir fila" : "Bajar fila")
    hdr.setDirty(true)
    qc.setQueryData(["filas",archivoId], next)
    api.post(`/archivos/${archivoId}/filas/reorder`, { order: next.map((f:any)=>f.id) })
      .catch(()=>{ if(prev) qc.setQueryData(["filas",archivoId], prev) })
  }

  return (
    <div className="flex flex-1 min-w-0 min-h-0 bg-[var(--bg)]">
      {/* Canvas — white page like Foliora */}
      <div className="flex-1 bg-[var(--bg)] flex flex-col min-w-0 overflow-auto">
        <div className="sticky top-0 z-10 flex justify-center px-3 py-2 bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--border)] text-[12px] text-[var(--text-dim)]">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full bg-[var(--surface)] border border-[var(--border)] rounded-full pl-3 pr-1.5 py-1 shadow-sm" role="toolbar" aria-label="Herramientas del editor">
            <span className="text-[var(--text)] whitespace-nowrap">Página 1</span>
            <span aria-hidden className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
            <div className="flex items-center gap-0.5" role="group" aria-label="Orientación de hoja">
              <button onClick={()=>changeOrientation("vertical")} title="Vertical" aria-pressed={orientation==="vertical"} className={`w-7 h-7 flex items-center justify-center rounded-full transition ${orientation==="vertical" ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}>
                <RectangleVertical size={13}/>
              </button>
              <button onClick={()=>changeOrientation("horizontal")} title="Horizontal" aria-pressed={orientation==="horizontal"} className={`w-7 h-7 flex items-center justify-center rounded-full transition ${orientation==="horizontal" ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}>
                <RectangleHorizontal size={13}/>
              </button>
            </div>
            <span aria-hidden className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
            <div className="flex items-center gap-0.5" role="group" aria-label="Zoom de hoja">
              <button onClick={()=>stepZoom(-1)} title="Reducir zoom" aria-label="Reducir zoom" className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition">
                <Minus size={13}/>
              </button>
              <button onClick={()=>changeZoom(defaultZoom(orientation))} title="Restablecer zoom" className="px-1.5 text-[11px] font-mono text-[var(--text)] hover:text-[var(--text)] min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={()=>stepZoom(1)} title="Ampliar zoom" aria-label="Ampliar zoom" className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition">
                <Plus size={13}/>
              </button>
            </div>
            <span aria-hidden className="hidden md:block w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
            <div className="hidden md:flex items-center gap-0.5" role="group" aria-label="Edición">
              <button onClick={doUndo} disabled={pastLen===0} title={undoTip ? `Deshacer: ${undoTip} (Ctrl+Z)` : "Deshacer (Ctrl+Z)"} className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition disabled:opacity-40 disabled:hover:text-[var(--text-dim)] disabled:cursor-not-allowed" aria-label="Deshacer"><Undo2 size={13}/></button>
              <button onClick={doRedo} disabled={futureLen===0} title={redoTip ? `Rehacer: ${redoTip} (Ctrl+Y)` : "Rehacer (Ctrl+Y)"} className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition disabled:opacity-40 disabled:hover:text-[var(--text-dim)] disabled:cursor-not-allowed" aria-label="Rehacer"><Redo2 size={13}/></button>
              <button onClick={()=>{ setPreview(true); setSel(null) }} title="Vista previa (solo hoja)" aria-label="Vista previa" aria-pressed={preview} className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition"><Eye size={13}/></button>
            </div>
            <span aria-hidden className="w-px h-5 bg-[var(--border)] mx-1 shrink-0" />
            <button onClick={guardar} disabled={isMutating > 0 || saveState === "saving"} title="Validar y guardar" className={`flex items-center gap-1.5 rounded-full px-3 h-7 text-[12px] font-medium transition border whitespace-nowrap ${saveState === "saved" ? "bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--success)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:text-[var(--text)] hover:border-[var(--accent-border)]"} disabled:opacity-50`}>
              {saveState === "saved" ? <><Check size={13}/> Guardado</> : saveState === "saving" ? "Guardando..." : <><Save size={13}/> Guardar</>}
            </button>
            <div ref={exportRef} className="relative shrink-0">
              <button onClick={()=>setExportOpen(!exportOpen)} title="Exportar" aria-haspopup="menu" aria-expanded={exportOpen} className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[12px] font-medium bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] transition whitespace-nowrap">
                <Download size={13}/> Exportar <span className="text-[10px]">▾</span>
              </button>
              {exportOpen && (
                <div role="menu" className="absolute right-0 top-full mt-1 w-[150px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-1.5 z-30">
                  <button role="menuitem" onClick={()=>{ setExportOpen(false); exportar("pdf") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">Descargar PDF</button>
                  <button role="menuitem" onClick={()=>{ setExportOpen(false); exportar("excel") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">Descargar Excel</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 p-6 overflow-auto bg-[var(--bg)]">
          {preview && (
            <>
              <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md" onClick={()=>setPreview(false)} aria-hidden />
              <button onClick={()=>setPreview(false)} title="Salir de vista previa (Esc)" className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 h-9 text-[12px] font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shadow-xl hover:border-[var(--accent-border)] transition">
                ✕ Salir de vista previa <span className="text-[10px] text-[var(--text-dim)]">Esc</span>
              </button>
            </>
          )}
          <div style={{ width: sheetBase.w, minHeight: sheetBase.h }} className={`max-w-none mx-auto bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-lg overflow-hidden transition-all duration-300 relative ${preview ? "z-50 ring-2 ring-[var(--accent-border)]" : ""}`}>
            <div className="p-6" style={{ zoom: zoom }}>
              <div className="flex items-center gap-2 mb-3 text-xs">
                {archivo.tipo_revision ? <span className="px-2 py-1 rounded bg-[var(--sheet-soft)] border border-[var(--sheet-border)] text-[var(--sheet-ink)]">{archivo.tipo_revision}</span> : null}
                <span className="text-[var(--text-dim)]">{archivo.periodo_inicio} — {archivo.periodo_fin} • {filas.length} filas</span>
              </div>
              {cfg.show_summary && stats && (
                <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-[var(--sheet-soft)] border border-[var(--sheet-border)] text-[11px]">
                  <span className="flex items-center gap-1.5 text-[var(--success)]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Revisadas <b>{stats.revisadas}/{stats.total || filas.length}</b></span>
                  <span className="flex items-center gap-1.5 text-[var(--warning)]"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"/>Pendientes <b>{stats.pendientes}</b></span>
                  <span className="flex items-center gap-2 text-[var(--sheet-ink)] ml-auto"><span>Progreso <b>{stats.progreso}%</b></span><span className="w-24 h-1.5 bg-[var(--surface)] border border-[var(--sheet-border)] rounded-full overflow-hidden inline-block"><span className="block h-full bg-[var(--sheet-accent)]" style={{width:`${stats.progreso}%`}}/></span></span>
                </div>
              )}
              <div className={`overflow-auto ${preview ? "pointer-events-none select-none" : ""}`}>
                <table className={`w-full text-xs border-collapse border border-[var(--sheet-border)] table-${cfg.table_density}`} style={{ minWidth: tableMinWidth }} aria-readonly={preview || undefined}>
                  <thead>
                    <tr className="bg-[var(--sheet-soft)] border-y border-[var(--sheet-border)]" style={headBg ? { background: headBg } : undefined}>
                      <th rowSpan={2} style={{ ...colStyle("n"), ...guideShadowX("n"), ...guideShadowY(HEADER_KEY) }} className="p-2 w-[44px] text-left text-[var(--sheet-ink)] font-semibold align-middle border-x border-[var(--sheet-border)] relative">N.{!preview && <DragHandle axis="x" title="Ancho de columna (doble clic: auto)" zoom={zoom} startV={colW.n ?? 44} min={28} onV={(w)=>resizeCol("n", w)} onReset={()=>resetCol("n")} {...guideProps("x", "n")} />}{!preview && <DragHandle axis="y" title="Altura del encabezado (doble clic: auto)" zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>
                      <th rowSpan={2} style={{ ...colStyle("empresa"), ...guideShadowX("empresa"), ...guideShadowY(HEADER_KEY) }} className="p-2 text-center text-[var(--sheet-ink)] font-semibold min-w-[160px] align-middle border-x border-[var(--sheet-border)] relative">Empresa{!preview && <DragHandle axis="x" title="Ancho de columna (doble clic: auto)" zoom={zoom} startV={colW.empresa ?? 160} min={60} onV={(w)=>resizeCol("empresa", w)} onReset={()=>resetCol("empresa")} {...guideProps("x", "empresa")} />}{!preview && <DragHandle axis="y" title="Altura del encabezado (doble clic: auto)" zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>
                      <th colSpan={years.length * 12} className="p-2 text-center text-[var(--sheet-ink)] font-semibold text-[12px] border-x border-[var(--sheet-border)]">Año / Meses</th>
                      {cfg.visible_fields.responsable && <th rowSpan={2} style={{ ...colStyle("responsable"), ...guideShadowX("responsable"), ...guideShadowY(HEADER_KEY) }} className="p-2 text-center text-[var(--sheet-ink)] font-semibold align-middle min-w-[90px] border-x border-[var(--sheet-border)] relative">Responsable{!preview && <DragHandle axis="x" title="Ancho de columna (doble clic: auto)" zoom={zoom} startV={colW.responsable ?? 90} min={60} onV={(w)=>resizeCol("responsable", w)} onReset={()=>resetCol("responsable")} {...guideProps("x", "responsable")} />}{!preview && <DragHandle axis="y" title="Altura del encabezado (doble clic: auto)" zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>}
                      {cfg.visible_fields.observaciones && <th rowSpan={2} style={{ ...colStyle("observaciones"), ...guideShadowX("observaciones"), ...guideShadowY(HEADER_KEY) }} className="p-2 text-center text-[var(--sheet-ink)] font-semibold align-middle min-w-[140px] border-x border-[var(--sheet-border)] relative">Observaciones{!preview && <DragHandle axis="x" title="Ancho de columna (doble clic: auto)" zoom={zoom} startV={colW.observaciones ?? 140} min={60} onV={(w)=>resizeCol("observaciones", w)} onReset={()=>resetCol("observaciones")} {...guideProps("x", "observaciones")} />}{!preview && <DragHandle axis="y" title="Altura del encabezado (doble clic: auto)" zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}</th>}
                    </tr>
                    <tr style={{ ...(headBg ? { background: headBg } : null), ...(headerH ? { height: headerH } : null) }} className="bg-[var(--sheet-soft)] border-b border-[var(--sheet-border)]">
                      {years.map(y=>(
                        <th key={y} colSpan={12} style={guideShadowY(HEADER_KEY) ?? undefined} className="p-0 text-center text-[var(--sheet-ink)] font-semibold text-[11px] border-x border-[var(--sheet-border)] relative"><div className="pt-1 pb-0.5 border-b border-[var(--sheet-border)]">{y}</div><div className="flex items-stretch text-[9px] font-normal text-[var(--sheet-ink)]">{MESES.map((m, mi)=> {
                          const mk = mKey(y, mi)
                          return <span key={`${y}-${mi}-${m}`} style={{ ...monthStyle(mk), ...guideShadowX(mk), ...(guideRow(HEADER_KEY) ? { borderLeftColor: GUIDE } : null) }} className={`${monthCls(mk)} flex items-center justify-center ${mi === 0 ? "border-l-0" : "border-l border-[var(--sheet-border)]"}`}>{m}{!preview && <DragHandle axis="x" title="Ancho del mes (doble clic: auto)" zoom={zoom} startV={colW[mk] ?? 20} min={16} onV={(w)=>resizeCol(mk, w)} onReset={()=>resetCol(mk)} {...guideProps("x", mk)} />}</span>
                        })}</div>
                          {!preview && <DragHandle axis="y" title="Altura del encabezado (doble clic: auto)" zoom={zoom} startV={headerH ?? 44} min={40} onV={(h)=>resizeRow(HEADER_KEY, h)} onReset={()=>resetRow(HEADER_KEY)} {...guideProps("y", HEADER_KEY)} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.length===0 ? (
                      <tr><td colSpan={2 + years.length*12 + (cfg.visible_fields.responsable?1:0) + (cfg.visible_fields.observaciones?1:0)} className="p-12 text-center text-[var(--text-dim)]"><div className="text-sm">Tu papel está en blanco</div></td></tr>
                    ) : (
                      filas.slice().sort((a:any,b:any)=>a.orden-b.orden).map((fila:any, idx:number)=>(
                        <tr key={fila.id} style={rowH[fila.id] ? { height: rowH[fila.id] } : undefined} className="border-t border-b border-[var(--sheet-border)] hover:bg-[var(--sheet-soft)]">
                          <td className="p-2 text-center text-[var(--text-dim)] text-xs relative group border-x border-[var(--sheet-border)]" style={{ ...colStyle("n"), ...guideShadowX("n"), ...guideShadowY(fila.id) }}>
                            {idx+1}
                            {!preview && <RowMenu fila={fila} idx={idx} total={orderedFilas.length} onMove={(dir)=>move(idx,dir)} onDelete={()=>deleteFila.mutate(fila.id)} />}
                            {!preview && <DragHandle axis="y" title="Alto de fila (doble clic: auto)" zoom={zoom} startV={rowH[fila.id] ?? 33} min={28} onV={(h)=>resizeRow(fila.id, h)} onReset={()=>resetRow(fila.id)} {...guideProps("y", fila.id)} />}
                          </td>
                          <td className="p-2 relative text-center border-x border-[var(--sheet-border)]" style={{ ...colStyle("empresa"), ...guideShadowX("empresa"), ...guideShadowY(fila.id) }}>
                            <button disabled={preview} onClick={()=>setPickFilaId(pickFilaId===fila.id?null:fila.id)} title={fila.nombre_snapshot ? "Cambiar empresa" : "Elegir empresa"} className={`rounded px-2 h-7 w-full text-xs flex items-center gap-1 border border-transparent hover:border-[var(--sheet-border)] hover:bg-[var(--sheet-soft)] disabled:hover:border-transparent disabled:hover:bg-transparent disabled:cursor-default ${fila.nombre_snapshot ? "font-medium text-[#1e293b]" : ""}`}>
                              <span className="flex-1 text-left truncate">{fila.nombre_snapshot || " "}</span>
                              <span className={`text-[10px] ml-auto ${fila.nombre_snapshot ? "text-[var(--text-dim)]" : "text-[var(--text-dim)]"}`}>▾</span>
                            </button>
                            {pickFilaId===fila.id && empresas && <EmpresaPicker fila={fila} empresas={empresas} onClose={()=>setPickFilaId(null)} onSelect={async(v)=>{ await updateFila.mutateAsync({ fid: fila.id, patch: v as any }); setPickFilaId(null) }} />}
                          </td>
                          {years.map(y=>(
                            <td key={y} colSpan={12} className="p-0 border-x border-[var(--sheet-border)]" style={guideShadowY(fila.id) ?? undefined}>
                              <div className="flex items-stretch h-full">
                                {MESES.map((_, mi)=>{
                                  const c = map.get(`${fila.id}-${y}-${mi+1}`)
                                  const mk = mKey(y, mi)
                                  const accentL = guideRow(fila.id) ? { borderLeftColor: GUIDE } : null
                                  if(!c) return <span key={mi} style={{ ...monthStyle(mk), ...accentL, ...guideShadowY(fila.id) }} className={`${monthCls(mk)} grid place-items-center py-2 ${mi === 0 ? "border-l-0" : "border-l border-[var(--sheet-border)]"}`} title="Cargando..."><input type="checkbox" disabled aria-label="Cargando mes" className="w-4 h-4 accent-[var(--sheet-accent)] opacity-60" /></span>
                                  const owner = ownerOf(c.color)
                                  const isMine = owner === activePerson
                                  const selected = !preview && sel?.filaId === fila.id && sel?.anio === y && sel?.mes === mi + 1
                                  return <label key={mi} data-sel-zone onClick={(e)=>{ if ((e.target as HTMLElement).tagName === "INPUT") return; e.preventDefault(); setSel((s) => (s && s.filaId === fila.id && s.anio === y && s.mes === mi + 1 ? null : { filaId: fila.id, anio: y, mes: mi + 1 })) }} style={{ ...monthStyle(mk), ...accentL, ...guideShadowY(fila.id), ...(selected ? { backgroundColor: "var(--accent-soft)", boxShadow: "inset 0 0 0 2px var(--accent)" } : null) }} className={`${monthCls(mk)} grid place-items-center py-2 h-full ${mi === 0 ? "border-l-0" : "border-l border-[var(--sheet-border)]"} cursor-pointer hover:bg-[var(--sheet-soft)]`} title={c.revisado ? (owner >= 0 && !isMine ? `Marcado por P${owner + 1} · clic en el check para remarcar como P${activePerson + 1}` : "Marcado · clic en el check para desmarcar") : `Marcar como P${activePerson + 1}`}>
                                    <input type="checkbox" aria-label={`Mes ${mi + 1} de ${y}`} checked={!!c.revisado} onChange={()=>{ toggle.mutate(c); setSel(null) }} style={c.color ? { accentColor: c.color } : undefined} className="w-4 h-4 accent-[var(--sheet-accent)] cursor-pointer" />
                                  </label>
                                })}
                              </div>
                            </td>
                          ))}
                          {cfg.visible_fields.responsable && (
                            <td className="p-0 min-w-[90px] border-x border-[var(--sheet-border)]" style={{ ...colStyle("responsable"), ...guideShadowX("responsable"), ...guideShadowY(fila.id) }}>
                              <FilaTextCell field="responsable" fila={fila} onSave={v=>updateFila.mutate({ fid: fila.id, patch:{ responsable: v } })} />
                            </td>
                          )}
                          {cfg.visible_fields.observaciones && (
                            <td className="p-0 min-w-[140px] border-x border-[var(--sheet-border)]" style={{ ...colStyle("observaciones"), ...guideShadowX("observaciones"), ...guideShadowY(fila.id) }}>
                              <FilaTextCell field="observacion" fila={fila} onSave={v=>updateFila.mutate({ fid: fila.id, patch:{ observacion: v } })} />
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
                <Button onClick={()=>addFila.mutate({ nombre: `Fila ${filas.length+1}` })} className="w-full h-8 rounded-lg border border-dashed border-[var(--sheet-border)] bg-[var(--sheet-soft)] hover:brightness-95 text-[var(--sheet-accent)] text-xs font-medium gap-1.5"><Plus size={13}/> Agregar fila</Button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel fusionado — 2 subpestañas, colapsable */}
      <div className={`${rightCollapsed ? "w-[56px]" : "w-[320px]"} bg-[var(--bg)] border-l border-[var(--border)] flex flex-col shrink-0 overflow-hidden hidden xl:flex transition-all duration-300`}>
        {rightCollapsed ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <button onClick={()=>setRightCollapsed(false)} title={`Expandir panel (${panelTab === "tabla" ? "Tabla" : "Diseño"})`} aria-label="Expandir panel" className="group/panel relative w-9 h-9 rounded-xl hover:bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition">
              {panelTab === "tabla" ? <Table2 size={16} className="transition-opacity duration-150 group-hover/panel:opacity-0" /> : <Palette size={16} className="transition-opacity duration-150 group-hover/panel:opacity-0" />}
              <PanelRightOpen size={16} className="absolute inset-0 m-auto opacity-0 group-hover/panel:opacity-100 transition-opacity duration-150" />
            </button>
            {panelTab === "tabla" ? (
              <button onClick={()=>{ setPanelTab("diseno"); setRightCollapsed(false) }} title="Diseño" aria-label="Ir a Diseño" className="w-9 h-9 rounded-xl flex items-center justify-center transition text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent">
                <Palette size={16}/>
              </button>
            ) : (
              <button onClick={()=>{ setPanelTab("tabla"); setRightCollapsed(false) }} title="Tabla" aria-label="Ir a Tabla" className="w-9 h-9 rounded-xl flex items-center justify-center transition text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent">
                <Table2 size={16}/>
              </button>
            )}
          </div>
        ) : (
        <>
        <div className="px-3 pt-3 shrink-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)] px-1 mb-2">
            <Settings2 size={14}/> Panel
            <button onClick={()=>setRightCollapsed(true)} title="Colapsar panel" className="ml-auto w-7 h-7 rounded-lg hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition">
              <PanelRightClose size={14}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]" role="tablist" aria-label="Panel del editor">
            <button
              role="tab"
              aria-selected={panelTab === "tabla"}
              onClick={() => setPanelTab("tabla")}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition ${panelTab === "tabla" ? "bg-[var(--surface-2)] text-[var(--text)] shadow-sm border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}
            >
              <Table2 size={13}/> Tabla
            </button>
            <button
              role="tab"
              aria-selected={panelTab === "diseno"}
              onClick={() => setPanelTab("diseno")}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition ${panelTab === "diseno" ? "bg-[var(--surface-2)] text-[var(--text)] shadow-sm border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"}`}
            >
              <Palette size={13}/> Diseño
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          {panelTab === "tabla" ? (
          <>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-3">
            <div className="text-[11px] font-semibold text-[var(--text)] tracking-wide flex items-center gap-1.5"><Calendar size={12}/> Datos de tabla</div>
            <div><label className="text-[10px] text-[var(--text-dim)]">Tipo de revisión</label><Input placeholder="Ej. Compras, Ventas…" value={tipoTmp} onChange={e=>setTipoTmp(e.target.value)} onBlur={()=>saveTipo(tipoTmp)} onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }} className="h-8 mt-1 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] text-xs placeholder:text-[var(--text-dim)]" /></div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] text-[var(--text-dim)]">Inicio</label><NumberStepper ariaLabel="Año de inicio" value={scaleStart} onChange={setScaleStart} className="mt-1 w-full" /></div>
              <div className="flex-1"><label className="text-[10px] text-[var(--text-dim)]">Fin</label><NumberStepper ariaLabel="Año de fin" value={scaleEnd} onChange={setScaleEnd} className="mt-1 w-full" /></div>
            </div>
            <Button onClick={()=>applyScale.mutate()} disabled={applyScale.isPending || scaleStart>scaleEnd} className="w-full h-7 bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] text-xs rounded-full">Aplicar escala</Button>
            <div className="flex items-center gap-2 pt-1">
              <Users size={12} className="text-[var(--text-dim)] shrink-0" />
              <NumberStepper dense ariaLabel="Cantidad de personal" min={1} max={10} value={archivo.personal_count ?? 2} onChange={(n)=>{ updatePersonal.mutate(n)}} className="w-[104px]" />
              <span className="text-xs text-[var(--text-dim)] truncate">{personalOpts.join(", ")}</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
              <div className="text-[10px] text-[var(--text-dim)]">Personas · marca con tu color</div>
              <div className="grid grid-cols-2 gap-1">
                {personalOpts.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    onClick={()=>choosePerson(i)}
                    aria-pressed={activePerson === i}
                    title={`Marcar como ${p}`}
                    className={`flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs transition border ${activePerson === i ? "bg-[var(--surface-2)] text-[var(--text)] border-[var(--accent-border)] font-medium" : "text-[var(--text-dim)] hover:text-[var(--text)] border-transparent hover:bg-[var(--surface-2)]"}`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ background: PERSON_COLORS[i] }} />
                    <span className="truncate">{p}</span>
                    {activePerson === i && <Check size={12} className="ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            {selCelda && (
              <div data-sel-zone className="border-t border-[var(--border)] pt-2 space-y-1.5">
                <div className="text-[10px] text-[var(--text-dim)]">Color del seleccionado</div>
                <div className="text-xs text-[var(--text)] font-medium truncate">
                  {selFilaNombre || "Fila"} · {MESES[(sel?.mes ?? 1) - 1]} {sel?.anio} · {selCelda.color && ownerOf(selCelda.color) >= 0 ? `P${ownerOf(selCelda.color) + 1}` : "sin marcar"}
                </div>
                <div className="grid grid-cols-5 gap-1" role="group" aria-label="Paleta de personas">
                  {PERSON_COLORS.slice(0, archivo.personal_count || 2).map((cc, i) => (
                    <button
                      key={cc}
                      type="button"
                      onClick={()=>recolor.mutate({ id: selCelda.id, color: cc })}
                      aria-pressed={selCelda.color === cc}
                      aria-label={`Pintar P${i + 1}`}
                      title={`P${i + 1}`}
                      className={`h-7 rounded-lg border-2 transition ${selCelda.color === cc ? "border-[var(--accent)]" : "border-black/10 hover:scale-105"}`}
                      style={{ background: cc }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between text-xs"><span className="text-[var(--text-dim)]">Total</span><span className="text-[var(--text)] font-medium">{filas.length} · {years.length} años</span></div>
            <div className="border-t border-[var(--border)] pt-2 space-y-2">
              <div className="text-[10px] text-[var(--text-dim)]">Columnas visibles</div>
              <label className="flex items-center justify-between text-xs text-[var(--text-dim)] cursor-pointer">Responsable<input type="checkbox" checked={cfg.visible_fields.responsable} onChange={e=>cfg.set({visible_fields:{...cfg.visible_fields,responsable:e.target.checked}})} className="w-4 h-4 accent-[var(--sheet-accent)] cursor-pointer" /></label>
              <label className="flex items-center justify-between text-xs text-[var(--text-dim)] cursor-pointer">Observaciones<input type="checkbox" checked={cfg.visible_fields.observaciones} onChange={e=>cfg.set({visible_fields:{...cfg.visible_fields,observaciones:e.target.checked}})} className="w-4 h-4 accent-[var(--sheet-accent)] cursor-pointer" /></label>
            </div>
          </div>
          </>
          ) : (
          <>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-3">
            <div className="text-[12px] font-medium text-[var(--text)] flex items-center gap-1.5"><Palette size={12}/> Estilos</div>
            <div className="flex items-center justify-between"><span className="text-[11px] text-[var(--text-dim)]">Color de la hoja</span><Button onClick={()=>cfg.set({primary_color:""})} aria-pressed={!cfg.primary_color || ["#6366f1","#EC4899","#ec4899"].includes(cfg.primary_color)} title="Seguir el acento del tema" className="h-6 px-2.5 rounded-full text-[11px] bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]">Auto</Button></div>
            <div className="flex items-center justify-between"><span className="text-[11px] text-[var(--text-dim)]">Personalizado</span><div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 w-[148px] justify-between relative"><span className="w-4 h-4 rounded" style={{background: cfg.primary_color || "var(--accent)"}}/><span className="text-[11px] text-[var(--text)]">{cfg.primary_color || "Tema"}</span><input type="color" aria-label="Color personalizado de la hoja" value={cfg.primary_color || "#EC4899"} onChange={e=>cfg.set({primary_color:e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div>
            <div className="flex gap-1.5 flex-wrap">
              {["#EC4899","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444"].map(c=>(
                <button key={c} title={c} aria-label={`Color ${c}`} aria-pressed={cfg.primary_color===c} onClick={()=>cfg.set({primary_color:c})} className="w-7 h-7 rounded-full border-2" style={{background:c, borderColor: cfg.primary_color===c ? "white" : "var(--border)", boxShadow: cfg.primary_color===c ? "0 0 0 2px var(--accent)" : "none"}}/>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-2">
            <div className="text-[12px] font-medium text-[var(--text)] flex items-center gap-1.5"><FileText size={12}/> Apariencia de tabla</div>
            <label className="flex items-center justify-between text-xs text-[var(--text-dim)]">Densidad
              <select value={cfg.table_density} onChange={e=>cfg.set({table_density:e.target.value as any})} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text)]">
                <option value="compact">Compacta</option><option value="normal">Normal</option><option value="comfortable">Cómoda</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-xs text-[var(--text-dim)]">Resumen<input type="checkbox" checked={cfg.show_summary} onChange={e=>cfg.set({show_summary:e.target.checked})} className="accent-[var(--sheet-accent)]" /></label>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3 space-y-2">
            <div className="text-[12px] font-medium text-[var(--text)] flex items-center justify-between">Fondo cabecera<Button onClick={()=>cfg.set({table_header_bg:""})} aria-pressed={!headBg} title="Seguir el color de la hoja" className="h-6 px-2.5 rounded-full text-[11px] bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]">Auto</Button></div>
            <div className="flex items-center gap-2"><span className="w-6 h-6 rounded border" style={{background: headBg || "var(--sheet-soft)"}}/><input type="color" aria-label="Color de fondo de cabecera" value={headBg || "#EC4899"} onChange={e=>cfg.set({table_header_bg:e.target.value})} className="flex-1 h-8 bg-transparent cursor-pointer" /><span className="text-xs text-[var(--text-dim)]">{headBg || "Auto"}</span></div>
          </div>
          </>
          )}
        </div>
        </div>
        </>
        )}
      </div>

      {/* Alert: required fields missing for save/export */}
      {validAlert && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={()=>setValidAlert(null)}>
          <div className="w-[400px] max-w-full bg-white rounded-2xl shadow-2xl p-5 text-[#1e293b]" onClick={e=>e.stopPropagation()}>
            <div className="text-sm font-semibold mb-1">Faltan campos para guardar/exportar</div>
            <p className="text-xs text-[#64748b] mb-3">Cada fila necesita una empresa registrada. Puedes seguir editando los meses libremente.</p>
            <ul className="max-h-[220px] overflow-auto space-y-1.5 mb-4">
              {validAlert.map((m:any)=>(
                <li key={m.id} className="text-xs px-3 py-2 rounded-lg bg-[var(--sheet-soft)] border border-[var(--sheet-border)]">
                  Fila {m.fila} — “{m.nombre}” sin empresa
                </li>
              ))}
            </ul>
            <Button onClick={()=>setValidAlert(null)} className="w-full bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)]">Revisar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
