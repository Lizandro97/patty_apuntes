import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ArrowUpRight, Files } from "lucide-react"
import { queryKeys } from "@/shared/queryKeys"
import { recordsApi } from "@/shared/api/records"
import { companiesApi } from "@/shared/api/companies"
import { syncApi } from "@/shared/api/sync"
import { fmtDate } from "@/shared/format"

export function Inicio() {
  const { t, i18n } = useTranslation()
  const { data: recordsData, isPending: recPending, isError: recError, refetch: recRefetch } = useQuery({ queryKey: queryKeys.records, queryFn: recordsApi.list })
  const { data: companies } = useQuery({ queryKey: queryKeys.companies, queryFn: companiesApi.list })
  // Fase 4: badge honesto desde el servidor (revision global real).
  const { data: syncStatus, isPending: syncPending, isError: syncError, refetch: syncRefetch } = useQuery({ queryKey: queryKeys.syncStatus, queryFn: syncApi.status })
  const list = recordsData ?? []
  const total = list.length

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">{t("home.title")}</h1>
            <p className="text-sm text-[var(--text-dim)]">{t("home.subtitle")}</p>
          </div>
          <Link to="/editor" className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] font-medium rounded-lg px-4 py-2 min-h-[44px] inline-flex items-center text-sm flex items-center gap-1.5">
            {t("home.newFile")} <ArrowUpRight size={14}/>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {syncPending ? (
              <div className="text-sm mt-1 text-[var(--text-dim)]">{t("common.loading")}</div>
            ) : syncError ? (
              <div className="text-sm mt-1 text-[var(--danger)] flex items-center gap-1">{t("home.notSynced")} <button onClick={() => syncRefetch()} className="text-[var(--accent)] font-medium hover:underline ml-1">{t("common.retry")}</button></div>
            ) : (
              <div className="text-sm mt-1 text-[var(--success)] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)]"/>{t("home.synced")} · rev {syncStatus?.current_revision ?? 0}</div>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-sm font-semibold text-[var(--text)] mb-1">{t("home.guideTitle")}</div>
          <p className="text-xs text-[var(--text-dim)] mb-4">{t("home.guideSteps")}</p>
          <div className="text-sm font-semibold text-[var(--text)] mb-4">{t("home.recentActivity")}</div>
          {recPending ? (
            <div className="space-y-2" aria-hidden>{[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)] animate-pulse" />)}</div>
          ) : recError ? (
            <div className="text-sm text-[var(--text-dim)] py-8 text-center border border-dashed border-[var(--border)] rounded-xl">{t("common.loadError")} <button onClick={() => recRefetch()} className="text-[var(--accent)] font-medium hover:underline ml-1">{t("common.retry")}</button></div>
          ) : list.length===0 ? (
            <div className="text-sm text-[var(--text-dim)] py-8 text-center border border-dashed border-[var(--border)] rounded-xl">{t("home.empty")}</div>
          ) : (
            <div className="space-y-2">
              {list.slice(0, 50).map((a: { id: string; title: string; period_start: number; period_end: number; updated_at: string; progress?: number })=> (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-2)] transition">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] grid place-items-center text-[var(--text-dim)]"><Files size={16}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[var(--text)] text-sm">{a.title}</div>
                    <div className="text-xs text-[var(--text-dim)]">{a.period_start} — {a.period_end} • {fmtDate(a.updated_at, i18n.language)}</div>
                    <div className="mt-2 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden" role="progressbar" aria-valuenow={a.progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={t("home.progressLabel", { progress: a.progress ?? 0 })}><div className="h-full bg-[var(--accent)]" style={{width: `${a.progress ?? 0}%`}}/></div>
                  </div>
                  <div className="text-sm font-bold text-[var(--accent)]">{a.progress ?? 0}%</div>
                  <Link to={`/editor/${a.id}`} className="shrink-0 min-h-[44px] inline-flex items-center rounded-lg px-4 text-xs font-medium border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-border)]">{t("home.openFile")}</Link>
                </div>
              ))}
              {list.length > 50 && <div className="text-xs text-[var(--text-dim)] text-center pt-1">{list.length - 50} +</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
