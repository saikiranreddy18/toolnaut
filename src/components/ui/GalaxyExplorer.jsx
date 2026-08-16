import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { galaxyState } from '../../state/galaxyStore'

const ZOOM_MIN = 2.4
const ZOOM_MAX = 16

// Elevation auto-tilts as you zoom: far out reads as an overhead survey,
// close in opens toward an edge-on, grazing view along the spiral arms —
// the dramatic "diving into the disk" angle from the reference recording.
// The response is front-loaded (pow < 1 on closeness): the view is already
// most of the way to edge-on after a modest zoom-in, not only at max zoom.
// TILT_NEAR is a floor, not zero — the particle disk has near-zero real
// thickness, so a true 0° elevation looks straight down its edge and reads
// as an almost-black void (verified empirically); ~4.6° keeps the arms and
// the core glow legible while still reading as dramatically edge-on.
const TILT_FAR = 0.5 // ~28.6°, overview elevation at ZOOM_MAX
const TILT_NEAR = 0.08 // ~4.6°, near edge-on at ZOOM_MIN — not lower, see above
const TILT_EASE = 0.3

function tiltForZoom(zoom) {
  const t = (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN) // 0 near, 1 far
  const closeness = 1 - Math.max(0, Math.min(1, t))
  const eased = Math.pow(closeness, TILT_EASE)
  return TILT_FAR - eased * (TILT_FAR - TILT_NEAR)
}

// Full-screen input layer for explore mode: drag orbits, wheel/pinch zooms.
export default function GalaxyExplorer({ onClose }) {
  const surface = useRef(null)
  const badge = useRef(null)

  useEffect(() => {
    const el = surface.current
    const pointers = new Map()
    let lastPinch = 0
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    function paintBadge() {
      const b = badge.current
      if (!b) return
      b.textContent = `${Math.round(galaxyState.zoom)}X`
      b.style.left = `${mouse.x + 22}px`
      b.style.top = `${mouse.y - 26}px`
    }

    // Open at the tilt the current zoom implies, so the very first frame
    // already matches the auto-tilt curve instead of a stale default angle.
    galaxyState.rotX = tiltForZoom(galaxyState.zoom)
    paintBadge()

    function onWheel(e) {
      e.preventDefault()
      const next = galaxyState.zoom * (1 + e.deltaY * 0.0012)
      galaxyState.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next))
      galaxyState.rotX = tiltForZoom(galaxyState.zoom)
      paintBadge()
    }
    function onDown(e) {
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    function onMove(e) {
      mouse = { x: e.clientX, y: e.clientY }
      paintBadge()
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const curr = { x: e.clientX, y: e.clientY }
      pointers.set(e.pointerId, curr)
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (lastPinch) {
          const next = galaxyState.zoom * (lastPinch / dist)
          galaxyState.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next))
          galaxyState.rotX = tiltForZoom(galaxyState.zoom)
        }
        lastPinch = dist
      } else {
        galaxyState.rotY -= (curr.x - prev.x) * 0.005
        // vertical drag nudges elevation directly off the zoom-driven baseline,
        // so a look-around still feels responsive without fighting the auto-tilt
        galaxyState.rotX += (curr.y - prev.y) * 0.003
        galaxyState.rotX = Math.max(0.05, Math.min(1.25, galaxyState.rotX))
      }
    }
    function onUp(e) {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) lastPinch = 0
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function zoomBy(f) {
    galaxyState.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, galaxyState.zoom * f))
    galaxyState.rotX = tiltForZoom(galaxyState.zoom)
    if (badge.current) badge.current.textContent = `${Math.round(galaxyState.zoom)}X`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75]"
    >
      <div ref={surface} className="absolute inset-0 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }} />

      {/* live zoom-level readout, follows the cursor */}
      <span
        ref={badge}
        aria-hidden="true"
        className="nb-btn dark pointer-events-none fixed z-[76] px-3 py-1 text-xs"
      />

      <button
        onClick={onClose}
        aria-label="Exit galaxy exploration"
        className="nb-btn dark absolute right-6 top-6 flex h-11 w-11 items-center justify-center !rounded-full !p-0 text-lg"
      >
        ✕
      </button>

      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button onClick={() => zoomBy(0.8)} aria-label="Zoom in" className="nb-btn dark h-11 w-11 !rounded-full !p-0 text-xl">+</button>
        <button onClick={() => zoomBy(1.25)} aria-label="Zoom out" className="nb-btn dark h-11 w-11 !rounded-full !p-0 text-xl">−</button>
      </div>

      <p className="tape-label pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px]" style={{ transform: 'translateX(-50%) rotate(-1.5deg)' }}>
        Drag to orbit · Scroll to zoom · Zoom in to meet the tools
      </p>
    </motion.div>
  )
}
