import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Link } from "react-router-dom"
import { ArrowUpRight, Files, Building2 } from "lucide-react"

export function Inicio() {
  const { data: archivos } = useQuery({ queryKey:["archivos"], queryFn: async()=> (await api.get("/archivos")).data })
  const { data: empresas } = useQuery({ queryKey:["empresas"], queryFn: async()=> (await api.get("/empresas")).data })
  const list = archivos ?? []
  const total = list.length

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">Inicio</h1>
            <p className="text-sm text-[var(--text-dim)]">Actividad reciente y resumen</p>
          </div>
          <Link to="/editor" className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] font-medium rounded-lg px-4 py-2 text-sm flex items-center gap-1.5">
            Nuevo archivo <ArrowUpRight size={14}/>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">Total archivos</div>
            <div className="text-2xl font-bold text-[var(--text)] mt-1">{total}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">Empresas</div>
            <div className="text-2xl font-bold text-[var(--text)] mt-1">{empresas?.length ?? 0}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">Estado</div>
            <div className="text-sm mt-1 text-[var(--success)] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Sincronizado</div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-sm font-semibold text-[var(--text)] mb-4">Actividad reciente</div>
          {list.length===0 ? (
            <div className="text-sm text-[var(--text-dim)] py-8 text-center border border-dashed border-[var(--border)] rounded-xl">Aún no hay archivos. Crea tu primera revisión en el Editor.</div>
          ) : (
            <div className="space-y-2">
              {list.map((a:any)=> (
                <Link key={a.id} to={`/editor/${a.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-2)] transition">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] grid place-items-center text-[var(--text-dim)]"><Files size={16}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[var(--text)] text-sm">{a.titulo}</div>
                    <div className="text-xs text-[var(--text-dim)]">{a.periodo_inicio} — {a.periodo_fin} • {new Date(a.updated_at).toLocaleDateString()}</div>
                    <div className="mt-2 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{width: `${a.progreso ?? 0}%`}}/></div>
                  </div>
                  <div className="text-sm font-bold text-[var(--accent)]">{a.progreso ?? 0}%</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
