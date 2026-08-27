import { motion } from 'framer-motion'
import SectionShell, { fadeUp, stagger } from '../ui/SectionShell'
import { TOOLS, SOURCE_CATEGORIES } from '../../utils/toolsCatalog'
import { QUESTIONS } from '../../utils/quizLogic'

// The numbers, counted rather than typed.
//
// TOOLS.length is read at render, and liveCatalog's hydrateCatalog() merges the
// radar's nightly finds into that same array before the app paints — so this
// figure grows on its own as the pipeline publishes, and can never drift from
// the catalogue the way a hardcoded "704" would. Same for the category and
// question counts: change quizLogic and this follows.
export default function StatsSection() {
  const stats = [
    { n: TOOLS.length.toLocaleString(), k: 'AI tools mapped' },
    { n: SOURCE_CATEGORIES.length, k: 'Categories' },
    { n: QUESTIONS.length, k: 'Questions asked' },
    { n: '4', k: 'Week roadmap' },
  ]

  return (
    <SectionShell id="numbers">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4"
      >
        {stats.map((s) => (
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
      </motion.div>
    </SectionShell>
  )
}
