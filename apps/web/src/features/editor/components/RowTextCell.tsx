import { useState } from "react"
import { useTranslation } from "react-i18next"

// Local draft state only. The parent passes key={`${row.id}-${field}-${row[field]}`}
// so a different row — or an externally changed value (undo/redo/save) — remounts
// with the fresh value. No sync effect needed.
export function RowTextCell({ row, field, onSave }: { row: any; field: "assignee" | "note"; onSave: (v: string) => void }) {
  const { t } = useTranslation()
  const [v, setV] = useState(row?.[field] ?? "")
  return <input aria-label={t(field === "assignee" ? "editor.table.responsibleAria" : "editor.table.notesAria")} value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{ if(v!== (row?.[field] ?? "")) onSave(v)}} onKeyDown={e=>{ if(e.key==="Enter") { if (e.nativeEvent.isComposing) return; (e.target as HTMLInputElement).blur() } }} placeholder="—" className="w-full min-w-0 max-w-full min-h-[44px] px-2 py-1 text-base border border-transparent hover:border-[var(--sheet-border)] focus:border-[var(--sheet-accent)] rounded focus:outline-none bg-transparent text-[#1e293b]" />
}
