import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Building2, Plus, Trash2 } from "lucide-react"

export function Empresas() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey:["empresas"], queryFn: async()=> (await api.get("/empresas")).data })
  const [nombre,setNombre]=useState("")
  const [edit,setEdit]=useState<any>(null)
  const [confirmId,setConfirmId]=useState<string|null>(null)
  const create = useMutation({ mutationFn: async()=> (await api.post("/empresas",{nombre})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["empresas"]}); setNombre("")} })
  const update = useMutation({ mutationFn: async()=> (await api.put(`/empresas/${edit.id}`,{nombre: edit.nombre})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["empresas"]}); setEdit(null)} })
  const del = useMutation({ mutationFn: async(id:string)=> await api.delete(`/empresas/${id}`), onSuccess:()=> qc.invalidateQueries({queryKey:["empresas"]}) })
  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-[var(--text)]">Empresas</h1>
        <p className="text-sm text-[var(--text-dim)]">Catálogo para el Editor — nombres disponibles al elegir empresa</p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex gap-3">
          <Input aria-label="Nombre de empresa" placeholder="Nombre de empresa" value={nombre} onChange={e=>setNombre(e.target.value)} className="bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] h-10 rounded-lg" />
          <Button onClick={()=>create.mutate()} disabled={!nombre.trim()} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-10 px-5"><Plus size={16}/> Agregar</Button>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-[var(--bg)] border-b border-[var(--border)] text-left"><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">N.º</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">Empresa</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">Creada</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.map((e:any, i:number)=> (
                <tr key={e.id} className="hover:bg-[var(--surface-2)]">
                  <td className="p-3 text-[var(--text-dim)] font-mono text-xs">{i+1}</td>
                  <td className="p-3 text-[var(--text)]">{edit?.id===e.id ? <Input aria-label="Editar nombre de empresa" value={edit.nombre} onChange={ev=>setEdit({...edit,nombre:ev.target.value})} className="h-8 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" /> : e.nombre}</td>
                  <td className="p-3 text-xs text-[var(--text-dim)]">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-1.5 justify-end">
                    {edit?.id===e.id ? (<><Button onClick={()=>update.mutate()} className="h-7 bg-[var(--accent)] text-[var(--on-accent)] rounded-lg px-3 text-xs">Guardar</Button><Button variant="ghost" onClick={()=>setEdit(null)} className="h-7 text-[var(--text-dim)]">Cancelar</Button></>) : confirmId===e.id ? (<><Button onClick={()=>{ del.mutate(e.id); setConfirmId(null) }} className="h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 text-xs">Confirmar</Button><Button variant="ghost" onClick={()=>setConfirmId(null)} className="h-7 text-[var(--text-dim)]">Cancelar</Button></>) : (<><Button variant="outline" onClick={()=>setEdit(e)} className="h-7 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs rounded-lg">Editar</Button><Button variant="ghost" title="Eliminar empresa" aria-label={`Eliminar ${e.nombre}`} onClick={()=>setConfirmId(e.id)} className="h-7 text-[var(--text-dim)] hover:text-red-400"><Trash2 size={14}/></Button></>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.length===0 && <div className="p-8 text-center text-sm text-[var(--text-dim)] border-t border-[var(--border)]">Sin empresas aún</div>}
        </div>
      </div>
    </div>
  )
}
