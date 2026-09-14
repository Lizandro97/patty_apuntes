import { create } from "zustand"

type HeaderState = {
  recordId: string | null
  title: string
  rowCount: number
  dirty: boolean
  set: (p: Partial<HeaderState>) => void
  setDirty: (v: boolean) => void
  onSaveTitle?: (v: string) => void
  onExport?: (fmt: "pdf" | "excel") => void
}

export const useEditorHeaderStore = create<HeaderState>((set) => ({
  recordId: null,
  title: "",
  rowCount: 0,
  dirty: false,
  set: (p) => set(p as any),
  setDirty: (v) => set({ dirty: v }),
}))
