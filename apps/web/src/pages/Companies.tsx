import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useRef, useState } from "react"
import { Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useToast } from "@/lib/toast"
import { queryKeys } from "@/shared/queryKeys"
import { companiesApi } from "@/shared/api/companies"
import { fmtDate } from "@/shared/format"

type Company = { id: string; name: string; created_at: string }

/** Native <dialog>: focus trap + Escape + backdrop come free. Backdrop close uses a native listener so no JSX handler lands on a non-interactive element. */
function useDialogSync(ref: React.RefObject<HTMLDialogElement | null>, open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      d.querySelector("input")?.focus()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open, ref])
  useEffect(() => {
    const d = ref.current
    if (!d || !open) return
    const h = (e: MouseEvent) => { if (e.target === d) closeRef.current() }
    d.addEventListener("click", h)
    return () => d.removeEventListener("click", h)
  }, [open, ref])
}

function CompanySearchBar({ q, setQ, trimmed, exists, pending, onCreate }: {
  q: string; setQ: (v: string) => void; trimmed: string; exists: boolean; pending: boolean; onCreate: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2">
      <label htmlFor="company-combobox" className="block text-xs font-medium text-[var(--text)] px-2 pt-1">{t("companies.comboboxLabel")}</label>
      <div className="flex gap-2 mt-1.5">
        <div className="relative flex-1">
          <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
          <Input id="company-combobox" role="combobox" aria-expanded="false" aria-controls="company-listbox" aria-label={t("companies.comboboxLabel")} placeholder={t("companies.searchPlaceholder")} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") { if (e.nativeEvent.isComposing) return; if(trimmed && !exists && !pending) onCreate() } }} className="bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] h-11 rounded-lg pl-9" />
        </div>
        <Button onClick={onCreate} disabled={!trimmed || exists || pending} title={exists ? t("companies.alreadyExists") : t("companies.add")} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg min-h-[44px] px-5 shrink-0"><Plus size={16}/> {t("companies.add")}</Button>
      </div>
      {exists && <p role="status" className="text-xs text-[var(--warning)] px-2 pt-1.5">{t("companies.alreadyExists")}</p>}
    </div>
  )
}

function CompanyTable({ shown, searchActive, trimmed, isPending, isError, refetch, total, onEdit, onDelete }: {
  shown: Company[]; searchActive: boolean; trimmed: string; isPending: boolean; isError: boolean
  refetch: () => void; total: number; onEdit: (c: Company) => void; onDelete: (c: Company) => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <div id="company-listbox" className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead><tr className="bg-[var(--bg)] border-b border-[var(--border)] text-left"><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("companies.colNumber")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("companies.colCompany")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("companies.colCreated")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase text-center">{t("companies.colActions")}</th></tr></thead>
        <tbody className="divide-y divide-[var(--border)]">
          {isPending ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} aria-hidden><td colSpan={4} className="p-3"><div className="h-10 rounded-lg bg-[var(--surface-2)] animate-pulse" /></td></tr>
            ))
          ) : isError ? (
            <tr><td colSpan={4} className="p-6 text-center text-sm text-[var(--text-dim)]">{t("common.loadError")} <button onClick={() => refetch()} className="text-[var(--accent)] font-medium hover:underline ml-1">{t("common.retry")}</button></td></tr>
          ) : shown?.map((e, i:number)=> (
            <tr key={e.id} className="hover:bg-[var(--surface-2)]">
              <td className="p-3 text-[var(--text-dim)] font-mono text-xs">{i+1}</td>
              <td className="p-3 text-[var(--text)]">{e.name}</td>
              <td className="p-3 text-xs text-[var(--text-dim)]">{fmtDate(e.created_at, i18n.language)}</td>
              <td className="p-3 text-center whitespace-nowrap">
                <span className="inline-flex gap-1.5 justify-center items-center">
                  <Button variant="outline" onClick={()=>onEdit(e)} title={t("companies.edit")} aria-label={t("companies.editNameAria")} aria-haspopup="dialog" className="min-w-[44px] min-h-[44px] p-0 shrink-0 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"><Pencil size={16}/></Button>
                  <Button variant="ghost" title={t("companies.delete")} aria-label={t("companies.deleteCompanyAria", { name: e.name })} aria-haspopup="dialog" onClick={()=>onDelete(e)} className="min-w-[44px] min-h-[44px] p-0 shrink-0 text-[var(--text-dim)] hover:text-[var(--danger)]"><Trash2 size={16}/></Button>
                </span>
              </td>
            </tr>
          ))}
          {!isPending && !isError && searchActive && shown.length===0 && trimmed && (
            <tr><td colSpan={4} className="p-4 text-center text-sm text-[var(--text-dim)]">
              {t("companies.noResults", { q: trimmed })}
            </td></tr>
          )}
        </tbody>
      </table>
      </div>
      {total===0 && <div className="p-8 text-center text-sm text-[var(--text-dim)] border-t border-[var(--border)]">{t("companies.noCompanies")}</div>}
    </div>
  )
}

