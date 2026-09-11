import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { loadStreak } from '../../state/streakStore'
import { myStanding } from '../../utils/communityStats'

// Streak and points, in the sidebar.
//
// BOTH NUMBERS ARE REAL. The streak is the run of days this browser has
// actually opened the app, and the score is computed from things the visitor
// genuinely did — stack size, completed roadmap steps, days returned. Nothing
// here is seeded.
//
// The RANK is deliberately not shown. It exists in myStanding(), but it is a
// position against a seeded crowd, and a number like "#1,287" states a fact
// about other people that is not true yet. Streak and score make a claim only
// about you, so they can be shown without qualification. The rank belongs on
// the leaderboard, where the seeding is explained.
//
// Re-read on navigation rather than only on mount: the sidebar outlives every
// page, so a step completed on /app/learning would otherwise leave a stale
// score sitting next to it until a full reload.

function Stat({ label, value, hint, color }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-display text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-black leading-none" style={{ color }}>
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-[10px] leading-tight text-slate-500">{hint}</p>}
    </div>
  )
}

export default function StreakPoints() {
  const { pathname } = useLocation()
  const [data, setData] = useState({ streak: 0, score: 0 })

  useEffect(() => {
    try {
      const { count } = loadStreak()
      const { score } = myStanding()
      setData({ streak: Number(count) || 0, score: Number(score) || 0 })
    } catch {
      // Storage can be blocked outright. Zeroes are honest here: with no
      // storage there genuinely is no streak to report.
      setData({ streak: 0, score: 0 })
    }
  }, [pathname])

  const { streak, score } = data

  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-xl border-[3px] border-black px-3.5 py-3"
      style={{ background: '#15151f', boxShadow: '4px 4px 0 #000' }}
    >
      <Stat
        label="Streak"
        value={streak > 0 ? `${streak}${streak === 1 ? ' day' : ' days'}` : '—'}
        hint={streak > 0 ? 'keep it going' : 'starts today'}
        color="var(--hot-pink)"
      />
      <span className="h-9 w-px shrink-0 self-center bg-white/10" aria-hidden="true" />
      <Stat
        label="Points"
        value={score.toLocaleString()}
        // Half a sidebar column is ~13 characters at this size; the longer
        // wording truncated to 'from your sta…', which reads as a bug.
        hint={score > 0 ? 'stack + steps' : 'save a tool'}
        color="var(--lime)"
      />
    </div>
  )
}
