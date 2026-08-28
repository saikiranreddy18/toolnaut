import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import Galaxy from '../3d/Galaxy'
import { webglAvailable } from '../../utils/webgl'

// Toolnaut's real galaxy, running inside the arcade cabinet's screen — the same
// component the landing page mounts, not a picture of it.
//
// This is where WebGL earns its place. The CRT was a CSS planet before, which
// was right when the screen was decoration; it is wrong now that the joystick
// is supposed to fly it. You cannot orbit a gradient.
//
// Kept cheap deliberately: `reduced` drops the point count to 24k (the landing
// runs 70k), dpr is capped at 1.5, and the canvas only exists while the modal is
// open. A second WebGL context is affordable at that size — it was not going to
// be at full quality.

// Orbits the camera from the joystick. The joystick writes to a ref rather than
// React state on purpose: it moves every pointer event, and re-rendering a
// canvas at pointer frequency would cost far more than the scene itself.
function JoystickCamera({ tiltRef }) {
  const cur = useRef({ x: 0, y: 0 })

  useFrame(({ camera }) => {
    const target = tiltRef?.current || { x: 0, y: 0 }
    // Ease toward the stick rather than snapping, so letting go coasts to a
    // stop the way a real gimbal would.
    cur.current.x += (target.x - cur.current.x) * 0.06
    cur.current.y += (target.y - cur.current.y) * 0.06

    const az = 0.6 + cur.current.x * 0.9
    const el = 0.42 + cur.current.y * 0.5
    const r = 13

    camera.position.set(
      Math.sin(az) * Math.cos(el) * r,
      Math.sin(el) * r - 1.2,
      Math.cos(az) * Math.cos(el) * r,
    )
    camera.lookAt(0, -3.1, 0)
  })

  return null
}

export default function CabinetGalaxy({ tiltRef }) {
  // No WebGL (older devices, blocked contexts, some VMs) falls back to the CSS
  // sky the cabinet used before, so the screen is never a black hole.
  if (!webglAvailable()) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 62%, rgba(124,58,237,0.35), transparent 60%),' +
            'radial-gradient(ellipse 90% 60% at 50% 58%, rgba(34,211,238,0.28), transparent 55%), #05070c',
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.6, 13], fov: 52 }}
      gl={{ antialias: false, powerPreference: 'low-power' }}
      style={{ background: '#05070c' }}
    >
      <Suspense fallback={null}>
        <Galaxy reduced spin />
      </Suspense>
      <JoystickCamera tiltRef={tiltRef} />
    </Canvas>
  )
}
