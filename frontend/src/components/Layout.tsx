import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { Home, FileText, Building2, Files, Settings, LogOut, Sun, Leaf, Menu, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useAuthStore } from "@/stores/auth"
import { useUiStore } from "@/stores/ui"
import { THEMES, useThemeStore } from "@/stores/theme"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const items = [
  { to: "/", key: "home", labelKey: "nav.home", icon: Home },
  { to: "/editor", key: "editor", labelKey: "nav.editor", icon: FileText },
  { to: "/companies", key: "companies", labelKey: "nav.companies", icon: Building2 },
  { to: "/records", key: "records", labelKey: "nav.records", icon: Files },
] as const

function shortName(fullName: string | undefined, email: string | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length > 0) return parts.slice(0, 2).join(" ")
  return email ?? "Usuario"
}

function ProfileFooter({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const nav = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", h)
    document.addEventListener("keydown", k)
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k) }
  }, [open ])
  const name = shortName(user?.full_name, user?.email)
  const initial = (name[0] ?? "P").toUpperCase()
  return (
    <div ref={ref} className="relative px-2 pb-2">
      <button
        onClick={() => setOpen(!open)}
        title={name}
        aria-label={t("nav.accountMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-xl border border-transparent hover:bg-[var(--surface)] hover:border-[var(--border)] transition p-2",
          collapsed && "lg:justify-center lg:px-0"
        )}
      >
        <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] grid place-items-center text-[var(--on-accent)] text-xs font-bold">
          {initial}
        </span>
        <span className={cn("flex-1 min-w-0 text-left", collapsed && "lg:hidden")}>
          <span className="block text-[13px] font-medium text-[var(--text)] truncate">{name}</span>
          <span className="block text-[11px] text-[var(--text-dim)] truncate">{user?.email ?? ""}</span>
        </span>
        <ChevronDown size={14} className={cn("text-[var(--text-dim)] shrink-0 transition-transform", open && "rotate-180", collapsed && "lg:hidden")} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-[240px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-1.5",
            "bottom-full left-0 right-0 mb-2",
            collapsed && "lg:left-full lg:right-auto lg:bottom-0 lg:ml-2 lg:mb-0"
          )}
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2.5">
            <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] grid place-items-center text-[var(--on-accent)] text-xs font-bold">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[var(--text)] truncate">{name}</span>
              <span className="block text-[11px] text-[var(--text-dim)] truncate">{user?.email ?? ""}</span>
            </span>
          </div>
          <div className="border-t border-[var(--border)] mt-1 pt-1">
            <button
              role="menuitem"
                onClick={() => { setOpen(false); nav("/settings") }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition"
            >
              <Settings size={15} /> {t("nav.settings")}
            </button>
            <div role="group" aria-label={t("nav.theme")} className="px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)] mb-1.5 px-2" aria-hidden>
                <Sun size={12} /> {t("nav.theme")}
              </div>
              <div className="space-y-1">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    role="menuitemradio"
                    aria-checked={theme === th.id}
                    onClick={() => setTheme(th.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                  >
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: th.dot }} />
                    {t(`nav.themes.${th.id}`)}
                    <span className="ml-auto text-[var(--accent)] text-xs">{theme === th.id ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--border)] mt-1 pt-1">
            <button
              role="menuitem"
              onClick={() => { logout(); nav("/login") }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
            >
              <LogOut size={15} /> {t("nav.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Sidebar() {
  const { t } = useTranslation()
  const loc = useLocation()
  const collapsed = useUiStore((s) => s.collapsed)
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const activeKey = loc.pathname === "/" ? "home" : loc.pathname.startsWith("/editor") ? "editor" : loc.pathname.startsWith("/companies") ? "companies" : loc.pathname.startsWith("/records") ? "records" : "settings"
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 h-dvh flex flex-col bg-[var(--bg)] border-r border-[var(--border)] shrink-0 transition-all duration-200 ease-out motion-reduce:transition-none",
          "w-[240px]",
          collapsed && "lg:w-[68px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("flex items-center gap-2.5 px-4 h-[60px] shrink-0", collapsed && "lg:justify-center lg:px-0")}>
          <button
            onClick={() => { if (collapsed && window.matchMedia("(min-width: 1024px)").matches) toggleCollapsed() }}
            title={collapsed ? t("nav.expandMenu") : undefined}
            aria-label={collapsed ? t("nav.expandMenu") : t("nav.brand")}
            className={cn("group/logo flex items-center gap-2.5 rounded-xl transition", collapsed && "lg:cursor-pointer")}
          >
            <span className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] flex items-center justify-center text-[var(--on-accent)] relative overflow-hidden">
              <Leaf size={16} strokeWidth={2} className={cn("absolute inset-0 m-auto transition-opacity duration-150", collapsed && "lg:group-hover/logo:opacity-0")} />
              {collapsed && <PanelLeftOpen size={16} className="absolute inset-0 m-auto opacity-0 lg:group-hover/logo:opacity-100 transition-opacity duration-150" />}
            </span>
            <span className={cn("font-semibold text-[var(--text)] text-[15px] tracking-tight truncate", collapsed && "lg:hidden")}>{t("nav.brand")}</span>
          </button>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              title={t("nav.collapseMenu")}
              aria-label={t("nav.collapseMenu")}
              className="ml-auto w-10 h-10 hidden lg:flex items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
        <nav aria-label={t("nav.brand")} className={cn("flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto", collapsed && "lg:px-2 lg:items-center")}>
          {items.map((it) => {
            const Icon = it.icon
            return (
              <NavLink
                key={it.key}
                to={it.to}
                end={it.to === "/"}
                title={t(it.labelKey)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-[13px] leading-none transition-colors border",
                  collapsed ? "lg:w-[44px] lg:min-h-[44px] lg:justify-center lg:gap-0 px-3 py-2.5 min-h-[44px]" : "px-3 py-2.5 min-h-[44px]",
                  activeKey === it.key ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-medium" : "text-[var(--text-dim)] border-transparent hover:text-[var(--text)] hover:bg-[var(--surface)]"
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden className={cn("w-[18px] h-[18px] shrink-0", (isActive || activeKey === it.key) && "stroke-[var(--accent)]")} strokeWidth={isActive || activeKey === it.key ? 2 : 1.7} />
                    <span className={cn("truncate", collapsed && "lg:hidden")}>{t(it.labelKey)}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className={cn("border-t border-[var(--border)] mt-2 pt-2", collapsed && "lg:flex lg:justify-center")}>
          <ProfileFooter collapsed={collapsed} />
        </div>
      </aside>
    </>
  )
}

function MobileBar() {
  const { t } = useTranslation()
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  return (
    <header className="lg:hidden h-[52px] flex items-center gap-2 px-3 bg-[var(--bg)] border-b border-[var(--border)] shrink-0 no-print">
      <button
        onClick={() => setMobileOpen(true)}
        title={t("nav.openMenu")}
        aria-label={t("nav.openMenu")}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition"
      >
        <Menu size={18} />
      </button>
      <span className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] flex items-center justify-center text-[var(--on-accent)]"><Leaf size={13} strokeWidth={2}/></span>
        <span className="font-semibold text-[var(--text)] text-[14px] tracking-tight">{t("nav.brand")}</span>
      </span>
    </header>
  )
}

export function Layout() {
  const loc = useLocation()
  const isEditor = loc.pathname.startsWith("/editor")
  return (
    <div className="h-dvh flex bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!isEditor && <MobileBar />}
        <div className="flex-1 flex min-w-0 min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
