import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Given a dialog's focusable elements (DOM order) and which one currently has
// focus, returns the element Tab/Shift+Tab should land on when it would
// otherwise leave the set — or null when no wrap is needed. Pure and DOM-free
// so it is unit-testable without a browser or jsdom, which this repo has
// neither installed nor otherwise needs.
export function wrapTarget(focusable, active, shiftKey) {
  if (focusable.length === 0) return null
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (shiftKey && active === first) return last
  if (!shiftKey && active === last) return first
  return null
}

// WAI-ARIA Dialog pattern's two halves this app's role="dialog" surfaces were
// missing: while active, Tab/Shift+Tab cycles only through containerRef's own
// focusable elements, and closing restores focus to whatever had it before
// the dialog opened. Every other key passes through untouched, so it never
// fights a dialog's own Escape/arrow-key handling.
export default function useFocusTrap(containerRef, active) {
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!active) return
    restoreRef.current = document.activeElement

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
      const target = wrapTarget(focusable, document.activeElement, e.shiftKey)
      if (target) { e.preventDefault(); target.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      restoreRef.current?.focus?.()
    }
  }, [active, containerRef])
}
