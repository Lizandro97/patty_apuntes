import { create } from "zustand"

type UiState = {
  collapsed: boolean
  mobileOpen: boolean
  rightOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (v: boolean) => void
  setRightOpen: (v: boolean) => void
}

function initialCollapsed() {
  try {
    return localStorage.getItem("sb-collapsed") === "1"
  } catch {
    return false
  }
}

export const useUiStore = create<UiState>((set) => ({
  collapsed: initialCollapsed(),
  mobileOpen: false,
  rightOpen: true,
  toggleCollapsed: () =>
    set((s) => {
      const v = !s.collapsed
      try {
        localStorage.setItem("sb-collapsed", v ? "1" : "0")
      } catch {
        /* noop */
      }
      return { collapsed: v }
    }),
  setMobileOpen: (v) => set({ mobileOpen: v }),
  setRightOpen: (v) => set({ rightOpen: v }),
}))
