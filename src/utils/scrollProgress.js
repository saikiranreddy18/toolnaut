// One cached source of scroll progress for the whole page.
//
// THE BUG THIS FIXES
// CameraController read `document.documentElement.scrollHeight` inside
// useFrame — every frame, sixty times a second. scrollHeight is a layout
// property, so reading it while the DOM is dirty forces a synchronous reflow.
// The landing page animates sections in on scroll, which means the DOM is
// dirty on exactly the frames the camera is moving: the camera was forcing a
// full layout on every frame of every scroll. That is the stutter.
//
// scrollY is cheap and does not force layout. scrollHeight is the expensive
// half, and it only changes when content or the viewport changes — so it is
// cached here and recomputed on resize or when the document actually resizes,
// never per frame.
//
// Everything scroll-driven reads from this: the camera, and the backdrop dim
// in Scene. One listener, one cached measurement, many consumers.

let scrollY = 0
let max = 1
let started = false
let raf = 0

function measure() {
  const doc = document.documentElement
  // the one layout read, on resize only
  max = Math.max(1, doc.scrollHeight - window.innerHeight)
}

function onScroll() {
  scrollY = window.scrollY || window.pageYOffset || 0
}

// Content can change height without a window resize — fonts landing, images
// decoding, a section expanding. Coalesced into one rAF so a burst of
// mutations costs a single measurement.
function scheduleMeasure() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    measure()
  })
}

export function startScrollTracking() {
  if (started || typeof window === 'undefined') return () => {}
  started = true

  measure()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', scheduleMeasure, { passive: true })

  let ro = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(scheduleMeasure)
    ro.observe(document.body)
  }

  return () => {
    started = false
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', scheduleMeasure)
    if (ro) ro.disconnect()
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }
}

// 0 at the top of the page, 1 at the bottom. Safe to call every frame.
export function scrollProgress() {
  return Math.min(1, Math.max(0, scrollY / max))
}

export function scrollTop() {
  return scrollY
}
