import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Plus, Download, Trash2, Search, Pencil, X, ChevronDown } from "lucide-react"
import { defaultTitle, newRecordPayload } from "@/lib/defaults"
import { useToast } from "@/lib/toast"
import { downloadBlob, exportFilename } from "@/lib/filenames"
import { queryKeys } from "@/shared/queryKeys"
import { recordsApi } from "@/shared/api/records"
import { fmtDate } from "@/shared/format"

type RecordItem = { id: string; title: string; progress?: number; created_at?: string; updated_at?: string }

export function Records() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: queryKeys.records, queryFn: recordsApi.list })
  const { push } = useToast()
  const [title,setTitle]=useState("")
  const [q,setQ]=useState("")
  const [sort,setSort]=useState<"date"|"progress"|"title">("date")
  const [renameRec,setRenameRec]=useState<RecordItem|null>(null)
  const [renameTitle,setRenameTitle]=useState("")
  const [dlRec,setDlRec]=useState<RecordItem|null>(null)
  const [delRec,setDelRec]=useState<RecordItem|null>(null)
  const [sortOpen,setSortOpen]=useState(false)
  const [sortPos,setSortPos]=useState<{top:number;left:number;width:number}|null>(null)
  const sortBtnRef=useRef<HTMLButtonElement|null>(null)
  const sortLabel=(v:string)=> v==="progress" ? t("records.sortProgress") : v==="title" ? t("records.sortTitle") : t("records.sortRecent")
  const openSort=()=>{
    const r=sortBtnRef.current?.getBoundingClientRect()
    if(r) setSortPos({ top: r.bottom+6, left: Math.max(8, r.right-r.width), width: Math.max(120, r.width) })
    setSortOpen(true)
  }
  const closeSort=(refocus=false)=>{
    setSortOpen(false)
    setSortPos(null)
    if(refocus) sortBtnRef.current?.focus()
  }
  useEffect(() => {
    if (!sortOpen) return
    const onDown=(e:MouseEvent)=>{ if(!(e.target as HTMLElement).closest?.("[data-sortmenu]") && !(sortBtnRef.current && sortBtnRef.current.contains(e.target as Node))) closeSort() }
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") closeSort(true) }
    const onScroll=()=>closeSort()
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return ()=>{ document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll) }
  }, [sortOpen])
  useEffect(() => {
    if (!dlRec && !delRec && !renameRec) return
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setDlRec(null); setDelRec(null); setRenameRec(null) } }
    document.addEventListener("keydown", k)
    return () => document.removeEventListener("keydown", k)
  }, [dlRec, delRec, renameRec])
  const PAGE = 50
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [q, sort, (data as RecordItem[])?.length])
  const filtered=((data as RecordItem[]) ?? []).filter((a)=> (a.title ?? "").toLowerCase().includes(q.toLowerCase())).sort((a,b)=> sort==="progress" ? ((b.progress??0)-(a.progress??0)) : sort==="title" ? String(a.title??"").localeCompare(String(b.title??"")) : String(b.created_at??"").localeCompare(String(a.created_at??"")))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const safePage = Math.min(page, pages - 1)
  const list = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE)
  const create = useMutation({ mutationFn: async()=> recordsApi.create({...newRecordPayload(), title: title || defaultTitle()}), onSuccess:(d)=> { qc.invalidateQueries({queryKey: queryKeys.records}); setTitle(""); nav(`/editor/${d.id}`) } })
  const rename = useMutation({ mutationFn: ({id,title: newTitle}:{id:string;title:string})=> recordsApi.rename(id, newTitle), onSuccess:()=> { qc.invalidateQueries({queryKey: queryKeys.records}); setRenameRec(null) }, onError:()=> { push({ kind: "error", title: t("common.saveError"), actionLabel: t("common.retry"), onAction: ()=>renameTitle.trim() && renameRec && rename.mutate({id: renameRec.id, title: renameTitle.trim()}) }) } })
  const del = useMutation({ mutationFn: (id:string)=> recordsApi.remove(id), onSuccess:()=> qc.invalidateQueries({queryKey: queryKeys.records}) })
  const fmtUpdated = (d?: string) => d ? fmtDate(d, i18n.language) : t("records.notUpdated")
  const download = async (rec: RecordItem, fmt:"pdf"|"excel") => {
    try {
      const blob = await recordsApi.exportBlob(rec.id, fmt, i18n.language)
      downloadBlob(blob, exportFilename(rec.title ?? t("records.downloadBase"), fmt === "pdf" ? "pdf" : "xlsx"))
      push({ kind: "success", title: t("common.exportOk") })
    } catch (e: any) {
      const d = e?.response?.data?.detail
      if (e?.response?.status === 422 && d?.faltantes) {
        push({ kind: "error", title: t("records.exportMissingTitle"), desc: d.faltantes.map((f: any) => `• ${t("records.exportRowMissing", { row: f.row, name: f.name })}`).join("\n") })
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
          <div className="flex gap-2 max-md:flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2">
            <Input aria-label={t("records.newTitlePlaceholder")} placeholder={t("records.newTitlePlaceholder")} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && !create.isPending) create.mutate() }} className="w-64 max-md:w-full bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg" />
            <Button onClick={()=>create.mutate()} disabled={create.isPending} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg min-h-[44px]"><Plus size={16}/> {t("records.create")}</Button>
          </div>
        </div>
        <div>
          <label htmlFor="records-search" className="block text-xs font-medium text-[var(--text)] px-1 pb-1.5">{t("records.searchLabel")}</label>
          <div className="flex items-stretch h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--accent)] transition overflow-hidden">
            <div className="relative flex-1 min-w-0">
              <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input id="records-search" aria-label={t("records.searchLabel")} placeholder={t("records.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)} className="w-full h-full bg-transparent text-[var(--text)] placeholder:text-[var(--text-dim)] text-base pl-9 pr-2 focus:outline-none" />
            </div>
            <span aria-hidden className="w-px self-stretch my-2 bg-[var(--border)] shrink-0" />
            <button
              ref={sortBtnRef}
              onClick={()=>sortOpen ? closeSort(true) : openSort()}
              title={t("records.sortLabel")}
              aria-label={`${t("records.sortLabel")}: ${sortLabel(sort)}`}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              className="shrink-0 h-full min-w-[44px] flex items-center gap-1 text-[var(--text)] text-xs font-medium pl-2 pr-2 hover:text-[var(--accent)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              {sortLabel(sort)}
              <ChevronDown size={14} className={`text-[var(--text-dim)] shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
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
                    <span className="block min-w-0">
                      <button onClick={()=>nav(`/editor/${a.id}`)} title={t("records.openInEditor")} aria-label={t("records.openFileAria", { title: a.title })} className="font-medium truncate text-[var(--text)] hover:text-[var(--accent)] hover:underline underline-offset-4 decoration-[var(--accent-border)] decoration-2 cursor-pointer transition-colors text-sm block max-w-full rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{a.title}</button>
                      <span className="text-xs text-[var(--text-dim)]">{a.review_type ? `${a.review_type} • ` : ""}{a.period_start}-{a.period_end}</span>
                    </span>
                  </td>
                  <td className="p-3 min-w-[140px]">
                    <span className="flex items-center gap-2" role="progressbar" aria-valuenow={a.progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={t("home.progressLabel", { progress: a.progress ?? 0 })}>
                      <span className="flex-1 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden"><span className="block h-full bg-[var(--accent)]" style={{width:`${a.progress??0}%`}}/></span>
                      <span className="text-xs font-bold text-[var(--accent)]">{a.progress ?? 0}%</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-[var(--text-dim)] whitespace-nowrap">{fmtUpdated(a.updated_at)}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className="inline-flex gap-1.5 justify-center items-center">
                      <Button variant="outline" onClick={()=>{ setRenameRec(a); setRenameTitle(a.title) }} title={t("records.rename")} aria-label={t("records.renameFileAria")} aria-haspopup="dialog" className="min-w-[44px] min-h-[44px] p-0 shrink-0 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"><Pencil size={16}/></Button>
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
          {list.length===0 && <div className="text-center py-12 text-sm text-[var(--text-dim)] border-t border-[var(--border)]">{q ? t("records.noResults") : t("records.noFiles")}</div>}
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
    {renameRec && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={()=>setRenameRec(null)}>
        <div role="dialog" aria-modal="true" aria-label={t("records.renameTitle", { title: renameRec.title })} className="w-[360px] max-w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-5" onClick={e=>e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-[var(--text)]">{t("records.renameTitle", { title: renameRec.title })}</div>
            <button onClick={()=>setRenameRec(null)} aria-label={t("common.close")} className="w-9 h-9 -mt-1 -mr-1 grid place-items-center rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><X size={16}/></button>
          </div>
          <div className="mt-4 space-y-3">
            <Input autoFocus aria-label={t("records.renameFileAria")} value={renameTitle} onChange={e=>setRenameTitle(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && renameTitle.trim() && !rename.isPending) rename.mutate({id: renameRec.id, title: renameTitle.trim()}) }} className="h-11 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=>setRenameRec(null)} className="flex-1 min-h-[44px] rounded-xl">{t("records.cancel")}</Button>
              <Button onClick={()=>rename.mutate({id: renameRec.id, title: renameTitle.trim()})} disabled={!renameTitle.trim() || rename.isPending} className="flex-1 min-h-[44px] bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-xl">{t("records.save")}</Button>
            </div>
          </div>
        </div>
      </div>
    )}
    {sortOpen && sortPos && createPortal(
      <div data-sortmenu role="menu" aria-label={t("records.sortLabel")} style={{ position: "fixed", top: sortPos.top, left: sortPos.left, width: sortPos.width, zIndex: 70 }} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] p-1.5">
        {(["date", "progress", "title"] as const).map(v => (
          <button
            key={v}
            role="menuitemradio"
            aria-checked={sort===v}
            onClick={()=>{ setSort(v); closeSort(true) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition"
          >
            {sortLabel(v)}
            <span className="ml-auto text-[var(--accent)] text-xs">{sort===v ? "✓" : ""}</span>
          </button>
        ))}
      </div>,
      document.body
    )}
  </>
  )
}
