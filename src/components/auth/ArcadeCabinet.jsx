import { useEffect, useRef, useState } from 'react'
import { TOOLS } from '../../utils/toolsCatalog'

// The cabinet: a live CRT, a joystick that moves, and buttons that travel.
//
// Deliberately CSS and SVG rather than React Three Fiber. The landing page
// already runs a 70,000-particle R3F scene; mounting a second WebGL context
// inside a modal costs a context, a frame budget and a fallback path, all for a
// decorative screen. Everything here animates on transform and opacity only.
//
// The screen is not a static image. It boots, types, cycles real tool names out
// of the catalogue, and the tube flickers — "powered on" comes from movement,
// not from detail.

const BOOT_LINES = [
  'TOOLNAUT OS v2.1',
  'MEMORY OK',
  'LINKING CATALOGUE...',
]

export default function ArcadeCabinet({ launching = false }) {
  const [booted, setBooted] = useState(false)
  const [typed, setTyped] = useState('')
  const [toolName, setToolName] = useState('')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
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
    setTilt({ x: clamp(dx) * 13, y: clamp(dy) * 9 })
  }

  return (
    <div
      className="relative select-none"
      onPointerMove={trackStick}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      {/* cabinet body */}
      <div
        className="relative rounded-[26px] border-[3px] border-black p-3"
        style={{ background: '#15151c', boxShadow: '7px 7px 0 #000' }}
      >
        {/* marquee */}
        <div
          className="mx-auto mb-3 w-fit rounded-lg border-[3px] border-black px-6 py-1.5"
          style={{ background: 'var(--lime)', boxShadow: '3px 3px 0 #000' }}
        >
          <span className="font-display text-lg font-black italic tracking-[0.1em] text-black md:text-xl">
            ✦ TOOLNAUT ✦
          </span>
        </div>

        {/* ── the screen ── */}
        <div
          className={`relative overflow-hidden rounded-[10px] border-[3px] border-black ${launching ? '' : 'crt-flicker'}`}
          style={{ background: '#05070c', aspectRatio: '4 / 3' }}
        >
          {/* Starfield behind the planet, so the black is never empty. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(1px 1px at 18% 22%, rgba(255,255,255,0.8), transparent),' +
                'radial-gradient(1px 1px at 62% 14%, rgba(255,255,255,0.6), transparent),' +
                'radial-gradient(1px 1px at 82% 34%, rgba(199,210,254,0.7), transparent),' +
                'radial-gradient(1px 1px at 38% 8%, rgba(255,255,255,0.5), transparent),' +
                'radial-gradient(1px 1px at 8% 44%, rgba(165,243,252,0.6), transparent)',
            }}
          />

          {/* The planet is a circle TWICE the frame, pushed far enough below it
              that only the top arc shows. Sized any smaller and it reads as a
              ball sitting on the screen; any larger and the curve flattens into
              a plain blue field — which is exactly what the first attempt did. */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="planet-surface absolute left-1/2 h-[200%] w-[200%] -translate-x-1/2 rounded-full"
              style={{
                bottom: '-155%',
                background:
                  'radial-gradient(circle at 38% 18%, #3b82c4 0%, #1d4e86 30%, #123a63 52%, #0a1f38 72%, #061225 100%),' +
                  'repeating-linear-gradient(102deg, rgba(163,255,46,0.10) 0 26px, transparent 26px 74px)',
                backgroundSize: '100% 100%, 200% 100%',
                boxShadow: 'inset -30px 10px 70px rgba(0,0,0,0.7)',
              }}
            />
            {/* atmosphere: a bright rim hugging the horizon arc */}
            <div
              className="pointer-events-none absolute left-1/2 h-[200%] w-[200%] -translate-x-1/2 rounded-full"
              style={{
                bottom: '-155%',
                boxShadow: 'inset 0 10px 26px rgba(34,211,238,0.55), 0 -2px 30px rgba(34,211,238,0.28)',
              }}
            />
          </div>

          {/* a small moon, because the horizon alone reads as a gradient */}
          <div
            className="absolute right-[14%] top-[16%] h-9 w-9 rounded-full md:h-11 md:w-11"
            style={{
              background: 'radial-gradient(circle at 34% 30%, #e8ecf5 0%, #9aa3b5 55%, #4a5265 100%)',
              boxShadow: '0 0 22px rgba(232,236,245,0.28)',
            }}
          />

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

        {/* ── controls ── */}
        <div className="mt-3 flex items-center justify-between rounded-xl border-[3px] border-black px-5 py-3" style={{ background: '#0d0d13' }}>
          {/* Joystick. The base is drawn first and the shaft pivots from its
              centre, so leaning looks hinged rather than like a sliding stick. */}
          <div className="relative h-16 w-16 shrink-0" aria-hidden="true">
            <div
              className="absolute bottom-0 left-1/2 h-3.5 w-14 -translate-x-1/2 rounded-[50%] border-[3px] border-black"
              style={{ background: 'linear-gradient(#3a3a46, #1c1c24)' }}
            />
            <div
              className="joystick-shaft absolute bottom-[7px] left-1/2 h-9 w-3 rounded-full border-[3px] border-black"
              style={{
                background: 'linear-gradient(90deg, #c01f7b, var(--hot-pink) 55%, #ff7ac6)',
                transform: `translateX(-50%) rotate(${tilt.x}deg)`,
              }}
            >
              <span
                className="absolute -top-4 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full border-[3px] border-black"
                style={{
                  background: 'radial-gradient(circle at 32% 28%, #ff9ad4, var(--hot-pink) 58%, #a81a68)',
                }}
              />
            </div>
          </div>

          {/* two cabinet buttons that actually travel */}
          <div className="flex gap-3">
            {[
              { id: 'a', color: 'var(--lime)' },
              { id: 'b', color: 'var(--cyan)' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onPointerDown={() => setPressed(b.id)}
                onPointerUp={() => setPressed(null)}
                onPointerLeave={() => setPressed(null)}
                className="cab-btn h-9 w-9 rounded-full border-[3px] border-black"
                style={{
                  background: b.color,
                  boxShadow: pressed === b.id ? '0 0 0 #000' : '3px 3px 0 #000',
                  filter: pressed === b.id ? 'brightness(0.85)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <span className="font-display text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--lime)' }}>
            ⬢ CHART YOUR FUTURE
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
    </div>
  )
}
