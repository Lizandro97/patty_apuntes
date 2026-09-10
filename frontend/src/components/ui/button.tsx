import * as React from "react"
import { cn } from "@/lib/utils"

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline" | "secondary" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 h-9 px-4 py-2"
    const variants: Record<string, string> = {
      default: "bg-[var(--primary)] text-white hover:opacity-90",
      ghost: "hover:bg-slate-100",
      outline: "border border-slate-200 bg-white hover:bg-slate-50",
      secondary: "bg-slate-100 hover:bg-slate-200",
    }
    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
  }
)
Button.displayName = "Button"
