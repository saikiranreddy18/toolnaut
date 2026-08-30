import { useEffect, useRef } from 'react'
import { loadCursor, CURSOR_EVENT } from '../../state/cursorStore'

// Cursor-effect harness. The effect itself is one of ten pluggable modules
// (utils/cursorEffects.js, chosen in ME → Sky settings); this component owns
// everything they share — the canvas, DPR, pointer plumbing, the palette, and
// the size scaling — so every effect runs under identical conditions and
// switching one for another is a store write, not a remount.
//
// Desktop pointers only; disabled under reduced-motion; the canvas is
// pointer-events:none so it can never sit between the person and a control.
// The ~53KB effects module is dynamic-imported so it stays out of the entry
// chunk and never loads at all for touch/reduced-motion visitors.
//
// SIZE, WITHOUT TOUCHING THE EFFECTS
// The size setting scales the whole effect — particles, radii, trail widths —
// by running the effect in a VIRTUAL coordinate space W/s × H/s and scaling
// the canvas transform by s. The effect sees the cursor at x/s, draws around
// it in its own units, and the transform maps that back so everything lands
// exactly under the real pointer, s times bigger. No effect module knows the
// setting exists.
export default function CursorStars() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!finePointer || reduce) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, dpr = 1
    let scale = loadCursor().size
    let effectId = loadCursor().effect
    let inst = null
    let effectsModule = null
    let disposed = false

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Palette read from the live CSS variables, so the effect retints when the
    // play mode changes — same rule the avatars follow. Re-read on data-theme
    // mutations and the running effect is rebuilt with the new colours.
    function readPalette() {
      const css = getComputedStyle(document.documentElement)
      const v = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback
      return {
        lime: v('--lime', '#a3ff2e'),
        pink: v('--hot-pink', '#ff2ea3'),
        cyan: v('--cyan', '#22d3ee'),
        gold: v('--arcade-yellow', '#ffde2e'),
      }
    }

    const env = {
      ctx,
      W: () => w / scale,
      H: () => h / scale,
      clear: () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
      },
      // rgba of the page ground (#060609) — effects use this for trail fades
      fade: (a) => {
        ctx.fillStyle = 'rgba(6,6,9,' + a + ')'
        ctx.fillRect(0, 0, w / scale, h / scale)
      },
      palette: readPalette(),
    }

    async function build() {
      env.clear()
      inst = null
      if (effectId === 'off') return
      if (!effectsModule) {
        try {
          effectsModule = await import('../../utils/cursorEffects')
        } catch { return } // chunk failed to load — no effect beats a crash
        if (disposed) return
      }
      const def = effectsModule.CURSOR_EFFECTS.find((e) => e.id === effectId)
        || effectsModule.CURSOR_EFFECTS[0]
      env.palette = readPalette()
      try { inst = def.make(env) } catch { inst = null }
    }
    build()

    function onMove(e) {
      try { inst && inst.move(e.clientX / scale, e.clientY / scale, e.movementX / scale, e.movementY / scale) } catch { /* effect fault */ }
    }
    function onDown(e) {
      try { inst && inst.down && inst.down(e.clientX / scale, e.clientY / scale) } catch { /* effect fault */ }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)

    // Live re-configuration from Settings — no remount, the next frame simply
    // runs the new effect at the new size.
    function onChange(e) {
      const next = e.detail || loadCursor()
      const sizeChanged = next.size !== scale
      scale = next.size
      effectId = next.effect
      if (sizeChanged) resize()
      build()
    }
    window.addEventListener(CURSOR_EVENT, onChange)

    // Rebuild on play-mode change so the palette follows the theme.
    const themeWatch = new MutationObserver(() => build())
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    let raf
    let last = performance.now()
    function frame(now) {
      const dt = Math.min(now - last, 50)
      last = now
      try { inst && inst.frame(dt) } catch { inst = null } // a faulting effect turns itself off
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      themeWatch.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener(CURSOR_EVENT, onChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 70 }}
    />
  )
}
