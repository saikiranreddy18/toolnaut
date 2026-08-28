import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { consumeLaunch } from '../../utils/launchFlag'
import { loadSession } from '../../state/authStore'
import Wordmark from '../ui/Wordmark'

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
          {/* Star streaks. They accelerate downward, which is what sells the
              rocket as RISING — the ship barely moves, the field does. */}
          <div className="absolute inset-0" aria-hidden="true">
            {Array.from({ length: 34 }, (_, i) => {
              const left = (i * 37) % 100
              const delay = (i % 11) * 0.09
              return (
                <motion.span
                  key={i}
                  className="absolute w-px rounded-full"
                  style={{
                    left: `${left}%`,
                    height: 18 + (i % 5) * 22,
                    background: 'linear-gradient(transparent, rgba(255,255,255,0.75), transparent)',
                  }}
                  initial={{ top: '-20%', opacity: 0 }}
                  animate={{ top: '120%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.75, delay, repeat: Infinity, ease: 'linear' }}
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
              {/* exhaust, drawn under the ship and flickering on its own clock
                  so the flame never looks welded to the hull */}
              <motion.div
                className="absolute left-1/2 top-full h-36 w-12 -translate-x-1/2 rounded-b-full"
                style={{
                  background: 'linear-gradient(var(--lime), var(--hot-pink) 45%, transparent)',
                  filter: 'blur(3px)',
                }}
                animate={{ scaleY: [0.7, 1.15, 0.85, 1.2], opacity: [0.85, 1, 0.9, 1] }}
                transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />

              <svg width="132" height="196" viewBox="0 0 86 128" fill="none" aria-hidden="true">
                {/* fins */}
                <path d="M22 78 L6 106 L22 100 Z" fill="var(--hot-pink)" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
                <path d="M64 78 L80 106 L64 100 Z" fill="var(--hot-pink)" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
                {/* hull */}
                <path
                  d="M43 4 C60 24 68 50 68 74 L68 100 L18 100 L18 74 C18 50 26 24 43 4 Z"
                  fill="#f5f1e8" stroke="#000" strokeWidth="5" strokeLinejoin="round"
                />
                {/* window */}
                <circle cx="43" cy="52" r="12" fill="var(--cyan)" stroke="#000" strokeWidth="5" />
                <circle cx="39" cy="48" r="3.4" fill="#fff" opacity="0.85" />
                {/* nose band */}
                <path d="M31 26 C36 18 50 18 55 26" stroke="var(--hot-pink)" strokeWidth="6" strokeLinecap="round" />
              </svg>
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
