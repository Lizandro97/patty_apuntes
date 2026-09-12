import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { Link } from "react-router-dom"
import { ArrowUpRight, Files } from "lucide-react"

export function Inicio() {
  const { t, i18n } = useTranslation()
  const { data: recordsData } = useQuery({ queryKey:["records"], queryFn: async()=> (await api.get("/records")).data })
  const { data: companies } = useQuery({ queryKey:["companies"], queryFn: async()=> (await api.get("/companies")).data })
  const list = recordsData ?? []
  const total = list.length
  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(i18n.language === "en" ? "en-US" : "es-PE")
    } catch {
      return d
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">{t("home.title")}</h1>
            <p className="text-sm text-[var(--text-dim)]">{t("home.subtitle")}</p>
          </div>
          <Link to="/editor" className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] font-medium rounded-lg px-4 py-2 text-sm flex items-center gap-1.5">
            {t("home.newFile")} <ArrowUpRight size={14}/>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{t("home.totalFiles")}</div>
            <div className="text-2xl font-bold text-[var(--text)] mt-1">{total}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{t("home.companies")}</div>
            <div className="text-2xl font-bold text-[var(--text)] mt-1">{companies?.length ?? 0}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wide">{t("home.status")}</div>
            <div className="text-sm mt-1 text-[var(--success)] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"/>{t("home.synced")}</div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-sm font-semibold text-[var(--text)] mb-4">{t("home.recentActivity")}</div>
          {list.length===0 ? (
            <div className="text-sm text-[var(--text-dim)] py-8 text-center border border-dashed border-[var(--border)] rounded-xl">{t("home.empty")}</div>
          ) : (
            <div className="space-y-2">
              {list.map((a:any)=> (
                <Link key={a.id} to={`/editor/${a.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-2)] transition">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] grid place-items-center text-[var(--text-dim)]"><Files size={16}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[var(--text)] text-sm">{a.title}</div>
                    <div className="text-xs text-[var(--text-dim)]">{a.period_start} — {a.period_end} • {fmtDate(a.updated_at)}</div>
                    <div className="mt-2 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{width: `${a.progress ?? 0}%`}}/></div>
                  </div>
                  <div className="text-sm font-bold text-[var(--accent)]">{a.progress ?? 0}%</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
