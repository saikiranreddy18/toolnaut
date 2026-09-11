import { useEffect, useRef } from 'react'

// The tiny comet that rides the right edge as you travel through the page.
// Writes straight to the DOM (like Scene.jsx's scroll-opacity handler) so a
// purely decorative position update never triggers a React re-render.
export default function CometProgress() {
  const cometRef = useRef(null)

  useEffect(() => {
    function onScroll() {
      const el = cometRef.current
      if (!el) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      el.style.top = `calc(${(p * 100).toFixed(2)}% - 5px)`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="comet-track" aria-hidden="true">
      <div ref={cometRef} className="comet" />
    </div>
  )
}
