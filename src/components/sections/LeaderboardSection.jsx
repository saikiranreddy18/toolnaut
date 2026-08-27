import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SectionShell, { fadeUp, stagger } from '../ui/SectionShell'
import { CATEGORY_META } from '../../utils/toolsCatalog'
import { SAMPLE_LEADERBOARD, SCORING, IS_SAMPLE } from '../../utils/leaderboardData'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// Every row here is invented, and the badge says so.
//
// A leaderboard is the most credible-looking thing a pre-launch product can put
// on a landing page — a visitor reading these handles has no way to know they
// are placeholders. It ships behind a visible "Sample" chip so the page is not
// quietly claiming a userbase that does not exist. The chip comes off when the
// scores are real, which is a one-line change in leaderboardData.js.
export default function LeaderboardSection() {
  const track = useAnalytics()

  return (
    <SectionShell id="leaderboard">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
        className="mx-auto max-w-3xl"
      >
        <motion.div variants={fadeUp} className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <span className="tape-label text-xs">✦ the climb ✦</span>
          {IS_SAMPLE && (
            <span
              className="rounded-full border-2 border-black px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.14em] text-black"
              style={{ background: 'var(--hot-pink)', boxShadow: '2px 2px 0 #000' }}
            >
              Sample — not real users yet
            </span>
          )}
        </motion.div>

        <motion.h2 variants={fadeUp} className="arcade-heading mx-auto max-w-2xl text-center text-3xl md:text-5xl">
          Learning, Scored
        </motion.h2>

        <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-center text-slate-300">
          Points come from finishing, not collecting: {SCORING.perRoadmapStep} a roadmap step,
          {' '}{SCORING.perStreakDay} a streak day, {SCORING.perToolInStack} a tool in your stack.
          A stack of thirty untouched tools loses to someone who actually did the work.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-10 overflow-hidden rounded-2xl border-[3px] border-black bg-[#12121c]/80"
          style={{ boxShadow: '6px 6px 0 #000' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-white/10">
                  {['#', 'Explorer', 'Persona', 'Streak', 'Score'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-display text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 ${i > 2 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_LEADERBOARD.map((row) => {
                  const meta = CATEGORY_META[row.domain] || { color: 'var(--cyan)' }
                  const top = row.rank <= 3
                  return (
                    <tr key={row.handle} className="border-b border-white/5 last:border-b-0">
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-black"
                          style={
                            top
                              ? { background: 'var(--lime)', color: '#000', border: '2px solid #000' }
                              : { color: 'var(--muted, #94a3b8)' }
                          }
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-bold text-white">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                          {row.handle}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{row.persona}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">{row.streak}d</td>
                      <td
                        className="px-4 py-3 text-right font-display text-sm font-black tabular-nums"
                        style={{ color: top ? 'var(--lime)' : '#cbd5e1' }}
                      >
                        {row.score.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-slate-400">
          Scores go live with accounts. Your progress is already being tracked in this browser —{' '}
          <Link
            to="/goal"
            onClick={() => track(EVENTS.CTA_CLICK, { cta: 'open_app', location: 'leaderboard' })}
            className="font-black underline underline-offset-4 hover:text-white"
            style={{ color: 'var(--lime)' }}
          >
            start building a stack
          </Link>{' '}
          and it counts from day one.
        </motion.p>
      </motion.div>
    </SectionShell>
  )
}
