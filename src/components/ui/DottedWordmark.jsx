import { useCallback, useEffect, useRef, useState } from 'react'
import { BRAND } from '../../config'

// The name, drawn in dots, invisible until you go looking for it.
//
// THE EFFECT
// The letterforms are stroked with a dashed outline and then masked out
// entirely, so the block reads as empty space. A radial mask follows the
// pointer and reveals only the dots underneath it — the name appears in the
// beam and fades behind you. Hovering does not toggle it on; you paint it.
//
// WHY A MASK AND NOT OPACITY
// A hover that flips opacity from 0 to 1 shows the whole word at once, which is
// just a hidden element. The point of "invisible until the cursor is on it" is
// that the cursor is doing the revealing, so the reveal has to be POSITIONAL.
// That means a mask whose centre tracks the pointer.
//
// The dots are real: stroke-dasharray on the glyph outline, so they follow the
// curves of the letters rather than being a dot pattern laid over a solid word.
//
// ACCESSIBILITY
// A pointer-only reveal is invisible to touch, to keyboards, and to anyone who
// cannot aim precisely. Every one of those paths gets the word shown plainly
// instead — a decorative effect must never be the only way to read something.
// The accessible name is on the wrapper, so screen readers get it regardless.

const REVEAL_RADIUS = 190

export default function DottedWordmark({ className = '', text = BRAND }) {
  const ref = useRef(null)
  // Measured once on enter, so a move costs no layout read.
  const rect = useRef(null)
  // Shown outright when there is no pointer to reveal with.
  const [alwaysOn, setAlwaysOn] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setAlwaysOn(coarse || reduced)
  }, [])

  // Pointer position goes straight to CSS custom properties rather than to
  // React state: this fires on every pointermove, and re-rendering an SVG at
  // pointer frequency costs far more than moving a mask does.
  //
  // The write is SYNCHRONOUS. It used to be deferred into requestAnimationFrame
  // to batch it, which meant that anywhere rAF is throttled — a background tab,
  // a hidden pane, a device under load — the property was never written and the
  // reveal silently did nothing at all. Measured exactly that: the mask sat at
  // its off-screen default through every pointer event.
  //
  // Deferring bought nothing anyway. The expensive part of this handler was
  // getBoundingClientRect, a layout read, on every move; caching the rect on
  // enter leaves only two style writes, which are cheap enough to do inline.
  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    // Measure lazily rather than relying on enter having run. Depending on the
    // enter handler made the whole effect fail silently whenever that handler
    // did not fire — and it does not always: React implements onPointerEnter
    // through pointerover, so anything dispatching a plain pointerenter, and
    // any path where the pointer is already inside on mount, left the rect null
    // and every move returned early. One layout read on the first move is a
    // cheaper price than an effect that quietly does nothing.
    if (!rect.current) rect.current = el.getBoundingClientRect()
    const r = rect.current
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])

  const measure = useCallback(() => {
    if (ref.current) rect.current = ref.current.getBoundingClientRect()
  }, [])

  // The cached rect goes stale when the page moves under it, so drop it on
  // resize and on scroll and let the next move re-measure.
  useEffect(() => {
    const drop = () => { rect.current = null }
    window.addEventListener('resize', drop, { passive: true })
    window.addEventListener('scroll', drop, { passive: true })
    return () => {
      window.removeEventListener('resize', drop)
      window.removeEventListener('scroll', drop)
    }
  }, [])

  const revealed = alwaysOn || active
  const mask = alwaysOn
    ? 'none'
    : `radial-gradient(circle ${REVEAL_RADIUS}px at var(--mx, -999px) var(--my, -999px), #000 0%, rgba(0,0,0,0.55) 45%, transparent 72%)`

  return (
    <div
      ref={ref}
      role="img"
      aria-label={text}
      className={`relative select-none ${className}`}
      onPointerMove={onMove}
      onPointerEnter={() => { measure(); setActive(true) }}
      onPointerLeave={() => {
        setActive(false)
        const el = ref.current
        if (el) {
          el.style.setProperty('--mx', '-999px')
          el.style.setProperty('--my', '-999px')
        }
      }}
      style={{ cursor: alwaysOn ? 'default' : 'crosshair' }}
    >
      <svg
        viewBox="0 0 1000 170"
        className="block w-full"
        aria-hidden="true"
        style={{
          WebkitMaskImage: mask,
          maskImage: mask,
          transition: 'opacity 320ms ease',
          opacity: revealed ? 1 : 0.9,
        }}
      >
        <text
          x="500"
          y="126"
          textAnchor="middle"
          fill="none"
          stroke="var(--lime)"
          strokeWidth="2.4"
          // 1px dot, 9px gap: the outline reads as dots rather than a dashed
          // line. Round caps make them dots and not tiny rectangles.
          strokeDasharray="1 9"
          strokeLinecap="round"
          style={{
            fontFamily: "Bungee, 'Space Grotesk', system-ui, sans-serif",
            fontSize: 132,
            fontStyle: 'italic',
            letterSpacing: '0.01em',
          }}
        >
          {text.toUpperCase()}
        </text>
      </svg>

      {/* The hint. Without it an invisible thing is indistinguishable from
          nothing at all, and nobody discovers the effect. It fades out the
          moment the pointer arrives, so it never competes with the reveal. */}
      {!alwaysOn && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-display text-[10px] font-black uppercase tracking-[0.28em] text-slate-600"
          style={{ opacity: active ? 0 : 1, transition: 'opacity 260ms ease' }}
        >
          move your cursor here
        </span>
      )}
    </div>
  )
}
