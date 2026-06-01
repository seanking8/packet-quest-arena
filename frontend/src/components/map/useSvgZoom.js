import { useCallback, useMemo, useRef, useState } from 'react'

/**
 * Mouse-wheel zoom + drag-to-pan for an SVG map. Returns a viewBox string
 * derived from the base bounds plus the current zoom/pan, and the handlers to
 * spread onto the <svg>. Zooms toward the cursor so the point under the mouse
 * stays put.
 */
export default function useSvgZoom(bounds, { min = 1, max = 6 } = {}) {
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState(null) // {x, y} in svg user units; null = base centre
  const drag = useRef(null)

  const base = useMemo(() => ({
    cx: bounds.minX + bounds.width / 2,
    cy: bounds.minY + bounds.height / 2,
  }), [bounds.minX, bounds.minY, bounds.width, bounds.height])

  const c = center || base
  const viewW = bounds.width / zoom
  const viewH = bounds.height / zoom
  // Clamp the centre so we can't pan far outside the map.
  const cx = Math.min(bounds.minX + bounds.width, Math.max(bounds.minX, c.cx))
  const cy = Math.min(bounds.minY + bounds.height, Math.max(bounds.minY, c.cy))
  const viewBox = `${cx - viewW / 2} ${cy - viewH / 2} ${viewW} ${viewH}`

  const svgPointFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    return { x: cx - viewW / 2 + px * viewW, y: cy - viewH / 2 + py * viewH }
  }

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const pt = svgPointFromEvent(e)
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const next = Math.min(max, Math.max(min, zoom * factor))
    if (next === zoom) return
    // Keep the point under the cursor stationary as we zoom.
    const k = 1 - next / zoom // unused direct, but compute new centre below
    void k
    const newViewW = bounds.width / next
    const newViewH = bounds.height / next
    const px = (pt.x - (cx - viewW / 2)) / viewW
    const py = (pt.y - (cy - viewH / 2)) / viewH
    setCenter({
      cx: pt.x - (px - 0.5) * newViewW,
      cy: pt.y - (py - 0.5) * newViewH,
    })
    setZoom(next)
  }, [zoom, min, max, bounds.width, bounds.height, cx, cy, viewW, viewH])

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    drag.current = { ...svgPointFromEvent(e), cx, cy }
  }, [cx, cy, viewW, viewH])

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return
    const pt = svgPointFromEvent(e)
    setCenter({
      cx: drag.current.cx - (pt.x - drag.current.x),
      cy: drag.current.cy - (pt.y - drag.current.y),
    })
  }, [viewW, viewH])

  const endDrag = useCallback(() => { drag.current = null }, [])

  const reset = useCallback(() => { setZoom(1); setCenter(null) }, [])

  return {
    viewBox,
    zoomed: zoom !== 1,
    reset,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
    },
  }
}