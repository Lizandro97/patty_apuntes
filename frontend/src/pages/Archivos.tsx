import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { Plus, Download, Trash2, Search } from "lucide-react"
import { DEFAULT_TITULO, newArchivoPayload } from "@/lib/defaults"

export function Archivos() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data } = useQuery({ queryKey:["archivos"], queryFn: async()=> (await api.get("/archivos")).data })
  const [titulo,setTitulo]=useState("")
  const [q,setQ]=useState("")
  const [sort,setSort]=useState<"fecha"|"progreso"|"titulo">("fecha")
  const [confirmId,setConfirmId]=useState<string|null>(null)
  const [edit,setEdit]=useState<any>(null)
  const [dlId,setDlId]=useState<string|null>(null)
  const inputRef=useRef<HTMLInputElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.("[data-dlmenu]")) setDlId(null) }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setDlId(null) }
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [])
  const list=((data as any[]) ?? []).filter((a:any)=> (a.titulo ?? "").toLowerCase().includes(q.toLowerCase())).sort((a:any,b:any)=> sort==="progreso" ? ((b.progreso??0)-(a.progreso??0)) : sort==="titulo" ? String(a.titulo??"").localeCompare(String(b.titulo??"")) : String(b.created_at??"").localeCompare(String(a.created_at??"")))
  const create = useMutation({ mutationFn: async()=> (await api.post("/archivos",{...newArchivoPayload(), titulo: titulo || DEFAULT_TITULO})).data, onSuccess:(d)=> { qc.invalidateQueries({queryKey:["archivos"]}); setTitulo(""); nav(`/editor/${d.id}`) } })
  const rename = useMutation({ mutationFn: async()=> (await api.put(`/archivos/${edit.id}`,{titulo: edit.titulo})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["archivos"]}); setEdit(null) } })
  const del = useMutation({ mutationFn: async(id:string)=> api.delete(`/archivos/${id}`), onSuccess:()=> qc.invalidateQueries({queryKey:["archivos"]}) })
  const download = async (id:string, fmt:"pdf"|"excel") => {
    try {
      const r = await api.get(`/archivos/${id}/export?format=${fmt}`, { responseType:"blob" })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement("a")
      a.href=url
      a.download=`archivo-${id}.${fmt==="pdf"?"pdf":"xlsx"}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      const d = e?.response?.data?.detail
      if (e?.response?.status === 422 && d?.faltantes) {
        alert(`Faltan campos para exportar:\n` + d.faltantes.map((f: any) => `• Fila ${f.fila} — ${f.nombre} sin empresa`).join("\n"))
      }
    }
  }
  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)]">Archivos</h1>
            <p className="text-sm text-[var(--text-dim)]">Clic en una fila para abrirla en el editor</p>
          </div>
          <div className="flex gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2">
            <Input ref={inputRef} aria-label="Título nuevo archivo" placeholder="Título nuevo archivo" value={titulo} onChange={e=>setTitulo(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") create.mutate() }} className="w-64 h-9 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg" />
            <Button onClick={()=>create.mutate()} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-9"><Plus size={16}/> Crear y abrir</Button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <Input aria-label="Buscar archivos" placeholder="Buscar archivos..." value={q} onChange={e=>setQ(e.target.value)} className="h-9 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg pl-9" />
          </div>
          <select aria-label="Ordenar archivos" value={sort} onChange={e=>setSort(e.target.value as any)} className="h-9 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-3">
            <option value="fecha">Recientes</option>
            <option value="progreso">Progreso</option>
            <option value="titulo">Título</option>
          </select>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-[var(--bg)] border-b border-[var(--border)] text-left"><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">N.º</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">Archivo</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase" aria-sort={sort==="progreso" ? "descending" : "none"}>Progreso</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase" aria-sort={sort==="fecha" ? "descending" : "none"}>Actualizado</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {list.map((a:any, i:number)=> (
                <tr key={a.id} onClick={()=>nav(`/editor/${a.id}`)} title="Abrir en el editor" className="cursor-pointer hover:bg-[var(--surface-2)] transition">
                  <td className="p-3 text-[var(--text-dim)] font-mono text-xs">{i+1}</td>
                  <td className="p-3 min-w-0" onClick={e=>e.stopPropagation()}>
                    {edit?.id===a.id ? (
                      <span className="flex gap-1.5">
                        <Input aria-label="Renombrar archivo" value={edit.titulo} onChange={ev=>setEdit({...edit,titulo:ev.target.value})} onKeyDown={ev=>{ if(ev.key==="Enter") rename.mutate() }} className="h-8 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                        <Button onClick={()=>rename.mutate()} className="h-8 bg-[var(--accent)] text-[var(--on-accent)] rounded-lg px-3 text-xs">Guardar</Button>
                        <Button variant="ghost" onClick={()=>setEdit(null)} className="h-8 text-[var(--text-dim)] text-xs">Cancelar</Button>
                      </span>
                    ) : (
                      <span className="block cursor-pointer" onClick={()=>nav(`/editor/${a.id}`)}>
                        <span className="font-medium truncate text-[var(--text)] text-sm block">{a.titulo}</span>
                        <span className="text-xs text-[var(--text-dim)]">{a.tipo_revision ? `${a.tipo_revision} • ` : ""}{a.periodo_inicio}-{a.periodo_fin}</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 min-w-[140px]">
                    <span className="flex items-center gap-2">
                      <span className="flex-1 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden"><span className="block h-full bg-[var(--accent)]" style={{width:`${a.progreso??0}%`}}/></span>
                      <span className="text-xs font-bold text-[var(--accent)]">{a.progreso ?? 0}%</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-[var(--text-dim)] whitespace-nowrap">{a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3" onClick={e=>e.stopPropagation()}>
                    <span className="flex gap-1.5 justify-end items-center">
                      {edit?.id===a.id ? null : (<Button variant="outline" onClick={()=>setEdit({id:a.id,titulo:a.titulo})} className="h-7 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs rounded-lg">Renombrar</Button>)}
                      <span className="relative" data-dlmenu>
                        <Button variant="ghost" title="Descargar" aria-label={`Descargar ${a.titulo}`} aria-haspopup="menu" aria-expanded={dlId===a.id} onClick={()=>setDlId(dlId===a.id?null:a.id)} className="h-7 w-7 text-[var(--text-dim)] hover:text-[var(--text)]"><Download size={14}/></Button>
                        {dlId===a.id && (
                          <span role="menu" className="absolute right-0 top-full mt-1 w-[150px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-1.5 z-30 block">
                            <button role="menuitem" onClick={()=>{ setDlId(null); download(a.id,"pdf") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)]">Descargar PDF</button>
                            <button role="menuitem" onClick={()=>{ setDlId(null); download(a.id,"excel") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)]">Descargar Excel</button>
                          </span>
                        )}
                      </span>
                      {confirmId===a.id ? (
                        <span className="flex gap-1.5">
                          <Button onClick={()=>{ del.mutate(a.id); setConfirmId(null) }} className="h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 text-xs">Confirmar</Button>
                          <Button variant="ghost" onClick={()=>setConfirmId(null)} className="h-7 text-[var(--text-dim)] text-xs">Cancelar</Button>
                        </span>
                      ) : (
                        <Button variant="ghost" title="Eliminar archivo" aria-label={`Eliminar ${a.titulo}`} className="h-7 w-7 text-[var(--text-dim)] hover:text-red-400" onClick={()=>setConfirmId(a.id)}><Trash2 size={14}/></Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length===0 && <div className="text-center py-12 text-sm text-[var(--text-dim)] border-t border-[var(--border)] space-y-3"><div>{q ? "Sin resultados para esta búsqueda" : "Sin archivos"}</div>{!q && (data as any[])?.length===0 && <Button onClick={()=>inputRef.current?.focus()} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-9"><Plus size={16}/> Crear archivo</Button>}</div>}
        </div>
      </div>
    </div>
  )
}
