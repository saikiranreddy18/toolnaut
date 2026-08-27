import { motion } from 'framer-motion'
import { BRAND } from '../../config'
import AnimatedWordmark from '../ui/AnimatedWordmark'
import { useAnalytics, useSectionView } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

export default function HeroSection({ onEnter }) {
  const track = useAnalytics()
  const ref = useSectionView('hero')

  return (
    <section id="hero" ref={ref} className="pointer-events-none relative z-10 flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: -18 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 18 }}
        className="mb-5"
      >
        <span className="tape-label" style={{ fontSize: 11 }}>✦ LAUNCHING SOON ✦</span>
      </motion.div>

      {/* The wordmark draws itself and Naut lands on it. This replaced a
          letter-by-letter fade of the name in spaced cyan caps — which spelled
          the brand without ever showing the mark. */}
      <div className="mb-7 mt-6 flex justify-center">
        <AnimatedWordmark className="text-4xl text-white sm:text-5xl md:text-6xl" />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.8, ease: 'easeOut' }}
        className="arcade-heading max-w-5xl text-[10vw] sm:text-6xl md:text-8xl leading-[0.94]"
        style={{ letterSpacing: '-0.02em' }}
      >
        YOUR AI STACK,<br/>PERSONALIZED
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6, duration: 0.7 }}
        className="mt-7 max-w-2xl px-2 text-base font-medium leading-relaxed text-white md:text-lg"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 26px rgba(0,0,0,0.85)' }}
      >
        The AI universe is expanding faster than any one person can track.
        {' '}{BRAND} maps it to your role — for students building their edge and
        professionals with no time to fall behind.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.9, duration: 0.7 }}
        className="pointer-events-auto mt-10 flex flex-col items-center gap-5"
      >
        <button
          onClick={() => {
            track(EVENTS.CTA_CLICK, { cta: 'find_your_stack', location: 'hero' })
            onEnter()
          }}
          className="nb-btn text-base px-8 py-4"
        >
          ⚡ FIND YOUR STACK IN 60S
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 4, duration: 2.6, repeat: Infinity }}
        className="absolute bottom-8 text-[11px] uppercase tracking-[0.35em] text-slate-500"
      >
        Scroll to explore
      </motion.div>
    </section>
  )
}
