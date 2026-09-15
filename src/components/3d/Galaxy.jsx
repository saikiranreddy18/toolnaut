import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import ToolStars from './ToolStars'
import { galaxyState } from '../../state/galaxyStore'


function makeCoreTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.25, 'rgba(228,228,235,0.35)')
  g.addColorStop(0.6, 'rgba(160,160,170,0.08)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The galaxy is made of tools and nothing else: every star is a catalog entry
// (ToolStars). This component is only the frame around them: a soft white core
// glow and the slow rotation. `count` is accepted for callers that still pass a
// point budget, but there are no decorative points left to budget.
export default function Galaxy({ reduced, spin = !reduced }) {
  const group = useRef()

  const coreTex = useMemo(makeCoreTexture, [])

  // Materials don't dispose their `map` — release the core canvas on unmount.
  useEffect(() => () => coreTex.dispose(), [coreTex])

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
  })

  return (
    <group ref={group} position={[0, -3.1, 0]} rotation={[0.08, 0, 0.04]}>
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
