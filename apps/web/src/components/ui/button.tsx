import * as React from "react"
import { cn } from "@/lib/utils"

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline" | "secondary" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 h-9 px-4 py-2"
    const variants: Record<string, string> = {
      default: "bg-[var(--accent)] text-[var(--on-accent)] hover:brightness-110",
      ghost: "text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
      outline: "border border-[var(--border)] bg-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
      secondary: "bg-[var(--surface-2)] text-[var(--text)] hover:brightness-95",
    }
    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
  }
)
Button.displayName = "Button"
