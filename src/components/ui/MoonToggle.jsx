import { useReducedMotion } from 'framer-motion'
import { haptic } from '../../utils/haptics'

// The moonlight switch: the knob IS the moon.
//
// A pair of radio rows said "Full moon / No moon" and made you read two labels
// to change one thing. A switch says it in one object — slide the moon up and
// the sky lights, slide it down and the stars come out. The halos are the light
// it is actually casting, so they fade with it rather than being decoration.
//
// Built as role="switch" rather than a styled checkbox so it announces its state
// to a screen reader, takes keyboard focus, and toggles on Space/Enter for free.
// Under prefers-reduced-motion the pieces jump instead of sliding.

// Laid out on the RIGHT half of the track, because that is the half the moon is
// not occupying when it is up; the whole group slides left with it. Positioned
// under the knob's parked spot, they were simply covered — "more stars" rendered
// as no stars.
//
// `faint` ones are the reason the setting exists: they are below the threshold a
// full moon washes out, so they only come out when it is down.
const STARS = [
  { x: 56, y: 13, r: 4.0, o: 1, faint: false },
  { x: 72, y: 27, r: 3.2, o: 0.9, faint: false },
  { x: 62, y: 34, r: 2.1, o: 0.7, faint: false },
  { x: 79, y: 12, r: 1.7, o: 0.8, faint: true },
  { x: 51, y: 30, r: 1.5, o: 0.7, faint: true },
]

// A five-point star, drawn rather than typed — the ✦ glyph renders differently
// on every platform and this has to sit at an exact size.
function star(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 ? r * 0.42 : r
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`)
  }
  return pts.join(' ')
}

export default function MoonToggle({ lit, onChange, id }) {
  const still = useReducedMotion()
  const ease = still ? 'none' : 'transform 420ms cubic-bezier(.34,1.32,.5,1), opacity 320ms ease'

  // knob travel, in px so the whole control stays crisp at any zoom
  const W = 92, H = 44, PAD = 5
  const K = H - PAD * 2                 // knob diameter
  const travel = W - PAD * 2 - K

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={lit}
      aria-label="Moonlight"
      onClick={() => { haptic.tap(); onChange(!lit) }}
      className="relative shrink-0 overflow-hidden rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px]"
      style={{
        width: W,
        height: H,
        background: lit ? '#2b2b3d' : '#14142e',
        outlineColor: 'var(--cyan)',
        boxShadow: lit
          ? '0 0 18px 3px rgba(226,232,240,0.32), inset 0 2px 5px rgba(0,0,0,0.55)'
          : '0 0 10px 1px rgba(120,130,180,0.18), inset 0 2px 5px rgba(0,0,0,0.7)',
        transition: still ? 'none' : 'background 380ms ease, box-shadow 380ms ease',
      }}
    >
      {/* The sky. It travels opposite the moon so the two never overlap, and it
          keeps a few stars under moonlight rather than going blank — a full moon
          softens the field, it does not erase it. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 92 44"
        aria-hidden="true"
        style={{
          transform: `translateX(${lit ? -travel : 0}px)`,
          transition: ease,
        }}
      >
        {STARS.map((s) => (
          <polygon
            key={`${s.x}-${s.y}`}
            points={star(s.x, s.y, s.r)}
            fill="#fff"
            opacity={lit ? (s.faint ? 0 : s.o * 0.6) : s.o}
            style={{ transition: still ? 'none' : 'opacity 380ms ease' }}
          />
        ))}
      </svg>

      {/* light the moon is throwing — concentric halos riding with the knob,
          clipped by the track, which is what makes them read as glow and not
          as rings sitting on top */}
      {[2.55, 1.95, 1.45].map((scale, i) => (
        <span
          key={scale}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            width: K * scale,
            height: K * scale,
            top: '50%',
            left: PAD + K / 2,
            marginTop: (-K * scale) / 2,
            marginLeft: (-K * scale) / 2,
            background: `rgba(226,232,240,${[0.05, 0.09, 0.15][i]})`,
            transform: `translateX(${lit ? travel : 0}px)`,
            opacity: lit ? 1 : 0,
            transition: ease,
          }}
        />
      ))}

      {/* the moon itself */}
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          width: K,
          height: K,
          top: PAD,
          left: PAD,
          transform: `translateX(${lit ? travel : 0}px)`,
          transition: ease,
          background: lit
            ? 'radial-gradient(circle at 34% 30%, #ffffff, #dcdce6 55%, #b9b9c8)'
            : 'radial-gradient(circle at 34% 30%, #3d3d5c, #24243f 60%, #1a1a30)',
          boxShadow: lit
            ? '0 2px 6px rgba(0,0,0,0.5), inset -2px -3px 6px rgba(120,120,150,0.45)'
            : '0 2px 6px rgba(0,0,0,0.6), inset -2px -3px 6px rgba(0,0,0,0.5)',
        }}
      >
        {/* craters — three, off-centre, so it never reads as a plain dot */}
        <svg viewBox="0 0 34 34" className="h-full w-full" aria-hidden="true">
          {[
            { cx: 13, cy: 20, r: 5.1 },
            { cx: 21.5, cy: 10, r: 3.1 },
            { cx: 24, cy: 21.5, r: 2.4 },
          ].map((c) => (
            <circle
              key={`${c.cx}-${c.cy}`}
              cx={c.cx} cy={c.cy} r={c.r}
              fill={lit ? '#a8a8bd' : '#15152b'}
              opacity={lit ? 0.85 : 0.7}
              style={{ transition: still ? 'none' : 'fill 380ms ease' }}
            />
          ))}
        </svg>
      </span>
    </button>
  )
}
