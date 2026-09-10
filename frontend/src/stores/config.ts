import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AppConfig = {
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
  layout_mode: "sidebar" | "fullscreen"
  visible_fields: {
    nombres: boolean
    responsable: boolean
    fecha: boolean
    observaciones: boolean
  }
}

const defaults: AppConfig = {
  primary_color: "#6366f1",
  font_family: "Inter",
  font_size_px: 14,
  table_density: "normal",
  table_header_bg: "#e0e7ff",
  grid_columns: 3,
  date_format: "dd/mm/aaaa",
  show_summary: true,
  rounded_borders: true,
  pastel_mode: true,
  layout_mode: "sidebar",
  visible_fields: { nombres: true, responsable: true, fecha: true, observaciones: true },
}

type Store = AppConfig & {
  set: (p: Partial<AppConfig>) => void
  setField: (k: keyof AppConfig, v: any) => void
  reset: () => void
  applyCss: () => void
}

export const useConfigStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaults,
      set: (p) => { set(p as any); get().applyCss() },
      setField: (k, v) => { (set as any)({ [k]: v }); get().applyCss() },
      reset: () => { set(defaults); get().applyCss() },
      applyCss: () => {
        const s = get()
        const r = document.documentElement
        r.style.setProperty("--primary", s.primary_color)
        r.style.setProperty("--font-family", s.font_family)
        r.style.setProperty("--font-size", s.font_size_px + "px")
        r.style.setProperty("--table-header-bg", s.table_header_bg)
        r.style.setProperty("--grid-cols", String(s.grid_columns))
        r.style.setProperty("--radius", s.rounded_borders ? "12px" : "4px")
        if (s.pastel_mode) r.classList.add("pastel")
        else r.classList.remove("pastel")
      },
    }),
    { name: "patty-config", onRehydrateStorage: () => (state) => state?.applyCss() }
  )
)
