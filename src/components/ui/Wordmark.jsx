import { useId } from 'react'

// The Toolnaut wordmark: T ∞ lnaut.
//
// The double "o" collapses into a single glowing infinity — two letters, one
// glyph, which is the idea the name is carrying. The catalogue never stops
// growing, so neither does the mark.
//
// Drawn rather than typed. The infinity is one continuous lemniscate with a
// soft lime glow, not a ∞ character: a text glyph would inherit whatever the
// font decided, vary between platforms, and could not carry the glow. As SVG it
// is identical everywhere and scales with the surrounding type.
//
// Sized in `em` throughout, so a single font-size on the parent sets the whole
// lockup — nav, hero and footer all use the same component at different sizes.

const LEMNISCATE =
  'M100 60 C100 12 22 12 22 60 C22 108 100 108 100 60 C100 12 178 12 178 60 C178 108 100 108 100 60 Z'

export default function Wordmark({ className = '', glow = true, style }) {
  // Filter ids must be unique — the wordmark renders more than once per page.
  const glowId = `tn-glow-${useId().replace(/:/g, '')}`

  return (
    <span
      role="img"
      aria-label="Toolnaut"
      className={`inline-flex items-center whitespace-nowrap font-display font-black italic ${className}`}
      style={style}
    >
      {/* The glyph is decorative; the lockup carries the name once, above. */}
      <span aria-hidden="true">T</span>
      <svg
        viewBox="0 0 200 120"
        aria-hidden="true"
        style={{
          width: '1.72em',
          height: '1.03em',
          display: 'inline-block',
          verticalAlign: '-0.14em',
          margin: '0 0.02em',
          overflow: 'visible',
        }}
      >
        {glow && (
          <defs>
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        )}
        <path
          d={LEMNISCATE}
          fill="none"
          stroke="var(--lime)"
          strokeWidth="21"
          strokeLinecap="round"
          filter={glow ? `url(#${glowId})` : undefined}
        />
      </svg>
      <span aria-hidden="true">lnaut</span>
    </span>
  )
}
