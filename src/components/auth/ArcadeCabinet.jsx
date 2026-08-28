import { useEffect, useRef, useState } from 'react'
import CabinetGalaxy from './CabinetGalaxy'
import { haptic } from '../../utils/haptics'
import { TOOLS } from '../../utils/toolsCatalog'
import Wordmark from '../ui/Wordmark'

// The cabinet: a live screen showing Toolnaut's own galaxy, a joystick that
// flies it, and buttons that travel.
//
// The screen used to be a CSS planet, and the comment here used to argue against
// WebGL. That was right while the screen was decoration and wrong the moment the
// joystick was meant to control it — you cannot orbit a gradient. The galaxy is
// now the real R3F component the landing page mounts, at reduced point count,
// and it falls back to the CSS sky where WebGL is unavailable.
//
// LAYOUT
// Three rows — head, display bay, footer — with the bay taking the slack, and
// the body running the full height of its column UNDER the contour frame. The
// frame overlays the machine; it does not box it in from outside. Insetting the
// body to sit inside the frame is what left the dead margin at the bottom.

const BOOT_LINES = [
  'TOOLNAUT OS v2.1',
  'MEMORY OK',
  'LINKING CATALOGUE...',
]

const GRILLE = 'repeating-linear-gradient(0deg, #1c1c1e 0 2px, #080809 2px 5px)'

