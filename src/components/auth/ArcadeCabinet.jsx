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
// Everything else still animates on transform and opacity: the tube boots, types
// its status, and cycles real tool names out of the catalogue.

const BOOT_LINES = [
  'TOOLNAUT OS v2.1',
  'MEMORY OK',
  'LINKING CATALOGUE...',
]

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

  return (
    <div
      className="relative h-full select-none"
      onPointerMove={trackStick}
      onPointerLeave={releaseStick}
    >
      {/* cabinet body */}
      <div
        className={`relative flex h-full flex-col p-3 ${framed ? 'rounded-[26px] border-[3px] border-black' : ''}`}
        style={framed ? { background: '#15151c', boxShadow: '7px 7px 0 #000' } : { background: 'transparent' }}
      >
        {/* top bezel — two vents flanking the marquee, like a real cabinet head */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className="h-7 flex-1 rounded-md border-[3px] border-black"
            style={{
              background:
                'repeating-linear-gradient(90deg, #24242e 0 3px, #15151c 3px 7px)',
            }}
            aria-hidden="true"
          />
          <div
            className="w-fit shrink-0 rounded-lg border-[3px] border-black px-5 py-1.5"
            style={{ background: 'var(--lime)', boxShadow: '3px 3px 0 #000' }}
          >
            {/* On lime the glow would be invisible, so the mark runs flat here
                and the infinity takes the marquee's black. */}
            <span className="flex items-center gap-1.5 text-lg text-black md:text-xl" style={{ '--lime': '#000' }}>
              <span aria-hidden="true" className="text-sm">✦</span>
              <Wordmark glow={false} className="tracking-[0.02em]" />
              <span aria-hidden="true" className="text-sm">✦</span>
            </span>
          </div>
          <span
            className="h-7 flex-1 rounded-md border-[3px] border-black"
            style={{
              background:
                'repeating-linear-gradient(90deg, #24242e 0 3px, #15151c 3px 7px)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* ── the screen, recessed into a bezel ── */}
        <div
          className="min-h-0 flex-1 rounded-[16px] border-[3px] border-black p-3"
          style={{ background: '#1c1c24', boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.8)' }}
        >
        <div
          className={`relative h-full overflow-hidden rounded-[10px] border-[3px] border-black ${launching ? '' : 'crt-flicker'}`}
          style={{ background: '#05070c' }}
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
        </div>

        {/* ── controls ── */}
        <div className="mt-3 flex items-center justify-between rounded-xl border-[3px] border-black px-5 py-3" style={{ background: '#0d0d13' }}>
          {/* Joystick. The base is drawn first and the shaft pivots from its
              centre, so leaning looks hinged rather than like a sliding stick. */}
          <div className="relative h-20 w-20 shrink-0" aria-hidden="true">
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
          </div>

          {/* two cabinet buttons that actually travel */}
          <div className="flex gap-3">
            {/* These do something now. They were aria-hidden decoration, which
                is fine for a picture of a cabinet and wrong for one you can
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

        <div className="mt-3 flex items-center justify-between rounded-xl border-[3px] border-black px-3 py-2" style={{ background: '#0d0d13' }}>
          <span
            className="rounded-full border-2 border-black px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.14em]"
            style={{ background: '#15151c', color: 'var(--lime)' }}
          >
            ⊕ CHART YOUR FUTURE
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-3 rounded-sm" style={{ background: 'var(--lime)', opacity: 0.35 + i * 0.25 }} />
            ))}
          </span>
        </div>
      </div>

      {/* sticker tag — the real catalogue size, read at render */}
      <div
        className="absolute -left-4 bottom-[16%] hidden rotate-[-8deg] rounded-lg border-[3px] border-black bg-white px-2.5 py-1.5 md:block"
        style={{ boxShadow: '3px 3px 0 #000' }}
      >
        <p className="font-display text-xs font-black uppercase leading-none text-black">
          {TOOLS.length}+
        </p>
        <p className="font-display text-[9px] font-black uppercase leading-none text-black">AI tools</p>
      </div>

      {/* globe badge, as in the reference — pure decoration, hidden from AT */}
      <div
        className="absolute -left-[13%] top-[34%] hidden h-16 w-16 items-center justify-center rounded-full border-[5px] border-black lg:flex"
        style={{
          background: '#151518',
          boxShadow: 'inset 0 0 0 4px var(--hot-pink), 4px 4px 0 #050506',
        }}
        aria-hidden="true"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--hot-pink)" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
        </svg>
      </div>
    </div>
  )
}
