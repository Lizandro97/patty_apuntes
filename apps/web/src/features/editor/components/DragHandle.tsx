import { useRef, useState } from "react"

// Draggable Excel-style handle on the grid lines.
// axis x = borde derecho (ancho de columna), axis y = borde inferior (alto de row).
// Reports hover and drag to paint the full-length guide (one same column/row).
export function DragHandle({ axis, title, zoom, startV, min, onV, onReset, onHover, onDrag }: {
  axis: "x" | "y"; title: string; zoom: number; startV: number; min: number;
  onV: (v: number) => void; onReset: () => void;
  onHover?: (active: boolean) => void; onDrag?: (active: boolean) => void
}) {
  const st = useRef<{ p: number; v: number; dragging: boolean } | null>(null)
  const [on, setOn] = useState(false)
  // Táctil: doble-tap sobre el handle = reset (el dblclick de PC no existe).
  const lastTap = useRef(0)
  const end = (notify = true, countTap = false) => {
    const was = st.current !== null
    const dragged = st.current?.dragging ?? false
    st.current = null
    setOn(false)
    if (was && !dragged && countTap) {
      const now = Date.now()
      if (now - lastTap.current < 300) { lastTap.current = 0; onReset() }
      else lastTap.current = now
    } else if (was && dragged && notify) onDrag?.(false)
  }
  const pos = axis === "x"
    ? "top-0 bottom-0 -right-[12px] w-[25px] cursor-col-resize max-lg:-right-[16px] max-lg:w-[33px]"
    : "left-0 right-0 -bottom-[12px] h-[25px] cursor-row-resize max-lg:-bottom-[16px] max-lg:h-[33px]"
  const line = axis === "x"
    ? "absolute inset-y-0 left-1/2 -ml-px w-[2px]"
    : "absolute inset-x-0 top-1/2 -mt-px h-[2px]"
  return (
    <span
      title={title}
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(startV)}
      aria-valuemin={min}
      aria-label={title}
      tabIndex={0}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); onV(Math.max(min, startV - 4)) }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); onV(startV + 4) }
        else if (e.key === "Home") { e.preventDefault(); onReset() }
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onDoubleClick={(e) => { e.stopPropagation(); onReset() }}
      onPointerDown={(e) => {
        // Solo registrar: el preventDefault/captura van al superar el umbral
        // (ver onPointerMove). Así un tap sobre el handle llega como click.
        const parent = (e.currentTarget as HTMLElement).parentElement
        const rect = parent?.getBoundingClientRect()
        const measured = rect ? (axis === "x" ? rect.width : rect.height) / (zoom || 1) : 0
        st.current = { p: axis === "x" ? e.clientX : e.clientY, v: measured > 0 ? measured : startV, dragging: false }
        e.stopPropagation()
      }}
      onPointerMove={(e) => {
        const s = st.current
        if (!s) return
        const d = ((axis === "x" ? e.clientX : e.clientY) - s.p) / (zoom || 1)
        if (!s.dragging) {
          if (Math.abs(d) < 6) return // umbral táctil: aún puede ser un tap
          s.dragging = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId)
          setOn(true)
          onDrag?.(true)
          e.preventDefault()
        }
        onV(Math.max(min, Math.round(s.v + d)))
      }}
      onPointerUp={(e) => { end(true, true); try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } }}
      onPointerCancel={() => end()}
      className={`absolute ${pos} z-10 touch-none group/handle focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded`}
    >
      <span className={`${line} ${on ? "bg-[var(--accent)]" : "bg-transparent group-hover/handle:bg-[var(--accent)] [@media(hover:none)]:bg-[var(--accent)]/30"} transition-colors`} />
    </span>
  )
}
