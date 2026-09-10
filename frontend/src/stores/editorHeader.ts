import { create } from "zustand"

type HeaderState = {
  archivoId: string | null
  titulo: string
  filas: number
  dirty: boolean
  set: (p: Partial<HeaderState>) => void
  setDirty: (v: boolean) => void
  onSaveTitle?: (v: string) => void
  onExport?: (fmt: "pdf" | "excel") => void
}

export const useEditorHeaderStore = create<HeaderState>((set) => ({
  archivoId: null,
  titulo: "",
  filas: 0,
  dirty: false,
  set: (p) => set(p as any),
  setDirty: (v) => set({ dirty: v }),
}))
