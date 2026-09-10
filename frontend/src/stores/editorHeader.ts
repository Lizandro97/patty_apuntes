import { create } from "zustand"

type HeaderState = {
  archivoId: string | null
  titulo: string
  tipo: string
  filas: number
  periodo: string
  dirty: boolean
  set: (p: Partial<HeaderState>) => void
  setDirty: (v: boolean) => void
  onSaveTitle?: (v: string) => void
  onSaveTipo?: (v: string) => void
  onExport?: (fmt: "pdf" | "excel") => void
}

export const useEditorHeaderStore = create<HeaderState>((set) => ({
  archivoId: null,
  titulo: "",
  tipo: "",
  filas: 0,
  periodo: "",
  dirty: false,
  set: (p) => set(p as any),
  setDirty: (v) => set({ dirty: v }),
}))