function EditCompanyDialog({ rec, name, setName, pending, onSave, onClose }: {
  rec: Company | null; name: string; setName: (v: string) => void; pending: boolean; onSave: () => void; onClose: () => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  useDialogSync(ref, rec !== null, onClose)
  const save = () => { if (name.trim() && !pending) onSave() }
  return (
    <dialog ref={ref} onClose={onClose} aria-label={t("companies.editTitle", { name: rec?.name ?? "" })} className="bg-transparent p-4 backdrop:bg-black/60">
      <div className="w-[360px] max-w-[calc(100vw-3rem)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--text)]">{t("companies.editTitle", { name: rec?.name ?? "" })}</div>
          <button onClick={onClose} aria-label={t("common.close")} className="w-9 h-9 -mt-1 -mr-1 grid place-items-center rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><X size={16}/></button>
        </div>
        <div className="mt-4 space-y-3">
          <Input aria-label={t("companies.editNameAria")} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") { if (e.nativeEvent.isComposing) return; save() } }} className="h-11 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 min-h-[44px] rounded-xl">{t("companies.cancel")}</Button>
            <Button onClick={save} disabled={!name.trim() || pending} className="flex-1 min-h-[44px] bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-xl">{t("companies.save")}</Button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

function DeleteCompanyDialog({ rec, pending, onConfirm, onClose }: {
  rec: Company | null; pending: boolean; onConfirm: () => void; onClose: () => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  useDialogSync(ref, rec !== null, onClose)
  return (
    <dialog ref={ref} onClose={onClose} aria-label={t("companies.deleteCompanyAria", { name: rec?.name ?? "" })} className="bg-transparent p-4 backdrop:bg-black/60">
      <div className="w-[360px] max-w-[calc(100vw-3rem)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-5">
        <div className="text-sm font-semibold text-[var(--text)]">{t("companies.deleteTitle", { name: rec?.name ?? "" })}</div>
        <p className="text-xs text-[var(--text-dim)] mt-1 mb-4">{t("companies.deleteDesc")}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 min-h-[44px] rounded-xl">{t("companies.cancel")}</Button>
          <Button onClick={onConfirm} disabled={pending} className="flex-1 min-h-[44px] bg-[var(--danger)] hover:brightness-110 text-[var(--on-accent)] rounded-xl">{t("companies.confirmDelete")}</Button>
        </div>
      </div>
    </dialog>
  )
}

export function Companies() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isPending, isError, refetch } = useQuery({ queryKey: queryKeys.companies, queryFn: companiesApi.list })
  const [q,setQ]=useState("")
  const [editRec,setEditRec]=useState<Company|null>(null)
  const [editName,setEditName]=useState("")
  const [delRec,setDelRec]=useState<Company|null>(null)
  const { push } = useToast()
  const all: Company[] = data ?? []
  // Search only makes sense with 2+ records; with 0-1 the field is add-only
  const searchActive = all.length >= 2
  const shown = searchActive ? all.filter((e)=> (e.name ?? "").toLowerCase().includes(q.toLowerCase())) : all
  const trimmed = q.trim()
  const exists = !!trimmed && all.some((e)=> (e.name ?? "").toLowerCase() === trimmed.toLowerCase())
  const create = useMutation({ mutationFn: companiesApi.create, onSuccess:()=> { qc.invalidateQueries({queryKey: queryKeys.companies}); setQ("")} })
  const update = useMutation({ mutationFn: ({id,name}:{id:string;name:string})=> companiesApi.update(id, name), onSuccess:()=> { qc.invalidateQueries({queryKey: queryKeys.companies}); setEditRec(null) }, onError:()=> { push({ kind: "error", title: t("common.saveError"), actionLabel: t("common.retry"), onAction: ()=>editName.trim() && editRec && update.mutate({id: editRec.id, name: editName.trim()}) }) } })
  const del = useMutation({ mutationFn: companiesApi.remove, onSuccess:()=> qc.invalidateQueries({queryKey: queryKeys.companies}) })
  const openEdit = (e: Company) => { setEditRec(e); setEditName(e.name) }
  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-[var(--text)]">{t("companies.title")}</h1>
        <p className="text-sm text-[var(--text-dim)]">{t("companies.subtitle")}</p>
        <CompanySearchBar q={q} setQ={setQ} trimmed={trimmed} exists={exists} pending={create.isPending} onCreate={()=>create.mutate(trimmed)} />
        {searchActive && (
          <div className="flex justify-end">
            <span className="text-xs text-[var(--text-dim)]" aria-live="polite">{t("companies.count", { shown: shown.length, total: all.length })}</span>
          </div>
        )}
        <CompanyTable shown={shown} searchActive={searchActive} trimmed={trimmed} isPending={isPending} isError={isError} refetch={()=>refetch()} total={data?.length ?? 0} onEdit={openEdit} onDelete={setDelRec} />
      </div>
      <EditCompanyDialog rec={editRec} name={editName} setName={setEditName} pending={update.isPending} onSave={()=>editRec && update.mutate({id: editRec.id, name: editName.trim()})} onClose={()=>setEditRec(null)} />
      <DeleteCompanyDialog rec={delRec} pending={del.isPending} onConfirm={()=>{ if (delRec) del.mutate(delRec.id); setDelRec(null) }} onClose={()=>setDelRec(null)} />
    </div>
  )
}
