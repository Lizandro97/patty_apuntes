import * as React from "react"
import { cn } from "@/lib/utils"
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("flex h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0", className)} {...props} />
  )
)
Input.displayName = "Input"