export default function ArcadeCabinet({ launching = false, framed = true, onButtonA, onButtonB }) {
  const [booted, setBooted] = useState(false)
  const [typed, setTyped] = useState('')
  const [toolName, setToolName] = useState('')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const tiltRef = useRef({ x: 0, y: 0 })
  const [pressed, setPressed] = useState(null)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const after = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }

  // boot, then type the status line a character at a time
  useEffect(() => {
    const target = 'CHARTING STACK...'
    after(900, () => {
      setBooted(true)
      target.split('').forEach((_, i) => {
        after(i * 55, () => setTyped(target.slice(0, i + 1)))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // real tool names scrolling past, so the screen is showing the actual product
  useEffect(() => {
    if (!booted || !TOOLS.length) return
    let i = Math.floor(TOOLS.length / 3)
    const tick = () => {
      i = (i + 7) % TOOLS.length
      setToolName(TOOLS[i]?.name || '')
    }
    tick()
    const id = setInterval(tick, 1500)
    return () => clearInterval(id)
  }, [booted])

  // The joystick follows the pointer while it is over the cabinet and springs
  // back on leave. A stick that never moves reads as a picture of a cabinet;
  // one that leans reads as a machine.
  function trackStick(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    const clamp = (n) => Math.max(-1, Math.min(1, n))
    const nx = clamp(dx)
    const ny = clamp(dy)
    setTilt({ x: nx * 13, y: ny * 9 })      // the visible lean of the stick
    tiltRef.current = { x: nx, y: -ny }     // what the galaxy camera reads
  }

  function releaseStick() {
    setTilt({ x: 0, y: 0 })
    tiltRef.current = { x: 0, y: 0 }
  }

  // Arrow keys nudge the stick and hold it there — a keyboard has no "release",
  // so it stays where it was put until Space/Home or blur re-centres it.
  function steer(e) {
    const step = 0.34
    const cur = tiltRef.current
    let { x, y } = cur
    if (e.key === 'ArrowLeft') x -= step
    else if (e.key === 'ArrowRight') x += step
    else if (e.key === 'ArrowUp') y += step
    else if (e.key === 'ArrowDown') y -= step
    // NOT Escape — that closes the dialog, and a dialog's Escape has to keep
    // meaning "close" no matter what inside it has focus.
    else if (e.key === ' ' || e.key === 'Home') { x = 0; y = 0 }
    else return
    e.preventDefault()
    const c = (n) => Math.max(-1, Math.min(1, n))
    x = c(x); y = c(y)
    tiltRef.current = { x, y }
    setTilt({ x: x * 13, y: -y * 9 })
  }

  const grille = (
    <span
      className="h-8 min-w-0 flex-1 rounded-[3px] border-[5px] md:h-[46px]"
      style={{
        borderColor: '#050506',
        background: GRILLE,
        boxShadow: 'inset 0 0 0 3px #343439, 0 3px 0 #000',
      }}
      aria-hidden="true"
    />
  )

  return (
    <div
      className="relative h-full select-none"
      onPointerMove={trackStick}
      onPointerLeave={releaseStick}
    >
      {/* The cabinet body, sitting under the contour frame (z-1 against the
          frame's z-4) and filling its column top to bottom. */}
      <div
        className={`relative z-[1] grid h-full min-w-0 grid-rows-[auto_1fr_auto] md:grid-rows-[114px_1fr_80px] ${framed ? 'rounded-[26px]' : ''}`}
        style={{
          border: '8px solid #050507',
          borderRight: '7px solid var(--hot-pink)',
          background: '#111114',
          boxShadow: 'inset 0 0 0 4px #2c2c31, inset 0 0 0 8px #050506',
          // clearance for the contour's rail and top rule, which are drawn
          // over this box rather than around it
          paddingLeft: '13%',
          paddingTop: '2.3%',
        }}
      >
        {/* ── head: two speaker grilles flanking the marquee ── */}
        <div className="flex items-center justify-between gap-3 pl-0 pr-4 pt-2 md:pr-[18px]">
          {grille}

          {/* The marquee is sheared and outlined in pink — that shear is what
              makes the head read as a cabinet rather than a label. The wordmark
              inside is counter-sheared so the name itself stays upright. */}
          <div
            className="flex min-h-[52px] shrink-0 items-center px-3 md:min-h-[72px] md:px-[18px]"
            style={{
              width: '52%',
              border: '7px solid #050506',
              outline: '5px solid var(--hot-pink)',
              background: 'linear-gradient(var(--lime), color-mix(in srgb, var(--lime) 78%, #000))',
              transform: 'skewX(-7deg)',
              boxShadow: '5px 5px 0 #050506, inset 0 3px rgba(255,255,255,0.45)',
            }}
          >
            <span
              className="flex w-full items-center justify-between gap-2 text-black"
              style={{ transform: 'skewX(7deg)', '--lime': '#000' }}
            >
              <span aria-hidden="true" className="text-sm font-black">✦</span>
              <Wordmark glow={false} className="text-lg tracking-[0.02em] md:text-xl" />
              <span aria-hidden="true" className="text-sm font-black">✦</span>
            </span>
          </div>

          {grille}
        </div>

        {/* ── display bay: the tube takes the slack, the deck sits under it ── */}
        <div className="flex min-h-0 flex-col gap-4 pb-2 pl-0 pr-4 pt-4 md:gap-[18px] md:pb-[9px] md:pr-[22px] md:pt-[29px]">
          <div
            className={`relative min-h-0 flex-1 overflow-hidden ${launching ? '' : 'crt-flicker'}`}
            style={{
              border: '8px solid #050506',
              borderRadius: '31px 31px 34px 34px',
              background: '#020509',
              boxShadow: 'inset 0 0 0 4px #29292d, 0 8px 0 #080809',
            }}
          >
            {/* The real galaxy, flown by the joystick. */}
            <CabinetGalaxy tiltRef={tiltRef} />

            {/* HUD */}
            <div className="absolute inset-0 flex flex-col justify-between p-3 font-mono text-[10px] leading-relaxed md:p-4 md:text-xs">
              <div style={{ color: 'var(--lime)', textShadow: '0 0 8px rgba(163,255,46,0.55)' }}>
                {!booted ? (
                  BOOT_LINES.map((l) => <div key={l}>{l}</div>)
                ) : (
                  <>
                    <div>STATUS:</div>
                    <div>
                      {typed}
                      <span className="animate-pulse">_</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-end justify-between gap-2">
                <span
                  className="truncate rounded border-2 border-black bg-black/70 px-2 py-1"
                  style={{ color: 'var(--cyan)' }}
                >
                  {toolName ? `◂ ${toolName}` : 'MISSION: BUILD YOUR STACK'}
                </span>
                <span className="shrink-0" style={{ color: 'var(--hot-pink)' }} aria-hidden="true">
                  ♥♥♥
                </span>
              </div>
            </div>

            <div className="crt-rollbar" aria-hidden="true" />
            <div className="crt-glass" aria-hidden="true" />
          </div>

          {/* ── control deck ── */}
          <div
            className="relative flex shrink-0 items-end justify-between gap-6 px-4 py-3 md:gap-[31px] md:px-[31px]"
            style={{
              border: '6px solid #050506',
              borderRadius: 8,
              background: 'linear-gradient(150deg, #28282b, #0d0d0f 69%)',
              boxShadow: 'inset 0 0 0 2px #424247',
            }}
          >
            {/* deck screws, so the plate reads as bolted down */}
            {[
              { top: 7, left: 9 },
              { top: 7, right: 9 },
              { bottom: 7, left: 9 },
            ].map((pos, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute h-2 w-2 rounded-full"
                style={{
                  ...pos,
                  background: 'radial-gradient(circle at 35% 30%, #55555f, #17171b)',
                  boxShadow: 'inset 0 0 0 1px #000',
                }}
              />
            ))}

            {/* Joystick. The base is drawn first and the shaft pivots from its
                centre, so leaning looks hinged rather than like a sliding stick. */}
            <button
            type="button"
            onKeyDown={steer}
            onBlur={releaseStick}
            aria-label="Flight stick — arrow keys fly the galaxy, space re-centres"
            title="Arrow keys fly the galaxy"
            className="relative h-20 w-20 shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ outlineColor: 'var(--cyan)' }}
          >
              <div
                className="absolute bottom-0 left-1/2 h-4 w-16 -translate-x-1/2 rounded-[50%] border-[3px] border-black"
                style={{ background: 'linear-gradient(#3a3a46, #1c1c24)' }}
              />
              <div
                className="joystick-shaft absolute bottom-[8px] left-1/2 h-11 w-3.5 rounded-full border-[3px] border-black"
                style={{
                  background: 'linear-gradient(90deg, #c01f7b, var(--hot-pink) 55%, #ff7ac6)',
                  transform: `translateX(-50%) rotate(${tilt.x}deg)`,
                }}
              >
                <span
                  className="absolute -top-5 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full border-[3px] border-black"
                  style={{
                    background: 'radial-gradient(circle at 32% 28%, #ff9ad4, var(--hot-pink) 58%, #a81a68)',
                  }}
                />
              </div>
            </button>

            {/* two cabinet buttons that actually travel */}
            <div className="flex gap-3 pb-1">
              {/* These do something. They were aria-hidden decoration, which is
                  fine for a picture of a cabinet and wrong for one you can
                  operate: A starts the sign-in, B jumps to the email field. Real
                  buttons, so they take keyboard focus and announce themselves. */}
              {[
                { id: 'a', color: 'var(--lime)', label: 'Start sign-in with Google', run: onButtonA },
                { id: 'b', color: 'var(--cyan)', label: 'Sign in with email instead', run: onButtonB },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={b.label}
                  title={b.label}
                  onPointerDown={() => setPressed(b.id)}
                  onPointerUp={() => setPressed(null)}
                  onPointerLeave={() => setPressed(null)}
                  onClick={() => { haptic.tap(); b.run?.() }}
                  className="cab-btn h-11 w-11 rounded-full border-[3px] border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                  style={{
                    background: b.color,
                    boxShadow: pressed === b.id ? '0 0 0 #000' : '3px 3px 0 #000',
                    filter: pressed === b.id ? 'brightness(0.85)' : 'none',
                    outlineColor: 'var(--cyan)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── footer ── */}
        <div
          className="flex items-center justify-between gap-3.5 py-3 pl-0 pr-4 md:pr-[27px]"
          style={{
            borderTop: '6px solid #000',
            borderRadius: '0 0 0 21px',
            background: '#080809',
            boxShadow: 'inset 0 0 0 3px #242429',
          }}
        >
          <span
            className="flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ background: '#15151c', color: 'var(--lime)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
            </svg>
            Chart your future
          </span>

          <span className="flex items-center gap-3" aria-hidden="true">
            <span className="hidden gap-1 md:flex">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-5 w-1 rounded-sm" style={{ background: '#242429' }} />
              ))}
            </span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-3 rounded-sm" style={{ background: 'var(--lime)', opacity: 0.35 + i * 0.25 }} />
              ))}
            </span>
          </span>
        </div>
      </div>

    </div>
  )
}
