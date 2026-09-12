import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Plus, Download, Trash2, Search, Pencil, X } from "lucide-react"
import { defaultTitle, newRecordPayload } from "@/lib/defaults"
import { useToast } from "@/lib/toast"
import { downloadBlob, exportFilename } from "@/lib/filenames"

export function Records() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data, isPending, isError, refetch } = useQuery({ queryKey:["records"], queryFn: async()=> (await api.get("/records")).data })
  const { push } = useToast()
  const [title,setTitle]=useState("")
  const [q,setQ]=useState("")
  const [sort,setSort]=useState<"date"|"progress"|"title">("date")
  const [edit,setEdit]=useState<any>(null)
  const [dlRec,setDlRec]=useState<any|null>(null)
  const [delRec,setDelRec]=useState<any|null>(null)
  useEffect(() => {
    if (!dlRec && !delRec) return
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setDlRec(null); setDelRec(null) } }
    document.addEventListener("keydown", k)
    return () => document.removeEventListener("keydown", k)
  }, [dlRec, delRec])
  const PAGE = 50
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [q, sort, (data as any[])?.length])
  const filtered=((data as any[]) ?? []).filter((a:any)=> (a.title ?? "").toLowerCase().includes(q.toLowerCase())).sort((a:any,b:any)=> sort==="progress" ? ((b.progress??0)-(a.progress??0)) : sort==="title" ? String(a.title??"").localeCompare(String(b.title??"")) : String(b.created_at??"").localeCompare(String(a.created_at??"")))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const safePage = Math.min(page, pages - 1)
  const list = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE)
  const create = useMutation({ mutationFn: async()=> (await api.post("/records",{...newRecordPayload(), title: title || defaultTitle()})).data, onSuccess:(d)=> { qc.invalidateQueries({queryKey:["records"]}); setTitle(""); nav(`/editor/${d.id}`) } })
  const rename = useMutation({ mutationFn: async()=> (await api.put(`/records/${edit.id}`,{title: edit.title})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["records"]}); setEdit(null) } })
  const del = useMutation({ mutationFn: async(id:string)=> api.delete(`/records/${id}`), onSuccess:()=> qc.invalidateQueries({queryKey:["records"]}) })
  const fmtDate = (d?: string) => {
    if (!d) return t("records.notUpdated")
    try {
      return new Date(d).toLocaleDateString(i18n.language === "en" ? "en-US" : "es-PE")
    } catch {
      return d
    }
  }
  const download = async (rec:any, fmt:"pdf"|"excel") => {
    try {
      const r = await api.get(`/records/${rec.id}/export?format=${fmt}&lang=${i18n.language}`, { responseType:"blob" })
      downloadBlob(r.data, exportFilename(rec.title ?? t("records.downloadBase"), fmt === "pdf" ? "pdf" : "xlsx"))
      push({ kind: "success", title: t("common.exportOk") })
    } catch (e: any) {
      const d = e?.response?.data?.detail
      if (e?.response?.status === 422 && d?.faltantes) {
        push({ kind: "error", title: t("records.exportMissingTitle"), desc: d.faltantes.map((f: any) => `• ${t("records.exportRowMissing", { row: f.fila, name: f.nombre })}`).join("\n") })
      } else {
        push({ kind: "error", title: t("common.exportError"), actionLabel: t("common.retry"), onAction: () => download(rec, fmt) })
      }
    }
  }
  return (
    <>
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)]">{t("records.title")}</h1>
            <p className="text-sm text-[var(--text-dim)]">{t("records.subtitle")}</p>
          </div>
          <div className="flex gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2">
            <Input aria-label={t("records.newTitlePlaceholder")} placeholder={t("records.newTitlePlaceholder")} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && !create.isPending) create.mutate() }} className="w-64 h-9 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg" />
            <Button onClick={()=>create.mutate()} disabled={create.isPending} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-9"><Plus size={16}/> {t("records.createAndOpen")}</Button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <Input aria-label={t("records.searchPlaceholder")} placeholder={t("records.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)} className="h-9 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg pl-9" />
          </div>
          <select aria-label={t("records.sortLabel")} value={sort} onChange={e=>setSort(e.target.value as any)} className="h-11 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-3">
            <option value="date">{t("records.sortRecent")}</option>
            <option value="progress">{t("records.sortProgress")}</option>
            <option value="title">{t("records.sortTitle")}</option>
          </select>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="bg-[var(--bg)] border-b border-[var(--border)] text-left"><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("records.colNumber")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("records.colFile")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase" aria-sort={sort==="progress" ? "descending" : "none"}>{t("records.colProgress")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase" aria-sort={sort==="date" ? "descending" : "none"}>{t("records.colUpdated")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase text-center">{t("records.colActions")}</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isPending ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} aria-hidden><td colSpan={5} className="p-3"><div className="h-10 rounded-lg bg-[var(--surface-2)] animate-pulse" /></td></tr>
                ))
              ) : isError ? (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-[var(--text-dim)]">{t("common.loadError")} <button onClick={() => refetch()} className="text-[var(--accent)] font-medium hover:underline ml-1">{t("common.retry")}</button></td></tr>
              ) : list.map((a:any, i:number)=> (
                <tr key={a.id} className="hover:bg-[var(--surface-2)] transition">
                  <td className="p-3 text-[var(--text-dim)] font-mono text-xs">{i+1}</td>
                  <td className="p-3 min-w-0">
                    {edit?.id===a.id ? (
                      <span className="flex gap-1.5">
                        <Input aria-label={t("records.renameFileAria")} value={edit.title} onChange={ev=>setEdit({...edit,title:ev.target.value})} onKeyDown={ev=>{ if(ev.key==="Enter") rename.mutate(); if(ev.key==="Escape") setEdit(null) }} className="h-11 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                        <Button onClick={()=>rename.mutate()} disabled={rename.isPending} className="min-h-[44px] bg-[var(--accent)] text-[var(--on-accent)] rounded-lg px-3 text-xs">{t("records.save")}</Button>
                        <Button variant="ghost" onClick={()=>setEdit(null)} className="min-h-[44px] text-[var(--text-dim)] text-xs">{t("records.cancel")}</Button>
                      </span>
                    ) : (
                      <span className="block min-w-0">
                        <button onClick={()=>nav(`/editor/${a.id}`)} title={t("records.openInEditor")} aria-label={t("records.openFileAria", { title: a.title })} className="font-medium truncate text-[var(--text)] hover:text-[var(--accent)] hover:underline underline-offset-4 decoration-[var(--accent-border)] decoration-2 cursor-pointer transition-colors text-sm block max-w-full rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{a.title}</button>
                        <span className="text-xs text-[var(--text-dim)]">{a.review_type ? `${a.review_type} • ` : ""}{a.period_start}-{a.period_end}</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 min-w-[140px]">
                    <span className="flex items-center gap-2" role="progressbar" aria-valuenow={a.progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={t("home.progressLabel", { progress: a.progress ?? 0 })}>
                      <span className="flex-1 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden"><span className="block h-full bg-[var(--accent)]" style={{width:`${a.progress??0}%`}}/></span>
                      <span className="text-xs font-bold text-[var(--accent)]">{a.progress ?? 0}%</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-[var(--text-dim)] whitespace-nowrap">{fmtDate(a.updated_at)}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className="inline-flex gap-1.5 justify-center items-center">
                      {edit?.id===a.id ? null : (<Button variant="outline" onClick={()=>setEdit({id:a.id,title:a.title})} title={t("records.rename")} aria-label={t("records.renameFileAria")} className="min-w-[44px] min-h-[44px] p-0 shrink-0 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"><Pencil size={16}/></Button>)}
                      <Button variant="ghost" title={t("records.download")} aria-label={t("records.downloadFileAria", { title: a.title })} aria-haspopup="dialog" onClick={()=>setDlRec(a)} className="min-w-[44px] min-h-[44px] p-0 shrink-0 text-[var(--text-dim)] hover:text-[var(--text)]"><Download size={16}/></Button>
                      <Button variant="ghost" title={t("records.delete")} aria-label={t("records.deleteFileAria", { title: a.title })} aria-haspopup="dialog" onClick={()=>setDelRec(a)} className="min-w-[44px] min-h-[44px] p-0 shrink-0 text-[var(--text-dim)] hover:text-[var(--danger)]"><Trash2 size={16}/></Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filtered.length > PAGE && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--text-dim)]">
              <span>{safePage * PAGE + 1}–{Math.min(filtered.length, safePage * PAGE + PAGE)} / {filtered.length}</span>
              <span className="flex gap-1">
                <Button variant="outline" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="min-h-[44px] px-4 rounded-lg">←</Button>
                <Button variant="outline" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="min-h-[44px] px-4 rounded-lg">→</Button>
              </span>
            </div>
          )}
          {list.length===0 && <div className="text-center py-12 text-sm text-[var(--text-dim)] border-t border-[var(--border)] space-y-3"><div>{q ? t("records.noResults") : t("records.noFiles")}</div>{!q && (data as any[])?.length===0 && <Button onClick={()=>create.mutate()} disabled={create.isPending} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg min-h-[44px]"><Plus size={16}/> {t("records.createFile")}</Button>}</div>}
        </div>
      </div>
    </div>
    {dlRec && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={()=>setDlRec(null)}>
        <div role="dialog" aria-modal="true" aria-label={t("records.downloadTitle", { title: dlRec.title })} className="w-[360px] max-w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-5" onClick={e=>e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-[var(--text)]">{t("records.downloadTitle", { title: dlRec.title })}</div>
            <button onClick={()=>setDlRec(null)} aria-label={t("common.close")} className="w-9 h-9 -mt-1 -mr-1 grid place-items-center rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><X size={16}/></button>
          </div>
          <div className="mt-4 space-y-2">
            <Button onClick={()=>{ download(dlRec,"pdf"); setDlRec(null) }} className="w-full min-h-[44px] bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-xl justify-start gap-2.5 px-4"><Download size={15}/>{t("records.downloadPdf")}</Button>
            <Button variant="outline" onClick={()=>{ download(dlRec,"excel"); setDlRec(null) }} className="w-full min-h-[44px] rounded-xl justify-start gap-2.5 px-4"><Download size={15}/>{t("records.downloadExcel")}</Button>
          </div>
        </div>
      </div>
    )}
    {delRec && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={()=>setDelRec(null)}>
        <div role="alertdialog" aria-modal="true" aria-label={t("records.deleteFileAria", { title: delRec.title })} className="w-[360px] max-w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-5" onClick={e=>e.stopPropagation()}>
          <div className="text-sm font-semibold text-[var(--text)]">{t("records.deleteTitle", { title: delRec.title })}</div>
          <p className="text-xs text-[var(--text-dim)] mt-1 mb-4">{t("records.deleteDesc")}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setDelRec(null)} className="flex-1 min-h-[44px] rounded-xl">{t("records.cancel")}</Button>
            <Button onClick={()=>{ del.mutate(delRec.id); setDelRec(null) }} disabled={del.isPending} className="flex-1 min-h-[44px] bg-[var(--danger)] hover:brightness-110 text-[var(--on-accent)] rounded-xl">{t("records.confirmDelete")}</Button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
