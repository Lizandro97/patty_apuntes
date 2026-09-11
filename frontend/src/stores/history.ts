import { create } from "zustand"

export type HistorySnapshot = {
  label: string
  filas: any[] | undefined
  celdas: any[] | undefined
  archivo: any | undefined
}

type HistoryState = {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  push: (s: HistorySnapshot) => void
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  undoLabel: () => string | null
  redoLabel: () => string | null
  // Pops past, pushes current onto future. Returns snapshot to restore.
  popUndo: (current: HistorySnapshot) => HistorySnapshot | null
  // Pops future, pushes current onto past. Returns snapshot to restore.
  popRedo: (current: HistorySnapshot) => HistorySnapshot | null
}

const LIMIT = 50

function clone<T>(v: T): T {
  try {
    return structuredClone(v)
  } catch {
    return JSON.parse(JSON.stringify(v ?? null))
  }
}

export function cloneSnapshot(s: HistorySnapshot): HistorySnapshot {
  return { label: s.label, filas: clone(s.filas), celdas: clone(s.celdas), archivo: clone(s.archivo) }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (s) =>
    set((st) => ({
      past: [...st.past, cloneSnapshot(s)].slice(-LIMIT),
      future: [],
    })),
  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  undoLabel: () => {
    const p = get().past
    return p.length ? p[p.length - 1].label : null
  },
  redoLabel: () => {
    const f = get().future
    return f.length ? f[f.length - 1].label : null
  },
  popUndo: (current) => {
    const { past, future } = get()
    if (!past.length) return null
    const prev = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [...future, cloneSnapshot(current)],
    })
    return cloneSnapshot(prev)
  },
  popRedo: (current) => {
    const { past, future } = get()
    if (!future.length) return null
    const next = future[future.length - 1]
    set({
      future: future.slice(0, -1),
      past: [...past, cloneSnapshot(current)].slice(-LIMIT),
    })
    return cloneSnapshot(next)
  },
}))
