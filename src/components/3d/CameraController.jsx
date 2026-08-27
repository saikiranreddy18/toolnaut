import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { galaxyState, GALAXY_CENTER } from '../../state/galaxyStore'

// Scroll-driven orbit flight. The one thing that makes this feel smooth:
// scrollY arrives in discrete wheel steps, so we damp the PROGRESS value
// (frame-rate independent) and derive the camera from the damped value.
// Raw scrollY must never reach the camera directly.
const START_RADIUS = 18
const END_RADIUS = 11
const START_ELEV = 0.5 // ~28.6°, comfortable overview at the hero
// Floor, not zero — the particle disk reads as an almost-black void at true
// edge-on (near-zero real thickness), verified empirically in explore mode.
const END_ELEV = 0.09 // ~5.2°, near edge-on by the end of the scroll
const TILT_EASE = 0.3 // <1 = front-loaded: opens toward edge-on quickly, not just at the very end
const TURNS = Math.PI * 2 // one full orbit over the page

export default function CameraController({ reduced }) {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    if (galaxyState.explore) {
      const { zoom, rotY } = galaxyState
      const rotX = Math.max(0.05, Math.min(1.25, galaxyState.rotX))
      const [cx, cy, cz] = GALAXY_CENTER
      const target = new THREE.Vector3(
        cx + Math.sin(rotY) * Math.cos(rotX) * zoom,
        cy + Math.sin(rotX) * zoom,
        cz + Math.cos(rotY) * Math.cos(rotX) * zoom,
      )
      camera.position.lerp(target, 0.1)
      camera.lookAt(cx, cy, cz)
      return
    }

    // Camera progress tracks the whole page. The landing is the only page that
    // mounts the galaxy; the scrollytelling variant this used to support belonged
    // to /starchart, which no longer exists.
    let rawP
    {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      rawP = max > 0 ? Math.min(1, window.scrollY / max) : 0
    }

    // Frame-rate-independent smoothing of scroll progress itself.
    // λ=2.2 ≈ cinematic half-second settle; wheel steps become a glide.
    galaxyState.scrollP = THREE.MathUtils.damp(galaxyState.scrollP, rawP, 2.2, delta)
    const p = galaxyState.scrollP

    // Damped mouse parallax (subtle drift, not a tilt change)
    const amp = reduced ? 0 : 1
    mouse.current.x = THREE.MathUtils.damp(mouse.current.x, state.pointer.x * amp, 2, delta)
    mouse.current.y = THREE.MathUtils.damp(mouse.current.y, state.pointer.y * amp, 2, delta)

    // Orbit around the galaxy while approaching and descending: radius
    // 18→10 (travel inward) and elevation 31.5°→2.9° (the viewing axis opens
    // toward edge-on as you descend) both eased, angle 0→2π (one revolution).
    const angle = p * TURNS
    const radiusEase = p * p * (3 - 2 * p) // smoothstep — weighted approach
    const radius = START_RADIUS - (START_RADIUS - END_RADIUS) * radiusEase
    const tiltEase = Math.pow(p, TILT_EASE)
    const elev = START_ELEV - (START_ELEV - END_ELEV) * tiltEase

    const [cx, cy, cz] = GALAXY_CENTER
    camera.position.set(
      cx + Math.cos(angle) * radius * Math.cos(elev) + mouse.current.x * 0.5,
      cy + radius * Math.sin(elev) + mouse.current.y * 0.4,
      cz + Math.sin(angle) * radius * Math.cos(elev),
    )
    // lookAt derives the orientation — position is already damped, so the
    // view rotates exactly as smoothly as the position moves. Target the
    // galaxy's actual center (not the world origin it visually sits below).
    camera.lookAt(cx, cy, cz)
  })

  return null
}
