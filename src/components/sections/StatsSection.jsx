import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SectionShell, { fadeUp, stagger } from '../ui/SectionShell'
import { TOOLS, SOURCE_CATEGORIES } from '../../utils/toolsCatalog'
import { QUESTIONS } from '../../utils/quizLogic'
import { explorerCount } from '../../utils/explorerCount'
import { subscriberCount, conversionPercent } from '../../utils/subscriberCount'

// Two rows, both counted.
//
// The top row describes the product: TOOLS.length is read at render, and
// liveCatalog's hydrateCatalog() merges the radar's nightly finds into that
// same array before the app paints, so the figure grows on its own. Same for
// categories and questions: change the source files and these follow.
//
// The bottom row describes the community, and every tile is now read from the
// database. It used to show "84 subscribers" and "6.5% conversion", typed in as
// placeholders under a "preview figures" chip. Explorers comes from
// public.explorer_count(), subscribers from public.subscriber_count() (active
// paid plans, trials excluded), and conversion is the ratio of the two.
//
// A tile whose number cannot be read is not shown. null means unknown, never
// zero, and there is no fallback figure: a number on a landing page is a claim,
// and an unavailable one is not a licence to make one up. Conversion needs
// both counts, so it disappears if either does.

// The neon edge: a lime-to-cyan gradient running round the border, drawn with
// the padding-box / border-box background trick so it follows the rounded
// corners exactly. The hard black offset shadow stays, so these still read as
// the same arcade cards as everything else on the page.
const NEON_CARD = {
  border: '3px solid transparent',
  background:
    'linear-gradient(#12121c, #12121c) padding-box, ' +
    'linear-gradient(135deg, var(--lime) 0%, var(--cyan) 100%) border-box',
  boxShadow: '0 10px 28px -14px rgba(0,0,0,0.7), 0 0 18px -6px rgba(138, 180, 255, 0.45)',
}

function StatCard({ n, k, live }) {
  return (
    <motion.div variants={fadeUp} className="rounded-2xl px-4 py-6 text-center" style={NEON_CARD}>
      <p className="arcade-heading text-3xl md:text-4xl" style={{ color: 'var(--lime)' }}>{n}</p>
      <p className="mt-2 font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{k}</p>
      {live && (
        <p className="mt-1 font-display text-[8px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--cyan)' }}>
          Live count
        </p>
      )}
    </motion.div>
  )
}

export default function StatsSection() {
  const counted = [
    { n: TOOLS.length.toLocaleString(), k: 'AI tools mapped' },
    { n: SOURCE_CATEGORIES.length, k: 'Categories' },
    { n: QUESTIONS.length, k: 'Questions asked' },
    { n: '4', k: 'Week roadmap' },
  ]

  const [explorers, setExplorers] = useState(null)
  const [subscribers, setSubscribers] = useState(null)
  useEffect(() => {
    let alive = true
    explorerCount().then((n) => { if (alive && n !== null) setExplorers(n) })
    subscriberCount().then((n) => { if (alive && n !== null) setSubscribers(n) })
    return () => { alive = false }
  }, [])

  const rate = conversionPercent(subscribers, explorers)
  const community = [
    explorers !== null && { n: explorers.toLocaleString(), k: 'Explorers' },
    subscribers !== null && { n: subscribers.toLocaleString(), k: 'Subscribers' },
    rate !== null && { n: `${rate.toFixed(1)}%`, k: 'Conversion' },
  ].filter(Boolean)

  const communityCols = community.length >= 3 ? 'grid-cols-3' : community.length === 2 ? 'grid-cols-2' : 'mx-auto max-w-xs grid-cols-1'

  return (
    <SectionShell id="numbers">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="mx-auto max-w-4xl"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {counted.map((s) => <StatCard key={s.k} n={s.n} k={s.k} />)}
        </div>

        {community.length > 0 && (
          <motion.div variants={fadeUp} className="mt-10">
            <div className="mb-3 flex justify-center">
              <span
                className="rounded-full border border-white/10 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.2em] text-slate-300"
                style={{ background: '#12121c' }}
              >
                The community
              </span>
            </div>
            <div className={`grid gap-4 ${communityCols}`}>
              {community.map((s) => <StatCard key={s.k} n={s.n} k={s.k} live />)}
            </div>
          </motion.div>
        )}
      </motion.div>
    </SectionShell>
  )
}
