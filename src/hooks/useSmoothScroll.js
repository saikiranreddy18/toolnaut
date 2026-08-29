import { useEffect } from 'react'
import Lenis from 'lenis'

// Inertial scrolling for the landing page.
//
// WHY CSS WAS NEVER GOING TO FIX THIS
// `scroll-behavior: smooth` was already set, and it does nothing here: it only
// applies to PROGRAMMATIC scrolls — anchor links, scrollTo — never to wheel
// input. The wheel stayed raw the whole time.
//
// Measured off a screen recording of the real site: each wheel notch moved the
// page 28-36px on the first frame and then decayed away over about five frames
// (28, 9, 3, 2, 1). The page was rendering fine — every frame was unique at
// 30fps capture. It was not dropping frames; it was SNAPPING once per notch.
// That is why chasing frame rate never fixed it. This eases the position
// between notches so the motion is continuous instead of stepped.
//
// Lenis drives the real window scroll rather than transforming a container, so
// position:fixed, scroll listeners, the galaxy's scroll progress and anchor
// links all keep working untouched.

// `targetRef` smooths an inner scroller instead of the window — /goal's chat
// transcript is a fixed box the messages scroll inside, so window-level
// smoothing would never touch it.
export default function useSmoothScroll(enabled = true, targetRef = null) {
  useEffect(() => {
    if (!enabled) return undefined
    if (typeof window === 'undefined') return undefined

    // Never hijack scrolling from someone who asked for less motion — for a
    // vestibular disorder, smoothing is the symptom, not the cure.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return undefined

    // Coarse pointers already have native inertia from the OS. Adding a second
    // layer on top fights it and feels like lag.
    if (window.matchMedia('(pointer: coarse)').matches) return undefined

    const el = targetRef?.current || null
    if (targetRef && !el) return undefined

    const lenis = new Lenis({
      ...(el ? { wrapper: el, content: el.firstElementChild || el } : {}),
      // ~0.09 keeps the glide short enough that the page still feels attached
      // to the wheel. Lower reads as syrup and is the usual reason people
      // disable smooth-scroll libraries.
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
      // Touch is left alone; the OS does it better.
      syncTouch: false,
    })

    let raf = 0
    const frame = (t) => {
      lenis.raf(t)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [enabled, targetRef])
}
