import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUp, stagger } from '../ui/SectionShell'
import { BRAND } from '../../config'
import Wordmark from '../ui/Wordmark'
import { useAnalytics, useSectionView } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { loadSession } from '../../state/authStore'

const CONTACT_EMAIL = 'hello@toolnaut.app'

export default function CTASection() {
  const track = useAnalytics()
  const ref = useSectionView('cta')
  // A signed-out visitor has no stack yet — "map your stack" below means the
  // quiz, not the (session-gated) app, or this button breaks its own promise.
  const openTarget = loadSession() ? '/app/stack' : '/goal'

  return (
    <section id="cta" ref={ref} className="relative z-10">
      {/* CTA hero — stays on the galaxy, as before */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
        className="mx-auto flex max-w-6xl flex-col items-center px-5 py-24 text-center md:py-32"
      >
        <motion.div variants={fadeUp} className="mb-6 flex justify-center">
          <span className="tape-label text-xs">✦ last call, explorer ✦</span>
        </motion.div>

        <motion.h2 variants={fadeUp} className="arcade-heading mx-auto max-w-3xl text-4xl md:text-6xl">
          Ready to Find Your AI Stack?
        </motion.h2>

        <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-xl text-slate-300">
          {BRAND} is live. Map your stack in about 60 seconds — no signup wall
          to get your first chart.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex justify-center">
          <Link
            to={openTarget}
            onClick={() => track(EVENTS.CTA_CLICK, { cta: 'open_app', location: 'final_cta' })}
            className="nb-btn inline-block px-8 py-4 text-base"
          >
            🚀 Open the app
          </Link>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-4 text-sm text-slate-500">
          No credit card. No commitment.
        </motion.p>
      </motion.div>

      {/* Contact / footer — the ONLY part with the grey ref2 stage + glitch app name */}
      <footer id="contact" data-galaxy-block className="relative overflow-hidden">
        {/* grey backdrop (vignette + scanlines) masked to FADE IN from the galaxy
            over the top ~220px, so there's no hard seam where they meet */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 7px), radial-gradient(120% 120% at 50% 60%, #16161a 0%, #0d0d10 55%, #08080a 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 120px)',
            maskImage: 'linear-gradient(to bottom, transparent 0, #000 120px)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-40 text-center">
          {/* giant chromatic glitch app name — the ref2 centerpiece, here only */}
          <p
            aria-hidden="true"
            data-text={BRAND}
            className="glitch-outline select-none whitespace-nowrap text-[clamp(2.75rem,12vw,10rem)]"
          >
            {BRAND}
          </p>

          <div className="mx-auto mt-14 flex max-w-4xl flex-col items-center gap-6 border-t border-white/10 pt-8 md:flex-row md:justify-between">
            <Wordmark className="text-base text-white" />
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-white">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={() => track(EVENTS.CTA_CLICK, { cta: 'contact', location: 'footer' })}
                className="transition-colors hover:text-cyan-300"
              >
                Contact
              </a>
              <a href="#how-it-works" className="transition-colors hover:text-cyan-300">How it works</a>
              <Link to="/pricing" className="transition-colors hover:text-cyan-300">Pricing</Link>
              <Link to="/about" className="transition-colors hover:text-cyan-300">About</Link>
            </nav>
          </div>
          <p className="mt-8 font-display text-xs font-bold uppercase tracking-widest text-slate-500">
            © {new Date().getFullYear()} {BRAND}. All rights reserved.
          </p>
        </div>
      </footer>
    </section>
  )
}
