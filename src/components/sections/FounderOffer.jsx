import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { explorerCount } from '../../utils/explorerCount'

// Founder discount — the golden ribbon on the landing page.
//
// THE DEADLINE IS A FIXED DATE, NOT "TEN DAYS FROM NOW"
// A countdown computed from load time is not a sale, it is a lie that resets
// for every visitor and every deploy: someone who comes back on day nine still
// sees ten days left. This counts toward one real moment, so the number a
// visitor sees is the same number everybody else sees. Move the sale by editing
// this one line.
export const FOUNDER_DEADLINE = '2026-09-10T00:00:00Z'
export const FOUNDER_PRICE = 299

// Whole units left until `to`, or null once it has passed.
function timeLeft(to, now) {
  const ms = Date.parse(to) - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const s = Math.floor(ms / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  }
}

const pad = (n) => String(n).padStart(2, '0')

export default function FounderOffer() {
  const [left, setLeft] = useState(() => timeLeft(FOUNDER_DEADLINE, Date.now()))
  const [explorers, setExplorers] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(FOUNDER_DEADLINE, Date.now())), 1000)
    return () => clearInterval(id)
  }, [])

  // Real count or nothing. Same rule the stats strip already follows: a number
  // on a landing page is a claim, and an unavailable one is not a licence to
  // invent it. null means the count is genuinely unknown.
  useEffect(() => {
    let alive = true
    explorerCount().then((n) => { if (alive && n !== null) setExplorers(n) })
    return () => { alive = false }
  }, [])

  // An expired sale renders nothing rather than a dead banner counting 00:00:00
  // — the offer is over, and saying so forever is worse than saying nothing.
  if (!left) return null

  const units = [
    { v: left.days, k: 'days' },
    { v: left.hours, k: 'hrs' },
    { v: left.mins, k: 'min' },
    { v: left.secs, k: 'sec' },
  ]

  return (
    <section aria-labelledby="founder-offer" className="px-5 py-6 sm:py-8">
      <div
        className="relative mx-auto flex max-w-4xl flex-col gap-5 overflow-hidden rounded-2xl border-2 border-black p-5 sm:p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,222,46,0.14), rgba(255,140,46,0.10) 55%, rgba(255,222,46,0.06))',
          borderColor: 'var(--arcade-yellow)',
          boxShadow: '4px 4px 0 #000',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest text-black"
            style={{ background: 'linear-gradient(90deg, var(--arcade-yellow), var(--arcade-orange))' }}
          >
            {/* the dot carries "live"; the word says it too, so a viewer who
                cannot see the pulse loses nothing */}
            <span className="h-2 w-2 animate-pulse rounded-full bg-black" aria-hidden="true" />
            Flash sale live
          </span>
          {explorers !== null && (
            <span className="text-xs font-semibold text-slate-300">
              {explorers.toLocaleString()} explorers already aboard
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="founder-offer" className="arcade-heading text-2xl sm:text-3xl" style={{ color: 'var(--arcade-yellow)' }}>
              FOUNDER DISCOUNT
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Lifetime access — pay once, keep it.
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl font-black text-white sm:text-5xl">${FOUNDER_PRICE}</span>
              <span className="font-display text-xs font-black uppercase tracking-widest text-slate-400">one time</span>
            </p>
          </div>

          <div className="shrink-0">
            <p className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Offer ends in
            </p>
            {/* aria-hidden because a live region that re-announces four numbers
                every second makes the page unusable with a screen reader. The
                deadline is stated once, in text, underneath. */}
            <div className="mt-2 flex gap-2" aria-hidden="true">
              {units.map((u) => (
                <div
                  key={u.k}
                  className="flex min-w-[3.25rem] flex-col items-center rounded-xl border-2 border-black bg-black/50 px-2 py-1.5"
                >
                  <span className="font-display text-xl font-black tabular-nums text-white sm:text-2xl">
                    {pad(u.v)}
                  </span>
                  <span className="font-display text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {u.k}
                  </span>
                </div>
              ))}
            </div>
            <p className="sr-only">
              This founder offer closes on {new Date(FOUNDER_DEADLINE).toUTCString()}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/goal" className="nb-btn px-6 py-3 text-sm">
            CLAIM FOUNDER PRICE →
          </Link>
          <span className="text-[11px] text-slate-400">
            No account needed to see your stack first.
          </span>
        </div>
      </div>
    </section>
  )
}
