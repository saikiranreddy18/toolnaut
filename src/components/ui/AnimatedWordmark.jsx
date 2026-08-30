import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { LEMNISCATE, LEM_LENGTH } from './lemniscate'

// The hero logo reveal: the mark draws itself.
//
// The infinity is animated by stroke-dashoffset rather than by fading in, so it
// LOOKS DRAWN — a single continuous line tracing itself, which is the whole
// point of a mark that has no start and no end. Fading would have been half the
// work and none of the idea.
//
// Naut used to land on the mark once the line closed. At hero size his head
// filled the gap between the two loops and the openings read as eyes — the
// lockup stopped being a wordmark and became a single creature. The mascot
// still belongs beside the name in the nav lockup, just not inside the glyph.
//
// Under prefers-reduced-motion the mark renders complete, with no motion.



export default function AnimatedWordmark({ className = '' }) {
  const glowId = `hero-glow-${useId().replace(/:/g, '')}`
  const still = useReducedMotion()

  const letter = (delay) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.5, ease: 'easeOut' },
        }

  return (
    <span
      role="img"
      aria-label="Toolnaut"
      className={`relative inline-flex items-center whitespace-nowrap font-display font-black italic ${className}`}
    >
      <motion.span aria-hidden="true" {...letter(0.15)}>T</motion.span>

      <span className="relative inline-block" style={{ width: '1.72em', height: '1.03em', margin: '0 0.02em' }}>
        <svg
          viewBox="0 0 200 120"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            d={LEMNISCATE}
            fill="none"
            stroke="var(--lime)"
            strokeWidth="21"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
            initial={still ? false : { strokeDasharray: LEM_LENGTH, strokeDashoffset: LEM_LENGTH }}
            animate={still ? false : { strokeDashoffset: 0 }}
            transition={{ delay: 0.5, duration: 1.15, ease: 'easeInOut' }}
          />
        </svg>

      </span>

      <motion.span aria-hidden="true" {...letter(0.3)}>lnaut</motion.span>
    </span>
  )
}
