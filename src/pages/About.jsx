import { Link } from 'react-router-dom'
import { useHead } from '../utils/head'
import { motion } from 'framer-motion'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { BRAND } from '../config'
import { BUNDLED_COUNT } from '../utils/toolsCatalog'

// Counts derive from the catalogue itself. The radar publishes new tools
// daily, so every hardcoded figure here rots — this page carried three that
// disagreed with each other (700+, 704, 780+) and none matched the catalogue.
// TOOL_FLOOR rounds down to the nearest hundred so the claim stays true
// between radar syncs rather than being exact for a day and wrong after.
const TOOL_FLOOR = Math.floor(BUNDLED_COUNT / 100) * 100

// Same flag ContactSection.jsx/CapabilityMatrix.jsx/Methodology.jsx/Pricing.jsx
// already read for this — the footer tagline below was missed when payments
// shipped and kept asserting "free while in beta" even though this page's own
// "How far along are we?" answer above already states the real 7-day-trial-
// then-one-time-pass terms.
const paymentsOn = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'

// The story/pitch page — the accelerator-application answers, public.
const SECTIONS = [
  {
    q: 'What is Toolnaut?',
    a: `${BRAND} is a role-aware AI-tool discovery platform: a 60-second quiz maps your role, experience and goals to a personalized stack from ${TOOL_FLOOR}+ AI tools, plus a 4-week guided roadmap to master it — with a self-updating catalog that discovers new tools automatically every day.`,
  },
  {
    q: 'Why are we building this?',
    a: `The AI tool landscape is exploding faster than anyone can track — hundreds of new tools ship every month, yet most people default to one chatbot for everything because discovering what fits their work takes hours nobody has. Existing directories just list everything; nobody personalizes to your role, level, and available time, and nobody closes the loop from discovery to actually learning the tool. Toolnaut does both — and its automated radar keeps the catalog fresh instead of letting it rot like every other directory.`,
  },
  {
    q: 'How far along are we?',
    a: `Live in public beta. A working product — 9-question quiz → career-aware persona → personalized starter stack from a ${BUNDLED_COUNT}-tool curated catalog → 4-week learning roadmap with lessons and gated checkpoints. Behind it, an autonomous discovery pipeline monitors GitHub, Product Hunt, Hacker News and tech feeds daily, filters the noise, AI-enriches genuine new tools, and publishes them straight into the live catalog. Free for 7 days, then a one-time 30-day pass — nothing recurs.`,
  },
  {
    q: 'Who is behind it?',
    a: `Built solo by an indie builder in India, shipping fast on a near-zero budget — free-tier infrastructure, open APIs, and a lot of iteration. The product you see funds itself on curiosity.`,
  },
]

export default function About() {
  useHead({
    title: 'About Toolnaut — the role-aware AI tool map',
    description: `Why Toolnaut exists: ${TOOL_FLOOR}+ AI tools is not a shortlist. Nine questions turn the catalogue into the handful that fit how you actually work.`,
    path: '/about',
    // The Q&A below is already on the page for humans. Marking it up is what
    // lets a featured snippet or an AI assistant quote it directly instead of
    // paraphrasing the page and getting it wrong.
    //
    // Built FROM the same FAQ array that renders, so the two cannot drift —
    // schema that disagrees with the visible page is a manual action risk, not
    // just a wasted opportunity.
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: SECTIONS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  })
  return (
    <div className="relative z-10 min-h-screen bg-[#0a0a0f]">
      <div className="starfield" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link to="/" aria-label={BRAND}>
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          ⚡ Find your stack
        </Link>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 pb-24 pt-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-xs font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--lime)' }}
        >
          ▸ Our story
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="arcade-heading mt-3 text-4xl sm:text-5xl"
        >
          The AI universe,<br />mapped to you
        </motion.h1>

        <div className="mt-12 space-y-6">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.q}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05 }}
              className="sticker p-6 backdrop-blur-sm bg-black/20"
              style={{ transform: 'rotate(0)' }}
            >
              <h2 className="arcade-heading lime text-lg">{s.q.toUpperCase()}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{s.a}</p>
            </motion.section>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <Link to="/goal" className="nb-btn inline-block px-8 py-4 text-base">
            🚀 Take the 60-second quiz
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            {paymentsOn ? 'Free for 7 days, then a one-time pass' : 'Free while in beta'} · <Link to="/" className="underline underline-offset-2 hover:text-white">back home</Link>
          </p>
        </motion.div>
      </main>
    </div>
  )
}
