import { useRef } from 'react'

// Mouse-tracking 3D tilt wrapper for floating cards.
export default function Tilt({ children, max = 10, className = '', style }) {
  const ref = useRef(null)

  function onMove(e) {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(800px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateZ(0)`
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transition: 'transform 0.25s ease', willChange: 'transform', ...style }}
    >
      {children}
    </div>
  )
}
