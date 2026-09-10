import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useParams } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfigStore } from "@/stores/config"
import { useEditorHeaderStore } from "@/stores/editorHeader"
import { Plus, Trash2, ArrowUp, ArrowDown, Users, Calendar, Check, Settings2, FileText, Table2, Palette } from "lucide-react"

const MESES = ["E","F","M","A","M","J","J","A","S","O","N","D"]

function EmpresaPicker({ fila, empresas, onSelect, onClose }: { fila: any; empresas: any[]; onSelect: (v: { empresa_id?: string; nombre?: string }) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [free, setFree] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h) }, [onClose])
  const filtered = empresas.filter((e: any) => e.nombre.toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={ref} className="absolute z-30 top-full left-0 mt-1 w-[280px] bg-[#1a1d27] border border-[#2a2e3e] rounded-xl shadow-xl p-2">
      <Input autoFocus placeholder="Buscar empresa..." value={q} onChange={e=>setQ(e.target.value)} className="h-8 text-sm mb-2 bg-[#0f1117] border-[#2a2e3e] text-white" />
      <div className="max-h-[180px] overflow-auto space-y-1">
        {filtered.map((e:any)=>(<button key={e.id} onClick={()=>onSelect({ empresa_id: e.id })} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1e2230] text-sm flex items-center justify-between text-[#c8ccdb]"><span>{e.nombre}</span><span className="text-[11px] text-[#8b8fa3]">{fila.empresa_id===e.id ? "✓" : ""}</span></button>))}
        {filtered.length===0 && <div className="text-xs text-[#8b8fa3] px-3 py-2">Sin resultados</div>}
      </div>
      <div className="border-t border-[#2a2e3e] mt-2 pt-2 flex gap-2">
        <Input placeholder="Nombre libre..." value={free} onChange={e=>setFree(e.target.value)} className="h-8 text-sm flex-1 bg-[#0f1117] border-[#2a2e3e] text-white" />
        <Button className="h-8 bg-[#EC4899] hover:bg-[#db2777] text-white" disabled={!free.trim()} onClick={()=>onSelect({ nombre: free.trim() })}>Usar</Button>
      </div>
    </div>
  )
}

export function Editor() {
  const { id } = useParams()
  const qc = useQueryClient()
  const cfg = useConfigStore()
  const hdr = useEditorHeaderStore()
  const [archivoId, setArchivoId] = useState<string | undefined>(id)
  const [pickFilaId, setPickFilaId] = useState<string | null>(null)
  const [scaleStart, setScaleStart] = useState(2021)
  const [scaleEnd, setScaleEnd] = useState(2025)
  const [panelTab, setPanelTab] = useState<"tabla" | "diseno">("tabla")
  const { data: archivo } = useQuery({ queryKey: ["archivo", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}`)).data })
  const { data: filas } = useQuery({ queryKey: ["filas", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/filas`)).data })
  const { data: celdas } = useQuery({ queryKey: ["celdas", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/celdas`)).data })
  const { data: stats } = useQuery({ queryKey: ["stats", archivoId], enabled: !!archivoId, queryFn: async () => (await api.get(`/archivos/${archivoId}/stats`)).data })
  const { data: empresas } = useQuery({ queryKey: ["empresas"], queryFn: async () => (await api.get("/empresas")).data })
  useEffect(() => { if (archivo) { setScaleStart(archivo.periodo_inicio); setScaleEnd(archivo.periodo_fin) } }, [archivo])
  const createArchivo = useMutation({ mutationFn: async () => (await api.post("/archivos", { titulo: "Revisión de Archivadores de Compras", tipo_revision: "Archivadores de compras", periodo_inicio: 2021, periodo_fin: 2025, personal_count: 2 })).data, onSuccess: (d) => setArchivoId(d.id) })
  useEffect(() => { if (!id && !archivoId) createArchivo.mutate() }, [])
  const toggle = useMutation({ mutationFn: async (c: any) => (await api.put(`/archivos/celdas/${c.id}`, { revisado: !c.revisado })).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ["celdas", archivoId] }); qc.invalidateQueries({ queryKey: ["stats", archivoId] }) } })
  const updateCelda = useMutation({ mutationFn: async ({ cid, patch }: { cid: string; patch: any }) => (await api.put(`/archivos/celdas/${cid}`, patch)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ["celdas", archivoId] }) })
  const addFila = useMutation({ mutationFn: async (p:any) => (await api.post(`/archivos/${archivoId}/filas`, p)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ["filas", archivoId] }); qc.invalidateQueries({ queryKey: ["celdas", archivoId] }) } })
  const updateFila = useMutation({ mutationFn: async ({ fid, patch }: { fid: string; patch: any }) => (await api.put(`/archivos/${archivoId}/filas/${fid}`, patch)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ["filas", archivoId] }) })
  const deleteFila = useMutation({ mutationFn: async (fid: string) => await api.delete(`/archivos/${archivoId}/filas/${fid}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["filas", archivoId] }) })
  const applyScale = useMutation({ mutationFn: async () => (await api.put(`/archivos/${archivoId}`, { periodo_inicio: Number(scaleStart), periodo_fin: Number(scaleEnd) })).data, onSuccess: () => qc.invalidateQueries({ queryKey: ["archivo", archivoId] }) })
  const updatePersonal = useMutation({ mutationFn: async (n:number) => (await api.put(`/archivos/${archivoId}`, { personal_count: n })).data, onSuccess: ()=>qc.invalidateQueries({queryKey:["archivo",archivoId]}) })
  const exportar = async (fmt: "pdf" | "excel") => { const r = await api.get(`/archivos/${archivoId}/export?format=${fmt}`, { responseType: "blob" }); const url = URL.createObjectURL(r.data); const a=document.createElement("a"); a.href=url; a.download=`revision.${fmt==="pdf"?"pdf":"xlsx"}`; a.click(); URL.revokeObjectURL(url) }
  useEffect(()=>{ if(!archivo) return; hdr.set({ archivoId: archivo.id, titulo: archivo.titulo, tipo: archivo.tipo_revision, filas: (filas as any)?.length ?? 0, periodo: `${archivo.periodo_inicio}-${archivo.periodo_fin}`, dirty:false } as any)}, [archivo?.id, (archivo as any)?.titulo, (filas as any)?.length])
  useEffect(()=>{ hdr.set({ onSaveTitle: (v:string)=>{ if(v!==archivo?.titulo) api.put(`/archivos/${archivoId}`,{titulo:v}).then(()=>qc.invalidateQueries({queryKey:["archivo",archivoId]})) }, onExport: (fmt:any)=>exportar(fmt) } as any); return ()=>{ hdr.set({archivoId:null} as any)}}, [archivoId])
  if (!archivoId) return <div className="p-8 text-center text-[#8b8fa3]">Creando...</div>
  if (!archivo || !filas) return <div className="p-8 text-[#8b8fa3]">Cargando...</div>
  const map=new Map<string,any>(); celdas?.forEach((c:any)=>map.set(`${c.empresa_id}-${c.anio}-${c.mes}`,c))
  const years=Array.from({length: archivo.periodo_fin - archivo.periodo_inicio + 1}, (_,i)=>archivo.periodo_inicio+i)
  const personalOpts=Array.from({length: archivo.personal_count||2},(_,i)=>`P${i+1}`)
  const move=(idx:number,dir:-1|1)=>{ const o=[...filas].sort((a:any,b:any)=>a.orden-b.orden); const t=idx+dir; if(t<0||t>=o.length) return; const tmp=o[idx]; o[idx]=o[t]; o[t]=tmp; qc.setQueryData(["filas",archivoId], o.map((f:any,i:number)=>({...f,orden:i}))); }

  return (
    <div className="flex flex-1 min-h-0 bg-[#0f1117]">
      {/* Canvas — white page like Foliora */}
      <div className="flex-1 bg-[#0f1117] flex flex-col min-w-0 overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 px-3 py-2 bg-[#0f1117] border-b border-[#1e2230] text-[12px] text-[#8b8fa3]">
          <div className="flex items-center gap-1 bg-[#1a1d27] border border-[#242836] rounded-full px-2 py-1">
            <span className="px-2 text-[#c8ccdb]">Página 1</span>
          </div>
        </div>
        <div className="flex-1 p-6 flex justify-center overflow-auto bg-[#0f1117]">
          <div className="w-[900px] min-h-[600px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-lg overflow-hidden shrink-0">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="px-2 py-1 rounded bg-[#fdf2f8] border border-[#fce7f3] text-[#831843]">{archivo.tipo_revision}</span>
                <span className="text-[#94a3b8]">{archivo.periodo_inicio} — {archivo.periodo_fin} • {filas.length} filas</span>
              </div>
              {cfg.show_summary && stats && (
                <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-[#fdf2f8]/60 border border-[#fce7f3] text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Revisadas <b>{stats.revisadas}/{stats.total || filas.length}</b></span>
                  <span className="flex items-center gap-1.5 text-orange-700"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"/>Pendientes <b>{stats.pendientes}</b></span>
                  <span className="flex items-center gap-2 text-[#831843] ml-auto"><span>Progreso <b>{stats.progreso}%</b></span><span className="w-24 h-1.5 bg-white border border-[#fce7f3] rounded-full overflow-hidden inline-block"><span className="block h-full bg-[#EC4899]" style={{width:`${stats.progreso}%`}}/></span></span>
                </div>
              )}
              <div className="overflow-auto">
                <table className={`w-full text-xs border-collapse table-${cfg.table_density}`}>
                  <thead>
                    <tr className="bg-[#fdf2f8] border-b border-[#fce7f3]">
                      <th className="p-2 w-[44px] text-left text-[#831843] font-semibold">N.</th>
                      <th className="p-2 text-left text-[#831843] font-semibold min-w-[160px]">Empresa</th>
                      {years.map(y=>(
                        <th key={y} colSpan={12} className="p-1 text-center text-[#831843] font-semibold text-[11px]">{y}<div className="flex text-[9px] font-normal text-[#9d174d]/60">{MESES.map(m=> <span key={m} className="flex-1 text-center">{m}</span>)}</div></th>
                      ))}
                      <th className="p-2 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.length===0 ? (
                      <tr><td colSpan={years.length*12 + 3} className="p-12 text-center text-[#94a3b8]"><div className="text-sm">Tu papel está en blanco</div></td></tr>
                    ) : (
                      filas.slice().sort((a:any,b:any)=>a.orden-b.orden).map((fila:any, idx:number)=>(
                        <tr key={fila.id} className="border-t border-[#fce7f3] hover:bg-[#fdf2f8]/40">
                          <td className="p-2 text-center text-[#94a3b8] text-xs">{idx+1}<div className="flex gap-0.5 justify-center mt-1"><button onClick={()=>move(idx,-1)} className="p-0.5 hover:bg-black/5 rounded"><ArrowUp size={10}/></button><button onClick={()=>move(idx,1)} className="p-0.5 hover:bg-black/5 rounded"><ArrowDown size={10}/></button></div></td>
                          <td className="p-2 relative">
                            <button onClick={()=>setPickFilaId(pickFilaId===fila.id?null:fila.id)} className="text-left font-medium text-[#1e293b] hover:bg-black/5 rounded px-1 -mx-1 text-xs flex items-center gap-1">
                              {fila.nombre_snapshot || "— Seleccionar —"} <span className="text-[10px] text-[#94a3b8]">▾</span>
                            </button>
                            {pickFilaId===fila.id && empresas && <EmpresaPicker fila={fila} empresas={empresas} onClose={()=>setPickFilaId(null)} onSelect={async(v)=>{ await updateFila.mutateAsync({ fid: fila.id, patch: v as any }); setPickFilaId(null) }} />}
                          </td>
                          {years.map(y=>(
                            <td key={y} colSpan={12} className="p-0">
                              <div className="flex">
                                {MESES.map((_, mi)=>{
                                  const c = map.get(`${fila.empresa_id}-${y}-${mi+1}`)
                                  if(!fila.empresa_id) return <span key={mi} className="flex-1 grid place-items-center py-2 text-[#e2e8f0] text-[10px]">—</span>
                                  if(!c) return <span key={mi} className="flex-1 grid place-items-center py-2 text-[#e2e8f0]">☐</span>
                                  const col = c.color || "#EC4899"
                                  return <button key={mi} onClick={()=>toggle.mutate(c)} className="flex-1 grid place-items-center py-2 text-[11px] hover:bg-[#fdf2f8]" style={{color: c.revisado ? col : "#e2e8f0"}}>{c.revisado ? "☑" : "☐"}</button>
                                })}
                              </div>
                            </td>
                          ))}
                          <td className="p-2 text-center"><button onClick={()=>deleteFila.mutate(fila.id)} className="w-6 h-6 rounded hover:bg-red-50 text-[#94a3b8] hover:text-red-600"><Trash2 size={12}/></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-[#fce7f3]">
                <Button onClick={()=>addFila.mutate({ nombre: `Fila ${filas.length+1}` })} className="w-full h-8 rounded-lg border border-dashed border-[#f9c2dd] bg-[#fdf2f8]/60 hover:bg-[#fdf2f8] text-[#EC4899] text-xs font-medium gap-1.5"><Plus size={13}/> Agregar fila</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel fusionado — 2 subpestañas */}
      <div className="w-[320px] bg-[#0f1117] border-l border-[#1e2230] flex flex-col shrink-0 overflow-hidden hidden xl:flex">
        <div className="px-3 pt-3 shrink-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#e2e4ed] px-1 mb-2"><Settings2 size={14}/> Panel</div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#141722] border border-[#1e2230]" role="tablist" aria-label="Panel del editor">
            <button
              role="tab"
              aria-selected={panelTab === "tabla"}
              onClick={() => setPanelTab("tabla")}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition ${panelTab === "tabla" ? "bg-[#1e2230] text-white shadow-sm border border-[#EC4899]/30" : "text-[#8b8fa3] hover:text-[#c8ccdb] border border-transparent"}`}
            >
              <Table2 size={13}/> Tabla
            </button>
            <button
              role="tab"
              aria-selected={panelTab === "diseno"}
              onClick={() => setPanelTab("diseno")}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition ${panelTab === "diseno" ? "bg-[#1e2230] text-white shadow-sm border border-[#EC4899]/30" : "text-[#8b8fa3] hover:text-[#c8ccdb] border border-transparent"}`}
            >
              <Palette size={13}/> Diseño
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          {panelTab === "tabla" ? (
          <>
          <div className="bg-[#141722] rounded-xl border border-[#1e2230] p-3 space-y-3">
            <div className="text-[11px] font-semibold text-[#c8ccdb] tracking-wide flex items-center gap-1.5"><Calendar size={12}/> Datos de tabla</div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] text-[#8b8fa3]">Inicio</label><Input type="number" value={scaleStart} onChange={e=>setScaleStart(Number(e.target.value))} className="h-8 mt-1 bg-[#0f1117] border-[#2a2e3e] text-white text-xs" /></div>
              <div className="flex-1"><label className="text-[10px] text-[#8b8fa3]">Fin</label><Input type="number" value={scaleEnd} onChange={e=>setScaleEnd(Number(e.target.value))} className="h-8 mt-1 bg-[#0f1117] border-[#2a2e3e] text-white text-xs" /></div>
            </div>
            <Button onClick={()=>applyScale.mutate()} disabled={applyScale.isPending || scaleStart>scaleEnd} className="w-full h-7 bg-[#c084fc] hover:bg-[#a78bfa] text-[#0f1117] text-xs rounded-full">Aplicar escala</Button>
            <div className="flex items-center gap-2 pt-1">
              <Users size={12} className="text-[#8b8fa3] shrink-0" />
              <Input type="number" min={1} max={10} value={archivo.personal_count ?? 2} onChange={e=>{ const n = Math.max(1, Math.min(10, Number(e.target.value)||1)); updatePersonal.mutate(n)}} className="w-16 h-7 bg-[#0f1117] border-[#2a2e3e] text-white text-xs" />
              <span className="text-xs text-[#8b8fa3] truncate">{personalOpts.join(", ")}</span>
            </div>
            <div className="flex justify-between text-xs"><span className="text-[#8b8fa3]">Total</span><span className="text-white font-medium">{filas.length} · {years.length} años</span></div>
          </div>
          </>
          ) : (
          <>
          <div className="bg-[#141722] rounded-xl border border-[#1e2230] p-3 space-y-3">
            <div className="text-[12px] font-medium text-[#c8ccdb] flex items-center gap-1.5"><Palette size={12}/> Estilos</div>
            <div className="flex items-center justify-between"><span className="text-[11px] text-[#8b8fa3]">Color principal</span><div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#232836] rounded-lg px-2 py-1 w-[148px] justify-between relative"><span className="w-4 h-4 rounded" style={{background: cfg.primary_color}}/><span className="text-[11px] text-[#c8ccdb]">{cfg.primary_color}</span><input type="color" value={cfg.primary_color} onChange={e=>cfg.set({primary_color:e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div>
            <div className="flex gap-1.5 flex-wrap">
              {["#EC4899","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444"].map(c=>(
                <button key={c} onClick={()=>cfg.set({primary_color:c})} className="w-7 h-7 rounded-full border-2" style={{background:c, borderColor: cfg.primary_color===c ? "white" : "#2a2e3e", boxShadow: cfg.primary_color===c ? "0 0 0 2px #EC4899" : "none"}}/>
              ))}
            </div>
          </div>

          <div className="bg-[#141722] rounded-xl border border-[#1e2230] p-3 space-y-2">
            <div className="text-[12px] font-medium text-[#c8ccdb] flex items-center gap-1.5"><FileText size={12}/> Apariencia de tabla</div>
            <label className="flex items-center justify-between text-xs text-[#a1a6bb]">Densidad
              <select value={cfg.table_density} onChange={e=>cfg.set({table_density:e.target.value as any})} className="bg-[#0f1117] border border-[#232836] rounded-lg px-2 py-1 text-xs text-white">
                <option value="compact">Compacta</option><option value="normal">Normal</option><option value="comfortable">Cómoda</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-xs text-[#a1a6bb]">Resumen<input type="checkbox" checked={cfg.show_summary} onChange={e=>cfg.set({show_summary:e.target.checked})} className="accent-[#EC4899]" /></label>
          </div>

          <div className="bg-[#141722] rounded-xl border border-[#1e2230] p-3">
            <div className="text-[12px] font-medium text-[#c8ccdb] mb-2">Fondo cabecera</div>
            <div className="flex items-center gap-2"><span className="w-6 h-6 rounded border" style={{background: cfg.table_header_bg}}/><input type="color" value={cfg.table_header_bg} onChange={e=>cfg.set({table_header_bg:e.target.value})} className="flex-1 h-8 bg-transparent" /><span className="text-xs text-[#8b8fa3]">{cfg.table_header_bg}</span></div>
          </div>
          </>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
