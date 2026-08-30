import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LEMNISCATE, LEM_W, LEM_H } from './lemniscate'

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
// THE INFINITY IS THE REAL MARK, NOT TWO O's
// This drew "TOOLNAUT" and coloured the OO, which is a description of the logo
// rather than the logo. The brand is T + lemniscate + LNAUT, and the same
// lemniscate path the small wordmark uses is drawn here — dotted like
// everything else, so it belongs to the same object instead of being pasted on.
//
// The three pieces are MEASURED at runtime rather than positioned by hand.
// Hard-coding x offsets works until the font loads a moment late or someone
// changes the size, and then the mark silently overlaps itself.
//
// ACCESSIBILITY
// A pointer-only reveal is invisible to touch, to keyboards, and to anyone who
// cannot aim precisely. Every one of those paths gets the word shown plainly
// instead — a decorative effect must never be the only way to read something.
// The accessible name is on the wrapper, so screen readers get it regardless.

const REVEAL_RADIUS = 190


const VB_W = 1000
const VB_H = 210
const FONT_SIZE = 132
const BASELINE = 150

export default function DottedWordmark({ className = '', text = 'Toolnaut' }) {
  const ref = useRef(null)
  const headRef = useRef(null)
  const tailRef = useRef(null)
  // Measured once on first move, so a move costs no layout read.
  const rect = useRef(null)
  const [alwaysOn, setAlwaysOn] = useState(false)
  const [active, setActive] = useState(false)

  // The brand splits at its first run of O's: everything before is the head,
  // everything after is the tail, and the lemniscate stands in for the run.
  const upper = text.toUpperCase()
  const m = upper.match(/O{2,}/)
  const head = m ? upper.slice(0, m.index) : upper
  const tail = m ? upper.slice(m.index + m[0].length) : ''

  // Laid out from measured advance widths so the mark cannot overlap itself.
  const [layout, setLayout] = useState(null)

  useLayoutEffect(() => {
    let cancelled = false
    const place = () => {
      if (cancelled) return
      const h = headRef.current
      const t = tailRef.current
      if (!h) return
      const hw = h.getComputedTextLength ? h.getComputedTextLength() : 0
      const tw = t && t.getComputedTextLength ? t.getComputedTextLength() : 0
      // The glyph sits slightly under the cap line and a touch tighter than the
      // letters, which is how the small wordmark reads.
      const lemH = FONT_SIZE * 0.78
      const lemW = (lemH / LEM_H) * LEM_W
      const gap = FONT_SIZE * 0.04
      const total = hw + gap + lemW + gap + tw
      const startX = (VB_W - total) / 2
      setLayout({
        headX: startX,
        lemX: startX + hw + gap,
        lemY: BASELINE - lemH * 0.92,
        lemScale: lemH / LEM_H,
        tailX: startX + hw + gap + lemW + gap,
      })
    }
    place()
    // Bungee may still be loading; measuring before it lands gives fallback
    // metrics and a mark that jumps once the real face arrives.
    if (document.fonts?.ready) document.fonts.ready.then(place).catch(() => {})
    window.addEventListener('resize', place, { passive: true })
    return () => {
      cancelled = true
      window.removeEventListener('resize', place)
    }
  }, [head, tail])

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
  // The write is SYNCHRONOUS. It was deferred into requestAnimationFrame to
  // batch it, which meant that anywhere rAF is throttled — a background tab, a
  // device under load — the property was never written and the reveal silently
  // did nothing at all.
  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    // Measured lazily rather than on enter: React implements onPointerEnter
    // through pointerover, so any path where enter did not fire left the rect
    // null and every move returned early.
    if (!rect.current) rect.current = el.getBoundingClientRect()
    const r = rect.current
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])

  // The cached rect goes stale when the page moves under it.
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
    : `radial-gradient(circle ${REVEAL_RADIUS}px at var(--mx, -999px) var(--my, -999px), #000 0%, rgba(0,0,0,0.6) 45%, transparent 72%)`

  const textStyle = {
    fontFamily: "Bungee, 'Space Grotesk', system-ui, sans-serif",
    fontSize: FONT_SIZE,
    fontStyle: 'italic',
    letterSpacing: '0.01em',
  }

  // SOLID, not dotted. The dotted outline was so faint that the whole band
  // read as an empty hole with a stray hint floating in it — and it looked
  // nothing like the mark itself. The reveal now shows the actual lockup:
  // white glyphs, lime lemniscate, a soft glow. Same mask, same machinery;
  // only what the beam uncovers changed.
  const renderMark = (withRefs) => (
    <>
      <text
        ref={withRefs ? headRef : undefined}
        x={layout ? layout.headX : 0}
        y={BASELINE}
        textAnchor="start"
        fill="#e8ecf4"
        style={{ ...textStyle, visibility: layout ? 'visible' : 'hidden' }}
      >
        {head}
      </text>
      {layout && (
        <g transform={`translate(${layout.lemX} ${layout.lemY}) scale(${layout.lemScale})`}>
          <path d={LEMNISCATE} fill="none" stroke="var(--lime)" strokeWidth={13 / layout.lemScale} strokeLinecap="round" />
        </g>
      )}
      {tail && (
        <text
          ref={withRefs ? tailRef : undefined}
          x={layout ? layout.tailX : 0}
          y={BASELINE}
          textAnchor="start"
          fill="#e8ecf4"
          style={{ ...textStyle, visibility: layout ? 'visible' : 'hidden' }}
        >
          {tail}
        </text>
      )}
    </>
  )

  return (
    <div
      ref={ref}
      role="img"
      aria-label={text}
      className={`relative select-none ${className}`}
      onPointerMove={onMove}
      onPointerEnter={() => setActive(true)}
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
      {/* Ghost layer: the mark at 6% opacity, always. Fully invisible idle
          state made the band indistinguishable from a layout bug — a shape
          you can just barely see invites the cursor; a void does not. */}
      {!alwaysOn && (
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 block w-full" aria-hidden="true" style={{ opacity: 0.06 }}>
          {renderMark(false)}
        </svg>
      )}

      {/* Reveal layer: the same mark, uncovered by the beam. Carries the refs
          so the advance-width measurement runs on a rendered instance. */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block w-full"
        aria-hidden="true"
        style={{
          WebkitMaskImage: mask,
          maskImage: mask,
          transition: 'opacity 320ms ease',
          opacity: revealed ? 1 : 0.92,
          filter: 'drop-shadow(0 0 14px rgba(163,255,46,0.28)) drop-shadow(0 0 26px rgba(232,236,244,0.12))',
        }}
      >
        {renderMark(true)}
      </svg>

      {/* The hint. It fades the moment the pointer arrives, so it never
          competes with the reveal. */}
      {!alwaysOn && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-1 text-center font-display text-[10px] font-black uppercase tracking-[0.28em] text-slate-600"
          style={{ opacity: active ? 0 : 1, transition: 'opacity 260ms ease' }}
        >
          move your cursor here
        </span>
      )}
    </div>
  )
}
