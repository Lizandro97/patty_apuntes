import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

export function Companies() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey:["companies"], queryFn: async()=> (await api.get("/companies")).data })
  const [name,setName]=useState("")
  const [edit,setEdit]=useState<any>(null)
  const [confirmId,setConfirmId]=useState<string|null>(null)
  const create = useMutation({ mutationFn: async()=> (await api.post("/companies",{name: name})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["companies"]}); setName("")} })
  const update = useMutation({ mutationFn: async()=> (await api.put(`/companies/${edit.id}`,{name: edit.name})).data, onSuccess:()=> { qc.invalidateQueries({queryKey:["companies"]}); setEdit(null)} })
  const del = useMutation({ mutationFn: async(id:string)=> await api.delete(`/companies/${id}`), onSuccess:()=> qc.invalidateQueries({queryKey:["companies"]}) })
  return (
    <div className="flex-1 bg-[var(--bg)] p-6 overflow-auto">
      <div className="max-w-[800px] mx-auto space-y-4">
        <h1 className="text-[22px] font-bold text-[var(--text)]">{t("companies.title")}</h1>
        <p className="text-sm text-[var(--text-dim)]">{t("companies.subtitle")}</p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex gap-3">
          <Input aria-label={t("companies.namePlaceholder")} placeholder={t("companies.namePlaceholder")} value={name} onChange={e=>setName(e.target.value)} className="bg-[var(--bg)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] h-10 rounded-lg" />
          <Button onClick={()=>create.mutate()} disabled={!name.trim()} className="bg-[var(--accent)] hover:brightness-110 text-[var(--on-accent)] rounded-lg h-10 px-5"><Plus size={16}/> {t("companies.add")}</Button>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="bg-[var(--bg)] border-b border-[var(--border)] text-left"><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("companies.colNumber")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("companies.colCompany")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase">{t("companies.colCreated")}</th><th className="p-3 text-xs font-medium text-[var(--text-dim)] uppercase text-center">{t("companies.colActions")}</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.map((e:any, i:number)=> (
                <tr key={e.id} className="hover:bg-[var(--surface-2)]">
                  <td className="p-3 text-[var(--text-dim)] font-mono text-xs">{i+1}</td>
                  <td className="p-3 text-[var(--text)]">{edit?.id===e.id ? <Input aria-label={t("companies.editNameAria")} value={edit.name} onChange={ev=>setEdit({...edit,name:ev.target.value})} className="h-8 bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" /> : e.name}</td>
                  <td className="p-3 text-xs text-[var(--text-dim)]">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className="inline-flex gap-1.5 justify-center items-center">
                    {edit?.id===e.id ? (<><Button onClick={()=>update.mutate()} className="h-7 bg-[var(--accent)] text-[var(--on-accent)] rounded-lg px-3 text-xs">{t("companies.save")}</Button><Button variant="ghost" onClick={()=>setEdit(null)} className="h-7 text-[var(--text-dim)]">{t("companies.cancel")}</Button></>) : confirmId===e.id ? (<><Button onClick={()=>{ del.mutate(e.id); setConfirmId(null) }} className="h-7 bg-[var(--danger)] hover:brightness-110 text-[var(--on-accent)] rounded-lg px-3 text-xs">{t("companies.confirmDelete")}</Button><Button variant="ghost" onClick={()=>setConfirmId(null)} className="h-7 text-[var(--text-dim)]">{t("companies.cancel")}</Button></>) : (<><Button variant="outline" onClick={()=>setEdit(e)} className="h-7 bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] text-xs rounded-lg">{t("companies.edit")}</Button><Button variant="ghost" title={t("companies.delete")} aria-label={t("companies.deleteCompanyAria", { name: e.name })} onClick={()=>setConfirmId(e.id)} className="h-7 w-7 p-0 shrink-0 text-[var(--text-dim)] hover:text-[var(--danger)]"><Trash2 size={14}/></Button></>)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {data?.length===0 && <div className="p-8 text-center text-sm text-[var(--text-dim)] border-t border-[var(--border)]">{t("companies.noCompanies")}</div>}
        </div>
      </div>
    </div>
  )
}
