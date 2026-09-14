import { useLayoutEffect, useState } from "react"

// Floating overlay: portal to body + fixed position so dropdowns float above
// the scrollable sheet instead of being clipped by it. Anchored to the trigger,
// flips up when there is no room below, clamps to the viewport, follows scroll.
export function useFloatPos(anchor: React.RefObject<HTMLElement | null>, open: boolean, w: number, menuRef?: React.RefObject<HTMLElement | null>, estH = 320, align: "left" | "right" = "left") {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const place = () => {
      const el = anchor.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vw = window.innerWidth, vh = window.innerHeight
      // Real menu height when mounted; falls back to the estimate on first paint
      const h = menuRef?.current?.offsetHeight || estH
      const wantLeft = align === "right" ? r.right - w : r.left
      const left = Math.max(8, Math.min(wantLeft, vw - w - 8))
      const below = r.bottom + 8
      const top = below + h + 8 <= vh ? below : Math.max(8, r.top - h - 8)
      setPos({ top, left })
    }
    place()
    // Re-place once mounted so the measured (not estimated) height applies
    const raf = requestAnimationFrame(place)
    window.addEventListener("scroll", place, true)
    window.addEventListener("resize", place)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place) }
  }, [open, anchor, w, menuRef, estH, align])
  return pos
}
