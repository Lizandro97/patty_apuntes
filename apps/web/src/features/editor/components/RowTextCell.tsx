import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

export function RowTextCell({ row, field, onSave }: { row: any; field: "assignee" | "note"; onSave: (v: string) => void }) {
  const { t } = useTranslation()
  const [v, setV] = useState(row?.[field] ?? "")
  useEffect(()=> setV(row?.[field] ?? ""), [row?.id, row?.[field]])
  return <input aria-label={t(field === "assignee" ? "editor.table.responsibleAria" : "editor.table.notesAria")} value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!== (row?.[field] ?? "")) onSave(v)}} onKeyDown={e=>{ if(e.key==="Enter") (e.target as HTMLInputElement).blur() }} placeholder="—" className="w-full min-w-0 max-w-full min-h-[44px] px-2 py-1 text-base border border-transparent hover:border-[var(--sheet-border)] focus:border-[var(--sheet-accent)] rounded focus:outline-none bg-transparent text-[#1e293b]" />
}
