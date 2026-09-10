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
  const create = useMutation({ mutationFn: async()=> (await api.post("/empresas",{nombre})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["empresas"]}); setNombre("")} })
  const update = useMutation({ mutationFn: async()=> (await api.put(`/empresas/${edit.id}`,{nombre: edit.nombre})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["empresas"]}); setEdit(null)} })
  const del = useMutation({ mutationFn: async(id:string)=> await api.delete(`/empresas/${id}`), onSuccess:()=> qc.invalidateQueries({queryKey:["empresas"]}) })
  return (
    <div className="flex-1 bg-[#0f1117] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-white">Empresas</h1>
        <p className="text-sm text-[#8b8fa3]">Catálogo para el Editor — nombres disponibles al elegir empresa</p>
        <div className="bg-[#141722] border border-[#1e2230] rounded-xl p-4 flex gap-3">
          <Input placeholder="Nombre de empresa" value={nombre} onChange={e=>setNombre(e.target.value)} className="bg-[#0f1117] border-[#2a2e3e] text-white placeholder:text-[#8b8fa3] h-10 rounded-lg" />
          <Button onClick={()=>create.mutate()} disabled={!nombre.trim()} className="bg-[#EC4899] hover:bg-[#db2777] text-white rounded-lg h-10 px-5"><Plus size={16}/> Agregar</Button>
        </div>
        <div className="bg-[#141722] border border-[#1e2230] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#0f1117] border-b border-[#1e2230] text-left"><th className="p-3 text-xs font-medium text-[#8b8fa3] uppercase">N.º</th><th className="p-3 text-xs font-medium text-[#8b8fa3] uppercase">Empresa</th><th className="p-3 text-xs font-medium text-[#8b8fa3] uppercase">Creada</th><th className="p-3 text-xs font-medium text-[#8b8fa3] uppercase text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-[#1e2230]">
              {data?.map((e:any, i:number)=> (
                <tr key={e.id} className="hover:bg-[#1e2230]/40">
                  <td className="p-3 text-[#8b8fa3] font-mono text-xs">{i+1}</td>
                  <td className="p-3 text-white">{edit?.id===e.id ? <Input value={edit.nombre} onChange={ev=>setEdit({...edit,nombre:ev.target.value})} className="h-8 bg-[#0f1117] border-[#2a2e3e] text-white" /> : e.nombre}</td>
                  <td className="p-3 text-xs text-[#8b8fa3]">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-1.5 justify-end">
                    {edit?.id===e.id ? (<><Button onClick={()=>update.mutate()} className="h-7 bg-[#EC4899] text-white rounded-lg px-3 text-xs">Guardar</Button><Button variant="ghost" onClick={()=>setEdit(null)} className="h-7 text-[#8b8fa3]">Cancelar</Button></>) : (<><Button variant="outline" onClick={()=>setEdit(e)} className="h-7 bg-[#0f1117] border-[#2a2e3e] text-[#8b8fa3] hover:text-white text-xs rounded-lg">Editar</Button><Button variant="ghost" onClick={()=>del.mutate(e.id)} className="h-7 text-[#8b8fa3] hover:text-red-400"><Trash2 size={14}/></Button></>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.length===0 && <div className="p-8 text-center text-sm text-[#8b8fa3] border-t border-[#1e2230]">Sin empresas aún</div>}
        </div>
      </div>
    </div>
  )
}
