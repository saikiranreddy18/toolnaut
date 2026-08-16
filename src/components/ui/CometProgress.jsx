import { useEffect, useState } from 'react'

// The tiny comet that rides the right edge as you travel through the page.
export default function CometProgress() {
  const [p, setP] = useState(0)

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="comet-track" aria-hidden="true">
      <div className="comet" style={{ top: `calc(${(p * 100).toFixed(2)}% - 5px)` }} />
    </div>
  )
}
