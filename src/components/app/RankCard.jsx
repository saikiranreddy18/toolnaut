import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_META } from '../../utils/toolsCatalog'
import { SAMPLE_LEADERBOARD, SCORING, IS_SAMPLE } from '../../utils/leaderboardData'
import { myStanding, STARTING_RANK, SEEDED, POINTS_PER_PLACE } from '../../utils/communityStats'

// Your standing, plus the board you are climbing.
//
// The split matters. The rank and score are computed from progress this app
// really tracks — tools added, roadmap steps ticked, streak — so they move when
// you do. The seven names above you are placeholders, because there are no
// accounts yet and therefore no one to actually rank against. The chip says so.
//
// A new explorer opens at #1301, one place behind the seeded community count,
// and climbs from there. That is deliberate: an empty state that says "you are
// last, here is how to move" gives the number somewhere to go, where a bare
// "#1" for the only user would be meaningless.
export default function RankCard() {
  const me = useMemo(() => myStanding(), [])

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.18em] text-white">
          Your rank
        </h2>
        {(IS_SAMPLE || SEEDED) && (
          <span
            className="rounded-full border-2 border-black px-2.5 py-0.5 font-display text-[9px] font-black uppercase tracking-[0.12em] text-black"
            style={{ background: 'var(--hot-pink)' }}
          >
            Preview — leaderboard not live yet
          </span>
        )}
      </div>

      {/* your standing */}
      <div
        className="rounded-2xl border-[3px] border-black p-5"
        style={{ background: 'linear-gradient(135deg, rgba(132,204,22,0.14), rgba(6,182,212,0.10))', boxShadow: '5px 5px 0 #000' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Rank
            </p>
            <p className="arcade-heading text-4xl" style={{ color: 'var(--lime)' }}>
              #{me.rank.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Score
            </p>
            <p className="font-display text-3xl font-black tabular-nums text-white">
              {me.score.toLocaleString()}
            </p>
          </div>
        </div>

        {me.isNew ? (
          <p className="mt-4 text-sm text-slate-300">
            Everyone starts at #{STARTING_RANK.toLocaleString()}. Tick your first roadmap step and
            you move {Math.round(SCORING.perRoadmapStep / POINTS_PER_PLACE)} places.{' '}
            <Link to="/app/learning" className="font-black underline underline-offset-4" style={{ color: 'var(--lime)' }}>
              Start the roadmap
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-300">
            {me.stackSize} tools in your stack · {me.stepsDone} roadmap steps done
            {me.streakDays > 0 && ` · ${me.streakDays}-day streak`}. You have climbed{' '}
            <span className="font-black" style={{ color: 'var(--lime)' }}>
              {(STARTING_RANK - me.rank).toLocaleString()}
            </span>{' '}
            places.
          </p>
        )}
      </div>

      {/* the board above you */}
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                {['#', 'Explorer', 'Streak', 'Score'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 font-display text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 ${i > 1 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LEADERBOARD.map((row) => {
                const meta = CATEGORY_META[row.domain] || { color: 'var(--cyan)' }
                return (
                  <tr key={row.handle} className="border-b border-white/5 last:border-b-0">
                    <td className="px-4 py-2.5 font-display text-xs font-black text-slate-500">{row.rank}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 text-sm font-bold text-white">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                        {row.handle}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400 tabular-nums">{row.streak}d</td>
                    <td className="px-4 py-2.5 text-right font-display text-sm font-black tabular-nums text-slate-200">
                      {row.score.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {SCORING.perRoadmapStep} points a roadmap step · {SCORING.perStreakDay} a streak day ·{' '}
        {SCORING.perToolInStack} a tool. Your score is real and already counting; the names above are
        placeholders until accounts land.
      </p>
    </section>
  )
}
