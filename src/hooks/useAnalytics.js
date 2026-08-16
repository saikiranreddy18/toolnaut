import { useCallback, useEffect, useRef } from 'react'
import { track, EVENTS } from '../utils/analyticsEvents'

export function useAnalytics() {
  return useCallback((name, props) => track(name, props), [])
}

// Fires section_view once when the section scrolls into view.
export function useSectionView(id) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          track(EVENTS.SECTION_VIEW, { section: id })
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [id])
  return ref
}
