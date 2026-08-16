import { useEffect, useRef } from 'react'

// A cluster of little stars that orbit the cursor and leave a soft sparkle trail
// as it moves — reinforces the "space" theme. Desktop pointers only; disabled
// under reduced-motion. Canvas is pointer-events:none so it never blocks clicks.
export default function CursorStars() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!finePointer || reduce) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, dpr = 1

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const mouse = { x: w / 2, y: h / 2 }
    const center = { x: mouse.x, y: mouse.y }
    let active = false

    // stars that orbit the cursor
    const orbit = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      radius: 16 + (i % 3) * 11,
      speed: 0.018 + (i % 3) * 0.007,
      size: 1.1 + (i % 2) * 0.8,
      tw: (i / 6) * Math.PI * 2,
    }))

    // fading sparkle trail
    const trail = []
    function spawn() {
      if (trail.length > 70) return
      trail.push({
        x: mouse.x + (Math.random() - 0.5) * 10,
        y: mouse.y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7 + 0.35,
        life: 1,
        size: Math.random() * 1.5 + 0.5,
      })
    }

    function onMove(e) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      active = true
      spawn()
    }
    window.addEventListener('pointermove', onMove)

    function dot(x, y, r, alpha, color) {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    let raf
    function frame() {
      ctx.clearRect(0, 0, w, h)
      center.x += (mouse.x - center.x) * 0.16
      center.y += (mouse.y - center.y) * 0.16

      if (active) {
        for (const s of orbit) {
          s.angle += s.speed
          s.tw += 0.08
          const x = center.x + Math.cos(s.angle) * s.radius
          const y = center.y + Math.sin(s.angle) * s.radius
          dot(x, y, s.size, 0.5 + Math.sin(s.tw) * 0.35, '#cfe3ff')
        }
      }
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02
        if (p.life <= 0) { trail.splice(i, 1); continue }
        dot(p.x, p.y, p.size * p.life, p.life * 0.8, '#ffffff')
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
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
