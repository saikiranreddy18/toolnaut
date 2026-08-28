import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { consumeLaunch } from '../../utils/launchFlag'
import { loadSession } from '../../state/authStore'
import Wordmark from '../ui/Wordmark'
import PixelRocket from './PixelRocket'

// The launch sequence, played on ARRIVAL.
//
// It is the answer to "you just signed up, now what": rather than dropping
// someone cold into a nine-question conversation, the rocket carries them into
// it. Roughly 2.6s, then it lifts away and the page underneath is already the
// intake — nothing navigates, so there is no second load to wait through.
//
// Two conditions, both required: the flag was armed by the sign-in click, and
// a session actually exists. The flag alone is not enough — an abandoned OAuth
// round trip would otherwise fire the rocket for someone who never signed in.
//
// Under prefers-reduced-motion the whole thing is skipped rather than shortened.
// A rocket climbing the screen is exactly the kind of large-field motion that
// setting exists to suppress.

const BEATS = [
  { at: 0, text: 'IGNITION' },
  { at: 900, text: 'LIFTOFF' },
  { at: 1750, text: 'WELCOME ABOARD' },
]

export default function ArrivalLaunch() {
  const still = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)

  useEffect(() => {
    if (!consumeLaunch()) return          // consume regardless, so it never re-arms
    if (!loadSession()) return
    if (still) return

    setPlaying(true)
    const timers = BEATS.map((b, i) => setTimeout(() => setBeat(i), b.at))
    timers.push(setTimeout(() => setPlaying(false), 2600))
    return () => timers.forEach(clearTimeout)
  }, [still])

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          key="launch"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ background: '#05060c' }}
          role="status"
          aria-label="Launching"
        >
          {/* The diamond grid the reference art sits on. Pure CSS gradients —
              two crossed sets of lines — so it costs nothing to scroll. */}
          <motion.div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              backgroundImage:
                'repeating-linear-gradient(63deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 46px),' +
                'repeating-linear-gradient(-63deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 46px)',
            }}
            animate={{ backgroundPositionY: ['0px', '92px'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />

          {/* Pixel stars, square-edged to match the ship. They fall rather than
              twinkle — the field moving downward is what sells the rocket as
              rising, since the ship itself barely travels. */}
          <div className="absolute inset-0" aria-hidden="true">
            {Array.from({ length: 26 }, (_, i) => {
              const left = (i * 37) % 100
              const delay = (i % 9) * 0.11
              const size = 4 + (i % 3) * 4
              const star = i % 3 === 0
              return (
                <motion.span
                  key={i}
                  className="absolute"
                  style={{
                    left: `${left}%`,
                    width: size,
                    height: size,
                    background: star ? 'var(--lime)' : 'rgba(255,255,255,0.55)',
                    // a plus-shaped notch turns the square into a pixel star
                    clipPath: star
                      ? 'polygon(40% 0,60% 0,60% 40%,100% 40%,100% 60%,60% 60%,60% 100%,40% 100%,40% 60%,0 60%,0 40%,40% 40%)'
                      : 'none',
                  }}
                  initial={{ top: '-10%', opacity: 0 }}
                  animate={{ top: '115%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.9, delay, repeat: Infinity, ease: 'linear' }}
                />
              )
            })}
          </div>

          {/* the glow the engine is throwing onto the field */}
          <motion.div
            className="absolute left-1/2 top-[62%] h-[46vmin] w-[46vmin] -translate-x-1/2 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,46,163,0.42), transparent 68%)',
              filter: 'blur(6px)',
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0.85], scale: [0.6, 1.15, 1] }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            aria-hidden="true"
          />

          <div className="relative flex h-full w-full items-center justify-center">
            <motion.div
              initial={{ y: 130, scale: 0.92 }}
              animate={{ y: [130, 96, -260], scale: [0.92, 1, 1.05] }}
              transition={{ duration: 2.4, times: [0, 0.36, 1], ease: [0.5, 0, 0.3, 1] }}
              className="relative"
            >
              {/* The plume, built from square bands rather than a blurred bar:
                  lime core, orange, then blue at the edges, each row narrower
                  and dimmer than the last. Blurring it would have undone the
                  pixel work directly above it. */}
              <motion.div
                className="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center"
                animate={{ scaleY: [0.82, 1.12, 0.9, 1.16], opacity: [0.9, 1, 0.93, 1] }}
                transition={{ duration: 0.24, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: 'top center' }}
                aria-hidden="true"
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const t = i / 6
                  const core = 26 - i * 3
                  const mid = core + 10
                  const outer = mid + 10
                  return (
                    <div key={i} className="relative flex items-center justify-center" style={{ height: 9 }}>
                      <span className="absolute" style={{ width: outer, height: 9, background: '#2f7fd6', opacity: 0.85 - t * 0.7 }} />
                      <span className="absolute" style={{ width: mid, height: 9, background: '#f59a2e', opacity: 0.95 - t * 0.7 }} />
                      <span className="absolute" style={{ width: core, height: 9, background: 'var(--lime)', opacity: 1 - t * 0.75 }} />
                    </div>
                  )
                })}
              </motion.div>

              <PixelRocket width={150} />
            </motion.div>

            <div className="absolute bottom-[14%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
              <span className="text-2xl md:text-3xl">
                <Wordmark />
              </span>
              <AnimatePresence mode="wait">
                <motion.p
                  key={beat}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24 }}
                  className="font-display text-xs font-black uppercase tracking-[0.3em]"
                  style={{ color: 'var(--lime)' }}
                >
                  {BEATS[beat].text}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
