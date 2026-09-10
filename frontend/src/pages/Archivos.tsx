import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfigStore } from "@/stores/config"
import { Link } from "react-router-dom"
import { useState } from "react"
import { Files, Plus, Copy, Download, Trash2 } from "lucide-react"

export function Archivos() {
  const cfg = useConfigStore()
  const qc = useQueryClient()
  const [titulo,setTitulo]=useState("")
  const { data } = useQuery({ queryKey:["archivos"], queryFn: async()=> (await api.get("/archivos")).data })
  const create = useMutation({ mutationFn: async()=> (await api.post("/archivos",{titulo: titulo || "Nueva revisión", tipo_revision:"Archivadores de compras", periodo_inicio:2021, periodo_fin:2025})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["archivos"]}); setTitulo("")} })
  const del = useMutation({ mutationFn: async(id:string)=> api.delete(`/archivos/${id}`), onSuccess:()=> qc.invalidateQueries({queryKey:["archivos"]}) })
  const duplicate = useMutation({ mutationFn: async(id:string)=> (await api.post(`/archivos/${id}/duplicate`)).data, onSuccess:()=> qc.invalidateQueries({queryKey:["archivos"]}) })
  const download = async (id:string, fmt:"pdf"|"excel") => { const r = await api.get(`/archivos/${id}/export?format=${fmt}`, { responseType:"blob" }); const url = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href=url; a.download=`archivo-${id}.${fmt==="pdf"?"pdf":"xlsx"}`; a.click(); URL.revokeObjectURL(url) }
  const cols = cfg.grid_columns
  return (
    <div className="flex-1 bg-[#0f1117] p-6 overflow-auto">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-white">Archivos</h1>
          <div className="flex gap-2 bg-[#141722] border border-[#1e2230] rounded-xl p-2">
            <Input placeholder="Título nuevo archivo" value={titulo} onChange={e=>setTitulo(e.target.value)} className="w-64 h-9 bg-[#0f1117] border-[#2a2e3e] text-white placeholder:text-[#8b8fa3] rounded-lg" />
            <Button onClick={()=>create.mutate()} className="bg-[#EC4899] hover:bg-[#db2777] text-white rounded-lg h-9"><Plus size={16}/> Crear</Button>
          </div>
        </div>
        <div className="text-xs text-[#8b8fa3]">{cols} columnas • Grid</div>
        <div className="grid gap-4" style={{gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`}}>
          {data?.map((a:any)=> (
            <div key={a.id} className="bg-[#141722] border border-[#1e2230] rounded-xl p-4 flex flex-col gap-3 hover:border-[#EC4899]/20 transition">
              <div className="w-full h-24 rounded-lg bg-[#0f1117] border border-[#1e2230] grid place-items-center text-[#8b8fa3]"><Files size={24}/></div>
              <div><div className="font-semibold text-white line-clamp-2 text-sm">{a.titulo}</div><div className="text-xs text-[#8b8fa3]">{a.tipo_revision} • {a.periodo_inicio}-{a.periodo_fin}</div></div>
              <div className="h-1.5 bg-[#0f1117] border border-[#1e2230] rounded-full overflow-hidden"><div className="h-full bg-[#EC4899]" style={{width:`${a.progreso??0}%`}}/></div>
              <div className="flex flex-wrap gap-1.5">
                <Link to={`/editor/${a.id}`}><Button className="h-7 bg-[#EC4899] hover:bg-[#db2777] text-white rounded-lg text-xs">Abrir</Button></Link>
                <Button variant="outline" className="h-7 bg-[#0f1117] border-[#2a2e3e] text-[#8b8fa3] text-xs rounded-lg" onClick={()=>duplicate.mutate(a.id)}><Copy size={12}/> Duplicar</Button>
                <Button variant="outline" className="h-7 bg-[#0f1117] border-[#2a2e3e] text-[#8b8fa3] text-xs rounded-lg" onClick={()=>download(a.id,"pdf")}><Download size={12}/> PDF</Button>
                <Button variant="ghost" className="h-7 text-[#8b8fa3] hover:text-red-400 text-xs ml-auto" onClick={()=>del.mutate(a.id)}><Trash2 size={12}/></Button>
              </div>
            </div>
          ))}
        </div>
        {data?.length===0 && <div className="text-center py-16 text-[#8b8fa3] border border-dashed border-[#1e2230] rounded-xl">Sin archivos</div>}
      </div>
    </div>
  )
}
