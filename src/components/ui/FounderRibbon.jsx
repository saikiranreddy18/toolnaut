import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PLANS } from '../../utils/planData'
import { useVisitorCountry } from '../../hooks/useVisitorCountry'

// The founder ribbon — a live marquee carrying the whole offer: what it is,
// what it costs, how long is left, and a link that actually takes the money.
//
// THE DEADLINE IS A FIXED MOMENT, NOT "TEN DAYS FROM NOW"
// A countdown computed from page load is not a deadline, it is a lie that
// resets for every visitor: come back on day nine and it still says ten days.
// This counts toward one real instant, so the number on this ribbon is the same
// number everyone else is looking at. Same rule FounderOffer already followed —
// and the constant lives there, so the two can never drift apart.
//
// PRICE AND CURRENCY COME FROM PLANS
// Not literals. The founder plan is the only one billed in USD, so a hardcoded
// rupee symbol here would contradict what the card is actually charged. Reading
// the plan means the ribbon cannot disagree with the checkout.
//
// NOT SHOWN IN INDIA
// The offer is not sold there, and advertising something a visitor cannot buy
// is worse than not advertising it. The server refuses it regardless — this
// only avoids the dead end.
export const FOUNDER_DEADLINE = '2026-09-10T00:00:00Z'

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

export default function FounderRibbon() {
  const plan = PLANS.find((p) => p.id === 'founder')
  const country = useVisitorCountry()
  const [left, setLeft] = useState(() => timeLeft(FOUNDER_DEADLINE, Date.now()))

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(FOUNDER_DEADLINE, Date.now())), 1000)
    return () => clearInterval(id)
  }, [])

  // An expired sale renders nothing. A dead ribbon frozen at 00:00:00 is worse
  // than no ribbon, and a countdown that has run out still shouting about a
  // deadline reads as a site nobody maintains.
  if (!plan || !left) return null
  // Excluded countries see nothing. Undetermined country still sees it: the
  // server is the gate, and hiding the offer from everyone whose geo lookup is
  // slow would cost real sales to protect nothing.
  if (country && plan.excludeCountries?.includes(country)) return null

  const clock = `${left.days}d ${pad(left.hours)}:${pad(left.mins)}:${pad(left.secs)}`

  // One message, repeated. Duplicated because a marquee needs a second copy to
  // slide into view as the first leaves — without it the strip goes blank for
  // half of every loop.
  const message = (
    <>
      <span className="font-black" style={{ color: 'var(--arcade-yellow)' }}>FOUNDER OFFER</span>
      <span className="opacity-60">·</span>
      <span>Lifetime access for ${plan.price}</span>
      <span className="opacity-60">·</span>
      <span>One payment, never expires</span>
      <span className="opacity-60">·</span>
      {/* tabular-nums so the seconds ticking does not shift the text beside it */}
      <span className="tabular-nums">Ends in {clock}</span>
      <span className="opacity-60">·</span>
      <span className="underline underline-offset-2">Claim it →</span>
    </>
  )

  return (
    <Link
      to="/pay?plan=founder"
      aria-label={`Founder offer: lifetime access for ${plan.price} US dollars, one payment, never expires, ends in ${left.days} days. Claim it.`}
      className="group relative block overflow-hidden border-y-2 border-black"
      style={{ background: 'linear-gradient(90deg, var(--arcade-yellow), var(--arcade-orange) 50%, var(--arcade-yellow))' }}
    >
      {/* aria-hidden on the moving copy: the accessible name above states the
          whole offer once, and a screen reader should not have to chase a
          scrolling strip or hear the seconds re-announced. */}
      <div className="flex py-2 text-[11px] font-black uppercase tracking-widest text-black sm:text-xs" aria-hidden="true">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-3 whitespace-nowrap px-4 [animation:founder-marquee_28s_linear_infinite] motion-reduce:[animation:none]"
          >
            {message}
            <span className="opacity-60">·</span>
            {message}
          </div>
        ))}
      </div>
    </Link>
  )
}
