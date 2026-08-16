import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function makeGlowTexture(inner, outer) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ParticleField({ reduced, mobile = false }) {
  const starsRef = useRef()
  const count = reduced ? 700 : mobile ? 1200 : 2400

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // spherical shell so stars surround the camera at every waypoint
      const r = 26 + Math.random() * 42
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [count])

  const starTex = useMemo(() => makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), [])
  const nebulae = useMemo(
    () => [
      { tex: makeGlowTexture('rgba(124,58,237,0.14)', 'rgba(124,58,237,0)'), pos: [-20, 9, -34], scale: 46 },
      { tex: makeGlowTexture('rgba(6,182,212,0.10)', 'rgba(6,182,212,0)'), pos: [22, -10, -38], scale: 50 },
    ],
    [],
  )

  useFrame((_, delta) => {
    if (starsRef.current && !reduced) starsRef.current.rotation.y += delta * 0.008
  })

  return (
    <group>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTex}
          size={0.35}
          sizeAttenuation
          transparent
          depthWrite={false}
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {nebulae.map((n, i) => (
        <sprite key={i} position={n.pos} scale={[n.scale, n.scale, 1]}>
          <spriteMaterial map={n.tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}
