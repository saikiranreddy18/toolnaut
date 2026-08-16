import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import ParticleField from './ParticleField'
import Galaxy from './Galaxy'
import CameraController from './CameraController'

// Quality tiers (mobile-first launch):
//   full   — desktop: 70k-point galaxy, 2400 stars, pointer parallax, dpr 2
//   mobile — phones: 24k-point galaxy, 1200 stars, LIVE rotation + camera
//            flight (the "entering space" feel), dpr 1.5
//   calm   — prefers-reduced-motion: static composition, dpr 1.25
const DPR = { full: 2, mobile: 1.5, calm: 1.25 }

export default function Scene({ mode = 'full', descend = false }) {
  const wrapRef = useRef(null)
  const calm = mode === 'calm'
  const mobile = mode === 'mobile'

  // Dim the universe while reading content sections; full brightness at the
  // hero and the final CTA where the galaxy is the star.
  useEffect(() => {
    function onScroll() {
      const el = wrapRef.current
      if (!el) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      const mid = Math.min(p / 0.14, (1 - p) / 0.12, 1)
      el.style.opacity = String(1 - 0.55 * Math.max(0, Math.min(1, mid)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={wrapRef} className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 7.5, 14], fov: 52 }}
        dpr={[1, DPR[mode]]}
        gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
      >
        {/* pixel-match the STARCHART page bg so the void has zero visible seam */}
        <color attach="background" args={[descend ? '#0a0a0f' : '#060609']} />
        <Suspense fallback={null}>
          <ParticleField reduced={calm} mobile={mobile} />
          <Galaxy reduced={calm || mobile} spin={!calm} descend={descend} />
        </Suspense>
        <CameraController reduced={calm} />
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
