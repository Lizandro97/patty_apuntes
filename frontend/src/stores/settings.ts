import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AppSettings = {
  primary_color: string
  font_family: string
  font_size_px: number
  table_density: "compact" | "normal" | "comfortable"
  table_header_bg: string
  grid_columns: number
  date_format: string
  show_summary: boolean
  rounded_borders: boolean
  pastel_mode: boolean
  autosave: boolean
  layout_mode: "sidebar" | "fullscreen"
  visible_fields: {
    names: boolean
    assignee: boolean
    date: boolean
    notes: boolean
  }
}

const LEGACY_AUTO = new Set(["#6366f1", "#EC4899", "#ec4899"])

const defaults: AppSettings = {
  primary_color: "",
  font_family: "Inter",
  font_size_px: 14,
  table_density: "normal",
  table_header_bg: "",
  grid_columns: 3,
  date_format: "dd/mm/aaaa",
  show_summary: true,
  rounded_borders: true,
  pastel_mode: true,
  autosave: true,
  layout_mode: "sidebar",
  visible_fields: { names: true, assignee: true, date: true, notes: true },
}

type Store = AppSettings & {
  set: (p: Partial<AppSettings>) => void
  setField: (k: keyof AppSettings, v: any) => void
  reset: () => void
  applyCss: () => void
}

export const useSettingsStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaults,
      set: (p) => { set(p as any); get().applyCss() },
      setField: (k, v) => { (set as any)({ [k]: v }); get().applyCss() },
      reset: () => { set(defaults); get().applyCss() },
      applyCss: () => {
        const s = get()
        const r = document.documentElement
        r.style.setProperty("--primary", s.primary_color || "var(--accent)")
        const auto = !s.primary_color || LEGACY_AUTO.has(s.primary_color)
        r.style.setProperty("--sheet-accent", auto ? "var(--accent)" : s.primary_color)
        r.style.setProperty("--font-family", s.font_family === "Geist" ? "'Geist','Inter',system-ui,sans-serif" : s.font_family === "system-ui" ? "system-ui,-apple-system,sans-serif" : `'${s.font_family}',system-ui,-apple-system,sans-serif`)
        r.style.setProperty("--font-size", s.font_size_px + "px")
        r.style.setProperty("--table-header-bg", s.table_header_bg)
        r.style.setProperty("--grid-cols", String(s.grid_columns))
        r.style.setProperty("--radius", s.rounded_borders ? "12px" : "4px")
        if (s.pastel_mode) r.classList.add("pastel")
        else r.classList.remove("pastel")
      },
    }),
    { name: "patty-config", version: 3, migrate: (persisted: any) => {
        if (persisted && persisted.autosave === undefined) persisted.autosave = true
        const vf = persisted?.visible_fields
        if (vf && typeof vf === "object") {
          persisted.visible_fields = {
            names: vf.names ?? true,
            assignee: vf.assignee ?? vf.responsable ?? true,
            date: vf.date ?? vf.fecha ?? true,
            notes: vf.notes ?? vf.observaciones ?? true,
          }
        }
        return persisted
      }, onRehydrateStorage: () => (state) => state?.applyCss() }
  )
)
