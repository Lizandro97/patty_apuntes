import { create } from "zustand"

export type ThemeName = "papel" | "tinta" | "menta"

export const THEMES: { id: ThemeName; label: string; dot: string }[] = [
  { id: "papel", label: "Papel timbrado", dot: "#2B3FE0" },
  { id: "tinta", label: "Tinta nocturna", dot: "#C9A227" },
  { id: "menta", label: "Menta clínica", dot: "#0E7C5B" },
]

type ThemeState = {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}

function initialTheme(): ThemeName {
  try {
    const v = localStorage.getItem("pa-theme")
    if (v === "papel" || v === "tinta" || v === "menta") return v
  } catch {
    /* noop */
  }
  return "papel"
}

function applyTheme(t: ThemeName) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem("pa-theme", t)
  } catch {
    /* noop */
  }
}

applyTheme(initialTheme())

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme(),
  setTheme: (t) => {
    applyTheme(t)
    set({ theme: t })
  },
}))
