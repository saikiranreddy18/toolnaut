import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAnalytics, useSectionView } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { catalogSize, lastUpdatedLabel } from '../../utils/catalogFreshness'

// The hero, rewritten around a work OUTCOME.
//
// It used to say "YOUR AI STACK, PERSONALIZED" over "the AI universe is
// expanding faster than any one person can track". That describes a category,
// not a result: a visitor still could not tell what they receive, how long it
// takes, or how this differs from searching. The product review called this the
// central positioning gap, and it is the one thing on the page that most
// affects whether anyone clicks.
//
// Three changes carry it:
//   - the headline names the deliverable and the time it takes
//   - a second CTA lets a sceptic inspect a real stack WITHOUT signing up,
//     because the page previously had exactly one door and it required
//     answering nine questions first
//   - a trust row answers "what does this cost me" before the click
//
// Every number in the trust row is read from the live catalogue at render time.
// A hardcoded count or date would be false the next time the radar publishes,
// and the whole point of a trust cue is that it is true.

export default function HeroSection({ onEnter }) {
  const track = useAnalytics()
  const ref = useSectionView('hero')
  const navigate = useNavigate()

  const count = catalogSize()
  const updated = lastUpdatedLabel()

  return (
    <section
      id="hero"
      ref={ref}
      // Top padding, because the block is centred in the viewport and the nav
      // is fixed over it: with nothing reserved, the headline crept up under
      // the bar as the viewport got shorter. Measured before adding it — 193px
      // of clearance at 1920x1080, 103px at 1440x900, and 10px at 390x844,
      // where the first line was all but touching the nav. Padding reserves the
      // space at every height instead of leaving it to whatever the centring
      // happens to give.
      className="pointer-events-none relative z-10 flex min-h-screen flex-col items-center justify-center px-5 pt-24 text-center sm:pt-28 md:pt-32"
    >
      {/* No centre wordmark. The name already sits top-left in the nav —
          repeating it here, larger, one viewport-height below itself, spent the
          hero's strongest position saying the thing the corner already says.
          The headline is the message; the nav logo (with its beta tag) is the
          brand. With the 2s draw-in gone, the whole cascade starts ~1.8s
          sooner, which is 1.8s less staring at an empty viewport. */}
      <motion.h1
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
        className="arcade-heading max-w-5xl text-[8.6vw] sm:text-5xl md:text-7xl leading-[0.96]"
        style={{ letterSpacing: '-0.02em' }}
      >
        BUILD THE AI WORKFLOW<br/>FOR YOUR JOB
      </motion.h1>

      {/* The time claim is the differentiator against "just search for it", so
          it gets its own line rather than being buried in the paragraph. */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.7 }}
        className="mt-4 font-display text-lg font-black uppercase tracking-[0.06em] md:text-2xl"
        style={{ color: 'var(--lime)', textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 22px rgba(0,0,0,0.9)' }}
      >
        In 10 minutes — not 10 hours of research
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="mt-6 max-w-2xl px-2 text-base font-medium leading-relaxed text-white md:text-lg"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 26px rgba(0,0,0,0.85)' }}
      >
        Tell us your role, goal, budget and current tools. Get a tailored AI
        stack, ranked picks with the reasoning shown, and a 4-week learning plan
        you can start today.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.7 }}
        className="pointer-events-auto mt-9 flex flex-col items-center gap-4 sm:flex-row"
      >
        <button
          onClick={() => {
            track(EVENTS.CTA_CLICK, { cta: 'build_my_stack', location: 'hero' })
            onEnter()
          }}
          className="nb-btn text-base px-8 py-4"
        >
          ⚡ BUILD MY AI STACK — FREE
        </button>

        {/* The escape hatch for anyone not ready to answer questions. The page
            had no way to see the product before committing, which is the
            friction the review flagged as costing the most signups. */}
        <button
          onClick={() => {
            track(EVENTS.CTA_CLICK, { cta: 'see_example_stack', location: 'hero' })
            navigate('/example')
          }}
          className="nb-btn dark text-base px-7 py-4"
        >
          SEE AN EXAMPLE STACK
        </button>
      </motion.div>

      {/* Trust row. Only claims that are true and checkable: the count and the
          date are read from the catalogue, and there is genuinely no payment
          path in the product today. Rendered on a scrim because thin text over
          a starfield is unreadable, and an unreadable trust cue is no cue. */}
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.7 }}
        className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full px-5 py-2.5 text-[12px] font-semibold text-slate-200"
        style={{ background: 'rgba(6,6,12,0.72)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <li>✓ No credit card</li>
        <li aria-hidden="true" className="text-slate-600">·</li>
        <li>✓ No account needed to see a stack</li>
        <li aria-hidden="true" className="text-slate-600">·</li>
        <li>✓ {count.toLocaleString()} tools</li>
        {updated && <li aria-hidden="true" className="text-slate-600">·</li>}
        {updated && <li>✓ Updated {updated}</li>}
      </motion.ul>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 2.2, duration: 2.6, repeat: Infinity }}
        className="absolute bottom-8 text-[11px] uppercase tracking-[0.35em] text-slate-500"
      >
        Scroll to explore
      </motion.div>
    </section>
  )
}
