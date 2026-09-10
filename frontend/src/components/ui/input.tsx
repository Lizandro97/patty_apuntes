import * as React from "react"
import { cn } from "@/lib/utils"
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0", className)} {...props} />
  )
)
Input.displayName = "Input"
