import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"

// Numeric stepper with theme arrows (no native spinners).
export function NumberStepper({ value, onChange, min, max, ariaLabel, className, dense, id }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
  ariaLabel?: string; className?: string; dense?: boolean; id?: string
}) {
  const { t } = useTranslation()
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
  const btn = "flex-1 flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--accent)] active:text-[var(--accent)] transition rounded focus-visible:outline-[var(--accent)]"
  return (
    <span className={`inline-flex items-stretch rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden ${className ?? ""}`}>
      <Input
        type="number"
        id={id}
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        onChange={e=>onChange(clamp(Number(e.target.value)))}
        className={`themed-number ${dense ? "h-9" : "h-11"} flex-1 min-w-0 bg-transparent border-0 text-[var(--text)] text-base px-2 focus-visible:ring-0 focus-visible:outline-none`}
      />
      <span className="flex flex-col w-6 shrink-0 border-l border-[var(--border)]" role="group" aria-label={ariaLabel}>
        <button type="button" aria-label={t("common.increase")} onClick={()=>onChange(clamp(value + 1))} className={btn}><ChevronUp size={12}/></button>
        <button type="button" aria-label={t("common.decrease")} onClick={()=>onChange(clamp(value - 1))} className={`${btn} border-t border-[var(--border)]`}><ChevronDown size={12}/></button>
      </span>
    </span>
  )
}
