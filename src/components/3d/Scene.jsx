import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import ParticleField from './ParticleField'
import Galaxy from './Galaxy'
import CameraController from './CameraController'
import { startScrollTracking, scrollProgress } from '../../utils/scrollProgress'
import { weakRenderer } from '../../utils/webgl'

// Quality tiers (mobile-first launch):
//   full   — desktop: 70k-point galaxy, 2400 stars, pointer parallax, dpr 2
//   mobile — phones: 24k-point galaxy, 1200 stars, LIVE rotation + camera
//            flight (the "entering space" feel), dpr 1.5
//   calm   — prefers-reduced-motion: static composition, dpr 1.25
//
// The tier is chosen by viewport width alone, which says nothing about the GPU
// behind it. A wide window on weak or software-rendered hardware still asked
// for 70k points at dpr 2 and could not deliver it. PerformanceMonitor below
// measures what the device ACTUALLY achieves and walks the resolution down
// until it keeps up — width picks the starting point, the device picks the end.
const DPR = { full: 2, mobile: 1.5, calm: 1.25 }
const DPR_FLOOR = 1

// Point budgets per tier. These are the numbers that actually cost: measured
// on this build, hiding the canvas and forcing dpr to 1 BOTH left frame time
// unchanged at 133ms, while a page with no WebGL at all held a clean 16.7ms.
// The work is per-vertex, so the adaptive path scales the budget, not the
// resolution — dropping dpr alone was pulling a lever wired to nothing.
const BUDGET = {
  full: { points: 70000, stars: 2400 },
  mobile: { points: 24000, stars: 1200 },
  calm: { points: 24000, stars: 700 },
}
const QUALITY_FLOOR = 0.18

export default function Scene({ mode = 'full' }) {
  const wrapRef = useRef(null)
  const calm = mode === 'calm'
  const mobile = mode === 'mobile'
  const [dpr, setDpr] = useState(DPR[mode])
  // 1 = the tier's full budget. Halved each time the device misses the frame
  // budget, down to the floor.
  // Start low on hardware we can already tell will struggle, rather than
  // letting the monitor discover it over the first few seconds — those seconds
  // are the first impression, and stuttering through them is the complaint.
  const [quality, setQuality] = useState(() => (weakRenderer() ? 0.25 : 1))

  const budget = BUDGET[mode] || BUDGET.full
  const points = Math.round(budget.points * quality)
  const stars = Math.round(budget.stars * quality)

  function degrade() {
    setQuality((q) => Math.max(QUALITY_FLOOR, +(q * 0.5).toFixed(3)))
    setDpr((d) => Math.max(DPR_FLOOR, +(d - 0.25).toFixed(2)))
  }

  // Dim the universe while reading content sections; full brightness at the
  // hero and the final CTA where the galaxy is the star.
  //
  // Reads the cached scroll progress and writes at most once per frame. It
  // used to measure the document and write opacity inside the scroll handler
  // itself, which meant a layout read plus a style write on every one of the
  // many events a single wheel gesture emits.
  useEffect(() => {
    const stop = startScrollTracking()
    let raf = 0
    let pending = false

    function apply() {
      raf = 0
      pending = false
      const el = wrapRef.current
      if (!el) return
      const p = scrollProgress()
      const mid = Math.min(p / 0.14, (1 - p) / 0.12, 1)
      el.style.opacity = String(1 - 0.55 * Math.max(0, Math.min(1, mid)))
    }
    function onScroll() {
      if (pending) return
      pending = true
      raf = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      stop()
    }
  }, [])

  return (
    <div ref={wrapRef} className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 7.5, 14], fov: 52 }}
        dpr={dpr}
        gl={{ antialias: !mobile && dpr >= 1.5, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#060609']} />
        <Suspense fallback={null}>
          <ParticleField reduced={calm} mobile={mobile} count={stars} />
          <Galaxy reduced={calm || mobile} spin={!calm} count={points} />
        </Suspense>
        <CameraController reduced={calm} />

        {/* Halves the point budget when the device cannot hold the frame rate,
            and stops adjusting after a few reversals so it settles instead of
            oscillating between two qualities forever. */}
        <PerformanceMonitor
          ms={250}
          iterations={5}
          threshold={0.75}
          flipflops={3}
          onDecline={degrade}
          onFallback={() => { setQuality(QUALITY_FLOOR); setDpr(DPR_FLOOR) }}
        />
      </Canvas>
      {/* cinematic vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 75% at 50% 45%, transparent 55%, rgba(4,4,8,0.55) 100%)',
        }}
      />
    </div>
  )
}
