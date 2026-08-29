import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SectionShell, { fadeUp, stagger } from '../ui/SectionShell'
import { TOOLS, SOURCE_CATEGORIES } from '../../utils/toolsCatalog'
import { QUESTIONS } from '../../utils/quizLogic'
import { SUBSCRIBERS, conversionLabel, SEEDED } from '../../utils/communityStats'
import { explorerCount } from '../../utils/explorerCount'

// Two rows, kept apart on purpose.
//
// The top row is COUNTED — TOOLS.length is read at render, and liveCatalog's
// hydrateCatalog() merges the radar's nightly finds into that same array before
// the app paints, so the figure grows on its own and cannot drift the way a
// hardcoded number would. Same for categories and questions: change the source
// files and these follow.
//
// The bottom row is mixed now, and each tile says which it is. Explorers is
// COUNTED — public.explorer_count() over one row per signed-up account, marked
// "live count" — and disappears entirely rather than guessing when the count
// cannot be read. Subscribers and conversion are still seeded, because there is
// no billing to count, and the "preview figures" chip is wired to whether any
// seeded tile is actually on screen rather than to a constant.
//
// The two rows stay separate for the original reason: a real number standing
// next to an invented one inherits its credibility problem.
export default function StatsSection() {
  const counted = [
    { n: TOOLS.length.toLocaleString(), k: 'AI tools mapped' },
    { n: SOURCE_CATEGORIES.length, k: 'Categories' },
    { n: QUESTIONS.length, k: 'Questions asked' },
    { n: '4', k: 'Week roadmap' },
  ]

  // Explorers is now COUNTED, not seeded: public.explorer_count() over one row
  // per signed-up account. null means the count is genuinely unknown — the
  // migration has not been run, or the request failed — and it renders as
  // nothing rather than falling back to the invented 1,300. A number on a
  // landing page is a claim; an unavailable one is not a licence to make it up.
  const [explorers, setExplorers] = useState(null)
  useEffect(() => {
    let alive = true
    explorerCount().then((n) => { if (alive && n !== null) setExplorers(n) })
    return () => { alive = false }
  }, [])

  const community = [
    explorers !== null && { n: explorers.toLocaleString(), k: 'Explorers', real: true },
    { n: SUBSCRIBERS.toLocaleString(), k: 'Subscribers' },
    { n: conversionLabel(), k: 'Conversion' },
  ].filter(Boolean)

  // The preview chip belongs to whatever is still seeded. Once explorers is
  // real, it must not sit over the top of it implying otherwise.
  const anySeeded = SEEDED && community.some((s) => !s.real)

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
          {counted.map((s) => (
            <motion.div
              key={s.k}
              variants={fadeUp}
              className="rounded-2xl border-[3px] border-black bg-[#12121c]/80 px-4 py-6 text-center"
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              <p className="arcade-heading text-3xl md:text-4xl" style={{ color: 'var(--lime)' }}>
                {s.n}
              </p>
              <p className="mt-2 font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                {s.k}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div variants={fadeUp} className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
            <span
              className="rounded-full border-2 border-black px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.2em] text-slate-300"
              style={{ background: '#12121c' }}
            >
              The community
            </span>
            {anySeeded && (
              <span
                className="rounded-full border-2 border-black px-2.5 py-0.5 font-display text-[9px] font-black uppercase tracking-[0.12em] text-black"
                style={{ background: 'var(--hot-pink)' }}
              >
                Preview figures
              </span>
            )}
          </div>

          <div className={`grid gap-4 ${community.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {community.map((s) => (
              <div
                key={s.k}
                className="rounded-2xl border-[3px] border-black px-3 py-5 text-center"
                style={{ background: '#12121c', boxShadow: '3px 3px 0 #000' }}
              >
                <p className="font-display text-2xl font-black tabular-nums text-white md:text-3xl">{s.n}</p>
                <p className="mt-1.5 font-display text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  {s.k}
                </p>
                {s.real && (
                  <p className="mt-1 font-display text-[8px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--lime)' }}>
                    Live count
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </SectionShell>
  )
}
