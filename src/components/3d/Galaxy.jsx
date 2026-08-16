import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import ToolStars from './ToolStars'
import { galaxyState } from '../../state/galaxyStore'

const RADIUS = 14
const BRANCHES = 5
const SPIN = 1.15

function makeCoreTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,236,200,0.9)')
  g.addColorStop(0.25, 'rgba(255,190,120,0.45)')
  g.addColorStop(0.6, 'rgba(168,120,255,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Procedural spiral galaxy: dense golden core, violet mid-band, blue outer arms.
// `descend` (STARCHART landing): as you scroll the whole disk SINKS and its
// tilt opens toward face-on — so scrolling reads as "descending into the world."
export default function Galaxy({ reduced, spin = !reduced, descend = false }) {
  const group = useRef()

  const { positions, colors } = useMemo(() => {
    const count = reduced ? 24000 : 70000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const inside = new THREE.Color('#ffc98a')
    const mid = new THREE.Color('#b184f5')
    const outside = new THREE.Color('#4aa3e8')
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // bias radius toward the core for a bright galactic bulge
      const r = Math.pow(Math.random(), 1.7) * RADIUS
      const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2
      const spinAngle = r * SPIN

      // scatter tightens near the core, loosens along the arms
      const scatter = () =>
        Math.pow(Math.random(), 2.6) * (Math.random() < 0.5 ? 1 : -1) * (0.28 + r * 0.06)

      const x = Math.cos(branchAngle + spinAngle) * r + scatter()
      const z = Math.sin(branchAngle + spinAngle) * r + scatter()
      const y = scatter() * (0.5 - (r / RADIUS) * 0.28) * 2.2 // thick bulge, thin disk

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const t = r / RADIUS
      if (t < 0.3) c.copy(inside).lerp(mid, t / 0.3)
      else c.copy(mid).lerp(outside, (t - 0.3) / 0.7)
      // slight brightness variation so the arms shimmer
      const b = 0.75 + Math.random() * 0.45
      colors[i * 3] = c.r * b
      colors[i * 3 + 1] = c.g * b
      colors[i * 3 + 2] = c.b * b
    }
    return { positions, colors }
  }, [reduced])

  const coreTex = useMemo(makeCoreTexture, [])

  useFrame(({ clock }) => {
    if (!group.current) return
    if (galaxyState.explore) {
      // freeze the scroll sweep while exploring; keep a barely-there drift
      group.current.rotation.y += spin ? 0.0004 : 0
      return
    }
    // Use the damped progress written by CameraController — raw scrollY here
    // would re-inject wheel-step jitter into the galaxy's own rotation.
    const p = galaxyState.scrollP
    // slow sidereal rotation + scroll-coupled sweep
    const base = spin ? clock.elapsedTime * 0.018 : 0
    group.current.rotation.y = base + p * 2.4

    if (descend) {
      // eased so the "diving in" feels weighted, not linear — the disk sinks
      // below the fold and its tilt opens as the reader travels deeper.
      const e = p * p * (3 - 2 * p)
      group.current.position.y = -3.1 - e * 6
      group.current.rotation.x = 0.12 + e * 0.5
    }
  })

  return (
    <group ref={group} position={[0, -3.1, 0]} rotation={[0.12, 0, 0.06]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* galactic core glow */}
      <sprite scale={[7, 7, 1]}>
        <spriteMaterial map={coreTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[2.6, 2.6, 1]}>
        <spriteMaterial map={coreTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <ToolStars />
    </group>
  )
}
