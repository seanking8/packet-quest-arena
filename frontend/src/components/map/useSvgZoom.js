import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Mouse-wheel zoom + drag-to-pan for an SVG map. Returns a viewBox string and a
 * ref to attach to the <svg>. The wheel listener is attached natively with
 * { passive: false } (React's onWheel is passive, so preventDefault there is
 * ignored and page-scroll fights the zoom). Drag pans by raw pixel deltas.
 */
export default function useSvgZoom(bounds, { min = 1, max = 6 } = {}) {
  const svgRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState(null) // {cx, cy} in svg units; null = base centre
  const drag = useRef(null)

  const base = useMemo(() => ({
    cx: bounds.minX + bounds.width / 2,
    cy: bounds.minY + bounds.height / 2,
  }), [bounds.minX, bounds.minY, bounds.width, bounds.height])

  const viewW = bounds.width / zoom
  const viewH = bounds.height / zoom

  // Clamp the centre so the view stays within the map (collapses to base
  // Allow free panning in any direction (like the 3D OrbitControls) so the
  // player can drag the network out from under the route panel. We only stop
  // it from straying more than a full view-width past the map edges, so the
  // network can't be lost entirely.
  const clamp = useCallback((cx, cy, vw, vh) => {
    const minCx = bounds.minX - vw / 2
    const maxCx = bounds.minX + bounds.width + vw / 2
    const minCy = bounds.minY - vh / 2
    const maxCy = bounds.minY + bounds.height + vh / 2
    return {
      cx: Math.min(maxCx, Math.max(minCx, cx)),
      cy: Math.min(maxCy, Math.max(minCy, cy)),
    }
  }, [bounds.minX, bounds.minY, bounds.width, bounds.height])

  const c = clamp((center || base).cx, (center || base).cy, viewW, viewH)
  const viewBox = `${c.cx - viewW / 2} ${c.cy - viewH / 2} ${viewW} ${viewH}`

  // Keep live values in a ref so the native wheel listener (attached once) reads
  // the current zoom/centre without re-binding every render.
  const live = useRef({})
  live.current = { zoom, cx: c.cx, cy: c.cy, viewW, viewH, clamp, min, max, bw: bounds.width, bh: bounds.height }

  useEffect(() => {
    const el = svgRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      const s = live.current
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const wx = s.cx - s.viewW / 2 + px * s.viewW
      const wy = s.cy - s.viewH / 2 + py * s.viewH
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2
      const next = Math.min(s.max, Math.max(s.min, s.zoom * factor))
      if (next === s.zoom) return
      const nVW = s.bw / next
      const nVH = s.bh / next
      const nc = s.clamp(wx - (px - 0.5) * nVW, wy - (py - 0.5) * nVH, nVW, nVH)
      setZoom(next)
      setCenter(nc)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    // Record the press but DON'T capture the pointer yet — capturing here would
    // steal the click from a node/link. We only start panning (and capture)
    // once the pointer actually moves past a small threshold (a real drag).
    drag.current = {
      el: e.currentTarget,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      startCx: c.cx,
      startCy: c.cy,
      unitPerPxX: viewW / rect.width,
      unitPerPxY: viewH / rect.height,
      panning: false,
    }
  }, [c.cx, c.cy, viewW, viewH])

  const onPointerMove = useCallback((e) => {
    const d = drag.current
    if (!d) return
    const movedPx = Math.abs(e.clientX - d.clientX) + Math.abs(e.clientY - d.clientY)
    if (!d.panning) {
      if (movedPx <= 4) return // still might be a click; don't pan yet
      d.panning = true
      d.el.setPointerCapture?.(d.pointerId) // now it's a drag — capture it
    }
    const dx = (e.clientX - d.clientX) * d.unitPerPxX
    const dy = (e.clientY - d.clientY) * d.unitPerPxY
    setCenter(clamp(d.startCx - dx, d.startCy - dy, viewW, viewH))
  }, [viewW, viewH, clamp])

  const endDrag = useCallback(() => {
    const d = drag.current
    if (d?.panning) d.el?.releasePointerCapture?.(d.pointerId)
    drag.current = null
  }, [])

  const reset = useCallback(() => { setZoom(1); setCenter(null) }, [])

  return {
    svgRef,
    viewBox,
    zoomed: zoom !== 1,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
    },
  }
}
