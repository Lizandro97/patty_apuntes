import { useConfigStore } from "@/stores/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"

export function Configuracion() {
  const cfg = useConfigStore()
  const [saved,setSaved]=useState(false)
  useEffect(()=>{ api.get("/config").then(r=> cfg.set(r.data)).catch(()=>{}) },[])
  const save = async()=>{
    await api.put("/config", {
      primary_color: cfg.primary_color,
      font_family: cfg.font_family,
      font_size_px: cfg.font_size_px,
      table_density: cfg.table_density,
      grid_columns: cfg.grid_columns,
      show_summary: cfg.show_summary,
      rounded_borders: cfg.rounded_borders,
      pastel_mode: cfg.pastel_mode,
      visible_fields: cfg.visible_fields,
    }).catch(()=>{})
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }
  return (
    <div className="flex-1 bg-[#0f1117] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-white">Configuración</h1>
        <p className="text-sm text-[#8b8fa3]">Valores por defecto globales</p>
        <div className="bg-[#141722] border border-[#1e2230] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-medium text-white mb-3">Color primario</h3>
            <div className="flex gap-2 items-center">
              {["#EC4899","#0ea5e9","#8b5cf6","#ec4899","#f97316","#eab308","#10b981"].map(c=> (
                <button key={c} onClick={()=>cfg.set({primary_color:c})} className="w-8 h-8 rounded-full border-2" style={{background:c, borderColor: cfg.primary_color===c?"white":"#2a2e3e"}} />
              ))}
              <Input type="color" value={cfg.primary_color} onChange={e=>cfg.set({primary_color:e.target.value})} className="w-12 h-8 p-1 bg-[#0f1117] border-[#2a2e3e]" />
              <span className="text-xs text-[#8b8fa3]">{cfg.primary_color}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-[#8b8fa3]">Fuente</label><select value={cfg.font_family} onChange={e=>cfg.set({font_family:e.target.value})} className="w-full bg-[#0f1117] border border-[#2a2e3e] rounded-lg px-3 py-2 mt-1 text-sm text-white"><option>Inter</option><option>Geist</option></select></div>
            <div><label className="text-xs text-[#8b8fa3]">Tamaño</label><select value={cfg.font_size_px} onChange={e=>cfg.set({font_size_px: Number(e.target.value)})} className="w-full bg-[#0f1117] border border-[#2a2e3e] rounded-lg px-3 py-2 mt-1 text-sm text-white"><option value={12}>12 px</option><option value={14}>14 px</option></select></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="bg-[#EC4899] hover:bg-[#db2777] text-white rounded-lg">Guardar en servidor</Button>
            <Button variant="outline" onClick={()=>cfg.reset()} className="bg-[#0f1117] border-[#2a2e3e] text-[#8b8fa3] rounded-lg">Restablecer</Button>
            {saved && <span className="text-sm text-emerald-400 self-center">✓ Guardado</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
