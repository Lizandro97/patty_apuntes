import { useQuery, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useParams } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfigStore } from "@/stores/config"
import { useEditorHeaderStore } from "@/stores/editorHeader"
import { useUiStore } from "@/stores/ui"
import { currentYear, newArchivoPayload } from "@/lib/defaults"
import { Plus, Minus, Trash2, ArrowUp, ArrowDown, Users, Calendar, Check, Save, Download, Eye, Undo2, Redo2, Settings2, FileText, Table2, Palette, RectangleVertical, RectangleHorizontal, PanelRightClose, PanelRightOpen } from "lucide-react"

const MESES = ["E","F","M","A","M","J","J","A","S","O","N","D"]

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

function FilaTextCell({ fila, field, onSave }: { fila: any; field: "responsable" | "observacion"; onSave: (v: string) => void }) {
  const [v, setV] = useState(fila?.[field] ?? "")
  useEffect(()=> setV(fila?.[field] ?? ""), [fila?.id, fila?.[field]])
  return <input aria-label={field === "responsable" ? "Responsable" : "Observaciones"} value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!== (fila?.[field] ?? "")) onSave(v)}} onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }} placeholder="—" className="w-full min-w-0 max-w-full h-7 px-2 text-xs border border-transparent hover:border-[var(--sheet-border)] focus:border-[var(--sheet-accent)] rounded focus:outline-none bg-transparent text-[#1e293b]" />
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
  const ZOOM_STEPS = [0.5, 0.6, 0.75, 1, 1.25, 1.5]
  const defaultZoom = (_o: "vertical" | "horizontal") => 1
  const [zoom, setZoom] = useState(1)
  const stepZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.reduce((best, v, idx) => (Math.abs(v - zoom) < Math.abs(ZOOM_STEPS[best] - zoom) ? idx : best), 0)
    const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + dir))
    setZoom(ZOOM_STEPS[next])
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
  useEffect(() => { if (archivo) { setScaleStart(archivo.periodo_inicio); setScaleEnd(archivo.periodo_fin); setTipoTmp(archivo.tipo_revision ?? "") } }, [archivo])
  const createArchivo = useMutation({ mutationFn: async () => (await api.post("/archivos", newArchivoPayload())).data, onSuccess: (d) => setArchivoId(d.id) })
  useEffect(() => { if (!id && !archivoId) createArchivo.mutate() }, [])
  const toggle = useMutation({
    mutationFn: async (c: any) => (await api.put(`/archivos/celdas/${c.id}`, { revisado: !c.revisado })).data,
    onMutate: async (c: any) => {
      hdr.setDirty(true)
      await qc.cancelQueries({ queryKey: ["celdas", archivoId] })
      const prev = qc.getQueryData(["celdas", archivoId])
      qc.setQueryData(["celdas", archivoId], (old: any) => (old ?? []).map((x: any) => x.id === c.id ? { ...x, revisado: !x.revisado } : x))
      return { prev }
    },
    onError: (_e, _c, ctx: any) => { if (ctx?.prev) qc.setQueryData(["celdas", archivoId], ctx.prev) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["celdas", archivoId] }); qc.invalidateQueries({ queryKey: ["stats", archivoId] }) },
  })
  const addFila = useMutation({ mutationFn: async (p:any) => (await api.post(`/archivos/${archivoId}/filas`, p)).data, onMutate: () => hdr.setDirty(true), onSuccess: () => { qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["celdas", archivoId] }) } })
  const updateFila = useMutation({ mutationFn: async ({ fid, patch }: { fid: string; patch: any }) => (await api.put(`/archivos/${archivoId}/filas/${fid}`, patch)).data, onMutate: () => hdr.setDirty(true), onSuccess: () => { qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["celdas", archivoId] }) } })
  const deleteFila = useMutation({ mutationFn: async (fid: string) => await api.delete(`/archivos/${archivoId}/filas/${fid}`), onMutate: () => hdr.setDirty(true), onSuccess: () => qc.invalidateQueries({ queryKey: ["filas", archivoId] }) })
  const applyScale = useMutation({ mutationFn: async () => (await api.put(`/archivos/${archivoId}`, { periodo_inicio: Number(scaleStart), periodo_fin: Number(scaleEnd) })).data, onMutate: () => hdr.setDirty(true), onSuccess: () => qc.invalidateQueries({ queryKey: ["archivo", archivoId] }) })
  const updatePersonal = useMutation({ mutationFn: async (n:number) => (await api.put(`/archivos/${archivoId}`, { personal_count: n })).data, onMutate: ()=>hdr.setDirty(true), onSuccess: ()=>qc.invalidateQueries({queryKey:["archivo",archivoId]}) })
  const saveTipo = (v:string) => { const t = v.trim(); if (t !== (archivo?.tipo_revision ?? "")) { hdr.setDirty(true); api.put(`/archivos/${archivoId}`,{tipo_revision:t}).then(()=>qc.invalidateQueries({queryKey:["archivo",archivoId]})) } }
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
  useEffect(()=>{ hdr.set({ onSaveTitle: (v:string)=>{ if(v!==archivo?.titulo) api.put(`/archivos/${archivoId}`,{titulo:v}).then(()=>qc.invalidateQueries({queryKey:["archivo",archivoId]})) }, onExport: (fmt:any)=>exportar(fmt) } as any); return ()=>{ hdr.set({archivoId:null} as any)}}, [archivoId])
  if (!archivoId) return <div className="p-8 text-center text-[var(--text-dim)]">Creando...</div>
  if (!archivo || !filas) return <div className="p-8 text-[var(--text-dim)]">Cargando...</div>
  const map=new Map<string,any>(); celdas?.forEach((c:any)=>map.set(`${c.fila_id}-${c.anio}-${c.mes}`,c))
  const headBg = cfg.table_header_bg && cfg.table_header_bg !== "#e0e7ff" ? cfg.table_header_bg : ""
  const years=Array.from({length: archivo.periodo_fin - archivo.periodo_inicio + 1}, (_,i)=>archivo.periodo_inicio+i)
  const personalOpts=Array.from({length: archivo.personal_count||2},(_,i)=>`P${i+1}`)
  const move=(idx:number,dir:-1|1)=>{
    const o=[...orderedFilas]; const t=idx+dir; if(t<0||t>=o.length) return
    const tmp=o[idx]; o[idx]=o[t]; o[t]=tmp
    const next=o.map((f:any,i:number)=>({...f,orden:i}))
    const prev=qc.getQueryData(["filas",archivoId])
    hdr.setDirty(true)
    qc.setQueryData(["filas",archivoId], next)
    api.post(`/archivos/${archivoId}/filas/reorder`, { order: next.map((f:any)=>f.id) })
      .catch(()=>{ if(prev) qc.setQueryData(["filas",archivoId], prev) })
  }

  return (
    <div className="flex flex-1 min-w-0 min-h-0 bg-[var(--bg)]">
      {/* Canvas — white page like Foliora */}
      <div className="flex-1 bg-[var(--bg)] flex flex-col min-w-0 overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg)] border-b border-[var(--border)] text-[12px] text-[var(--text-dim)]">
          <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-1">
            <span className="px-2 text-[var(--text)]">Página 1</span>
          </div>
          <div className="flex items-center gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-full p-0.5" role="group" aria-label="Orientación de hoja">
            <button onClick={()=>{ setOrientation("vertical"); setZoom(defaultZoom("vertical")) }} title="Vertical" className={`w-7 h-6 flex items-center justify-center rounded-full transition ${orientation==="vertical" ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
              <RectangleVertical size={13}/>
            </button>
            <button onClick={()=>{ setOrientation("horizontal"); setZoom(defaultZoom("horizontal")) }} title="Horizontal" className={`w-7 h-6 flex items-center justify-center rounded-full transition ${orientation==="horizontal" ? "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--accent-border)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
              <RectangleHorizontal size={13}/>
            </button>
          </div>
          <div className="flex items-center gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-full p-0.5" role="group" aria-label="Zoom de hoja">
            <button onClick={()=>stepZoom(-1)} title="Reducir zoom" className="w-7 h-6 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition">
              <Minus size={13}/>
            </button>
            <button onClick={()=>setZoom(defaultZoom(orientation))} title="Restablecer zoom" className="px-1.5 text-[11px] font-mono text-[var(--text)] hover:text-[var(--text)] min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={()=>stepZoom(1)} title="Ampliar zoom" className="w-7 h-6 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--text)] transition">
              <Plus size={13}/>
            </button>
          </div>
          <div className="hidden lg:flex items-center gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-full p-0.5" role="group" aria-label="Edición (próximamente)">
            <button title="Deshacer (próximamente)" disabled className="w-7 h-6 flex items-center justify-center rounded-full text-[var(--text-dim)] opacity-50 cursor-not-allowed" aria-label="Deshacer"><Undo2 size={13}/></button>
            <button title="Rehacer (próximamente)" disabled className="w-7 h-6 flex items-center justify-center rounded-full text-[var(--text-dim)] opacity-50 cursor-not-allowed" aria-label="Rehacer"><Redo2 size={13}/></button>
            <button title="Vista previa (próximamente)" disabled className="w-7 h-6 flex items-center justify-center rounded-full text-[var(--text-dim)] opacity-50 cursor-not-allowed" aria-label="Vista previa"><Eye size={13}/></button>
          </div>
          <button onClick={guardar} disabled={isMutating > 0 || saveState === "saving"} title="Validar y guardar" className={`flex items-center gap-1.5 rounded-full px-3 h-7 text-[12px] font-medium transition border ${saveState === "saved" ? "bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--success)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:text-[var(--text)] hover:border-[var(--accent-border)]"} disabled:opacity-50`}>
            {saveState === "saved" ? <><Check size={13}/> Guardado</> : saveState === "saving" ? "Guardando..." : <><Save size={13}/> Guardar</>}
          </button>
          <div ref={exportRef} className="relative">
            <button onClick={()=>setExportOpen(!exportOpen)} title="Exportar" aria-haspopup="menu" aria-expanded={exportOpen} className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[12px] font-medium bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] transition">
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
        <div className="flex-1 min-w-0 p-6 overflow-auto bg-[var(--bg)]">
          <div style={{ width: sheetBase.w, minHeight: sheetBase.h }} className="max-w-none mx-auto bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-lg overflow-hidden transition-all duration-300">
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
              <div className="overflow-auto">
                <table className={`w-full text-xs border-collapse table-${cfg.table_density}`} style={{ minWidth: 488 + years.length * 12 * 20 }}>
                  <thead>
                    <tr className="bg-[var(--sheet-soft)] border-b border-[var(--sheet-border)]" style={headBg ? { background: headBg } : undefined}>
                      <th rowSpan={2} className="p-2 w-[44px] text-left text-[var(--sheet-ink)] font-semibold align-middle border-x border-[var(--sheet-border)]">N.</th>
                      <th rowSpan={2} className="p-2 text-center text-[var(--sheet-ink)] font-semibold min-w-[160px] align-middle border-x border-[var(--sheet-border)]">Empresa</th>
                      <th colSpan={years.length * 12} className="p-2 text-center text-[var(--sheet-ink)] font-semibold text-[12px] border-x border-[var(--sheet-border)]">Año / Meses</th>
                      {cfg.visible_fields.responsable && <th rowSpan={2} className="p-2 text-center text-[var(--sheet-ink)] font-semibold align-middle min-w-[90px] border-x border-[var(--sheet-border)]">Responsable</th>}
                      {cfg.visible_fields.observaciones && <th rowSpan={2} className="p-2 text-center text-[var(--sheet-ink)] font-semibold align-middle min-w-[140px] border-x border-[var(--sheet-border)]">Observaciones</th>}
                    </tr>
                    <tr className="bg-[var(--sheet-soft)] border-b border-[var(--sheet-border)]" style={headBg ? { background: headBg } : undefined}>
                      {years.map(y=>(
                        <th key={y} colSpan={12} className="p-1 text-center text-[var(--sheet-ink)] font-semibold text-[11px] border-x border-[var(--sheet-border)]">{y}<div className="flex text-[9px] font-normal text-[var(--sheet-ink)]">{MESES.map((m, mi)=> <span key={`${y}-${mi}-${m}`} className="flex-1 text-center">{m}</span>)}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.length===0 ? (
                      <tr><td colSpan={2 + years.length*12 + (cfg.visible_fields.responsable?1:0) + (cfg.visible_fields.observaciones?1:0)} className="p-12 text-center text-[var(--text-dim)]"><div className="text-sm">Tu papel está en blanco</div></td></tr>
                    ) : (
                      filas.slice().sort((a:any,b:any)=>a.orden-b.orden).map((fila:any, idx:number)=>(
                        <tr key={fila.id} className="border-t border-[var(--sheet-border)] hover:bg-[var(--sheet-soft)]">
                          <td className="p-2 text-center text-[var(--text-dim)] text-xs relative group">
                            {idx+1}
                            <RowMenu fila={fila} idx={idx} total={orderedFilas.length} onMove={(dir)=>move(idx,dir)} onDelete={()=>deleteFila.mutate(fila.id)} />
                          </td>
                          <td className="p-2 relative text-center">
                            <button onClick={()=>setPickFilaId(pickFilaId===fila.id?null:fila.id)} title={fila.nombre_snapshot ? "Cambiar empresa" : "Elegir empresa"} className={`rounded px-2 h-7 w-full text-xs flex items-center gap-1 border border-transparent hover:border-[var(--sheet-border)] hover:bg-[var(--sheet-soft)] ${fila.nombre_snapshot ? "font-medium text-[#1e293b]" : ""}`}>
                              <span className="flex-1 text-left truncate">{fila.nombre_snapshot || " "}</span>
                              <span className={`text-[10px] ml-auto ${fila.nombre_snapshot ? "text-[var(--text-dim)]" : "text-[var(--text-dim)]"}`}>▾</span>
                            </button>
                            {pickFilaId===fila.id && empresas && <EmpresaPicker fila={fila} empresas={empresas} onClose={()=>setPickFilaId(null)} onSelect={async(v)=>{ await updateFila.mutateAsync({ fid: fila.id, patch: v as any }); setPickFilaId(null) }} />}
                          </td>
                          {years.map(y=>(
                            <td key={y} colSpan={12} className="p-0">
                              <div className="flex">
                                {MESES.map((_, mi)=>{
                                  const c = map.get(`${fila.id}-${y}-${mi+1}`)
                                  if(!c) return <span key={mi} className="flex-1 grid place-items-center py-2" title="Cargando..."><input type="checkbox" disabled aria-label="Cargando mes" className="w-4 h-4 accent-[var(--sheet-accent)] opacity-60" /></span>
                                  return <label key={mi} className="flex-1 grid place-items-center py-2 cursor-pointer hover:bg-[var(--sheet-soft)]" title={c.revisado ? "Desmarcar" : "Marcar"}>
                                    <input type="checkbox" aria-label={`Mes ${mi + 1} de ${y}`} checked={!!c.revisado} onChange={()=>toggle.mutate(c)} className="w-4 h-4 accent-[var(--sheet-accent)] cursor-pointer" />
                                  </label>
                                })}
                              </div>
                            </td>
                          ))}
                          {cfg.visible_fields.responsable && (
                            <td className="p-0 min-w-[90px] border-l border-[var(--sheet-border)]">
                              <FilaTextCell field="responsable" fila={fila} onSave={v=>updateFila.mutate({ fid: fila.id, patch:{ responsable: v } })} />
                            </td>
                          )}
                          {cfg.visible_fields.observaciones && (
                            <td className="p-0 min-w-[140px] border-l border-[var(--sheet-border)]">
                              <FilaTextCell field="observacion" fila={fila} onSave={v=>updateFila.mutate({ fid: fila.id, patch:{ observacion: v } })} />
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-[var(--sheet-border)]">
                <Button onClick={()=>addFila.mutate({ nombre: `Fila ${filas.length+1}` })} className="w-full h-8 rounded-lg border border-dashed border-[var(--sheet-border)] bg-[var(--sheet-soft)] hover:brightness-95 text-[var(--sheet-accent)] text-xs font-medium gap-1.5"><Plus size={13}/> Agregar fila</Button>
              </div>
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
              <div className="flex-1"><label className="text-[10px] text-[var(--text-dim)]">Inicio</label><Input type="number" value={scaleStart} onChange={e=>setScaleStart(Number(e.target.value))} className="h-8 mt-1 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] text-xs" /></div>
              <div className="flex-1"><label className="text-[10px] text-[var(--text-dim)]">Fin</label><Input type="number" value={scaleEnd} onChange={e=>setScaleEnd(Number(e.target.value))} className="h-8 mt-1 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] text-xs" /></div>
            </div>
            <Button onClick={()=>applyScale.mutate()} disabled={applyScale.isPending || scaleStart>scaleEnd} className="w-full h-7 bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] text-xs rounded-full">Aplicar escala</Button>
            <div className="flex items-center gap-2 pt-1">
              <Users size={12} className="text-[var(--text-dim)] shrink-0" />
              <Input type="number" aria-label="Cantidad de personal" min={1} max={10} value={archivo.personal_count ?? 2} onChange={e=>{ const n = Math.max(1, Math.min(10, Number(e.target.value)||1)); updatePersonal.mutate(n)}} className="w-16 h-7 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] text-xs" />
              <span className="text-xs text-[var(--text-dim)] truncate">{personalOpts.join(", ")}</span>
            </div>
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
