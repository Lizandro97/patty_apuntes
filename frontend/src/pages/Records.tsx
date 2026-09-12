import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { Plus, Download, Trash2, Search } from "lucide-react"
import { defaultTitle, newRecordPayload } from "@/lib/defaults"

export function Records() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data } = useQuery({ queryKey:["records"], queryFn: async()=> (await api.get("/records")).data })
  const [title,setTitle]=useState("")
  const [q,setQ]=useState("")
  const [sort,setSort]=useState<"date"|"progress"|"title">("date")
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
  const list=((data as any[]) ?? []).filter((a:any)=> (a.title ?? "").toLowerCase().includes(q.toLowerCase())).sort((a:any,b:any)=> sort==="progress" ? ((b.progress??0)-(a.progress??0)) : sort==="title" ? String(a.title??"").localeCompare(String(b.title??"")) : String(b.created_at??"").localeCompare(String(a.created_at??"")))
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
  const download = async (id:string, fmt:"pdf"|"excel") => {
    try {
      const r = await api.get(`/records/${id}/export?format=${fmt}&lang=${i18n.language}`, { responseType:"blob" })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement("a")
      a.href=url
      a.download=`${t("records.downloadBase")}-${id}.${fmt==="pdf"?"pdf":"xlsx"}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      const d = e?.response?.data?.detail
      if (e?.response?.status === 422 && d?.faltantes) {
        alert(`${t("records.exportMissingTitle")}\n` + d.faltantes.map((f: any) => `• ${t("records.exportRowMissing", { row: f.fila, name: f.nombre })}`).join("\n"))
      }
    }
  }
  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[1000px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)]">{t("records.title")}</h1>
            <p className="text-sm text-[var(--text-dim)]">{t("records.subtitle")}</p>
          </div>
          <div className="flex gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2">
            <Input ref={inputRef} aria-label={t("records.newTitlePlaceholder")} placeholder={t("records.newTitlePlaceholder")} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") create.mutate() }} className="w-64 h-9 bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg" />
            <Button onClick={()=>create.mutate()} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-9"><Plus size={16}/> {t("records.createAndOpen")}</Button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <Input aria-label={t("records.searchPlaceholder")} placeholder={t("records.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)} className="h-9 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg pl-9" />
          </div>
          <select aria-label={t("records.sortLabel")} value={sort} onChange={e=>setSort(e.target.value as any)} className="h-9 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-3">
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
              {list.map((a:any, i:number)=> (
                <tr key={a.id} onClick={()=>nav(`/editor/${a.id}`)} title={t("records.openInEditor")} className="cursor-pointer hover:bg-[var(--surface-2)] transition">
                  <td className="p-3 text-[var(--text-dim)] font-mono text-xs">{i+1}</td>
                  <td className="p-3 min-w-0" onClick={e=>e.stopPropagation()}>
                    {edit?.id===a.id ? (
                      <span className="flex gap-1.5">
                        <Input aria-label={t("records.renameFileAria")} value={edit.title} onChange={ev=>setEdit({...edit,title:ev.target.value})} onKeyDown={ev=>{ if(ev.key==="Enter") rename.mutate() }} className="h-8 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                        <Button onClick={()=>rename.mutate()} className="h-8 bg-[var(--accent)] text-[var(--on-accent)] rounded-lg px-3 text-xs">{t("records.save")}</Button>
                        <Button variant="ghost" onClick={()=>setEdit(null)} className="h-8 text-[var(--text-dim)] text-xs">{t("records.cancel")}</Button>
                      </span>
                    ) : (
                      <span className="block cursor-pointer" onClick={()=>nav(`/editor/${a.id}`)}>
                        <span className="font-medium truncate text-[var(--text)] text-sm block">{a.title}</span>
                        <span className="text-xs text-[var(--text-dim)]">{a.review_type ? `${a.review_type} • ` : ""}{a.period_start}-{a.period_end}</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 min-w-[140px]">
                    <span className="flex items-center gap-2">
                      <span className="flex-1 h-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden"><span className="block h-full bg-[var(--accent)]" style={{width:`${a.progress??0}%`}}/></span>
                      <span className="text-xs font-bold text-[var(--accent)]">{a.progress ?? 0}%</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-[var(--text-dim)] whitespace-nowrap">{fmtDate(a.updated_at)}</td>
                  <td className="p-3 text-center whitespace-nowrap" onClick={e=>e.stopPropagation()}>
                    <span className="inline-flex gap-1.5 justify-center items-center">
                      {edit?.id===a.id ? null : (<Button variant="outline" onClick={()=>setEdit({id:a.id,title:a.title})} className="h-7 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs rounded-lg">{t("records.rename")}</Button>)}
                      <span className="relative" data-dlmenu>
                        <Button variant="ghost" title={t("records.download")} aria-label={t("records.downloadFileAria", { title: a.title })} aria-haspopup="menu" aria-expanded={dlId===a.id} onClick={()=>setDlId(dlId===a.id?null:a.id)} className="h-7 w-7 p-0 shrink-0 text-[var(--text-dim)] hover:text-[var(--text)]"><Download size={14}/></Button>
                        {dlId===a.id && (
                          <span role="menu" className="absolute right-0 top-full mt-1 w-[150px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-1.5 z-30 block">
                            <button role="menuitem" onClick={()=>{ setDlId(null); download(a.id,"pdf") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)]">{t("records.downloadPdf")}</button>
                            <button role="menuitem" onClick={()=>{ setDlId(null); download(a.id,"excel") }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)]">{t("records.downloadExcel")}</button>
                          </span>
                        )}
                      </span>
                      {confirmId===a.id ? (
                        <span className="flex gap-1.5">
                          <Button onClick={()=>{ del.mutate(a.id); setConfirmId(null) }} className="h-7 bg-[var(--danger)] hover:brightness-110 text-[var(--on-accent)] rounded-lg px-3 text-xs">{t("records.confirmDelete")}</Button>
                          <Button variant="ghost" onClick={()=>setConfirmId(null)} className="h-7 text-[var(--text-dim)] text-xs">{t("records.cancel")}</Button>
                        </span>
                      ) : (
                        <Button variant="ghost" title={t("records.delete")} aria-label={t("records.deleteFileAria", { title: a.title })} className="h-7 w-7 p-0 shrink-0 text-[var(--text-dim)] hover:text-[var(--danger)]" onClick={()=>setConfirmId(a.id)}><Trash2 size={14}/></Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {list.length===0 && <div className="text-center py-12 text-sm text-[var(--text-dim)] border-t border-[var(--border)] space-y-3"><div>{q ? t("records.noResults") : t("records.noFiles")}</div>{!q && (data as any[])?.length===0 && <Button onClick={()=>create.mutate()} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-9"><Plus size={16}/> {t("records.createFile")}</Button>}</div>}
        </div>
      </div>
    </div>
  )
}
