import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PLANS, formatPrice, FOUNDER_DEADLINE } from '../../utils/planData'
import { useLocalPrice } from '../../hooks/useLocalPrice'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// The founder ribbon — a live marquee carrying the whole offer: what it is,
// what it costs, how long is left, and a link that takes the money.
//
// THE DEADLINE IS A FIXED MOMENT, NOT "TEN DAYS FROM NOW"
// A countdown computed from page load is not a deadline, it is a lie that
// resets for every visitor: come back on day nine and it still says ten days.
// This counts toward one real instant, so the number here is the same number
// everybody else is looking at. It lives on the founder plan in planData.js,
// which is also where checkout reads it, so the ribbon cannot outlive the sale.
//
// PRICE IS INR, SHOWN LOCALLY WHERE POSSIBLE
// Rs 29,999 is what the card is charged, worldwide. A visitor abroad also sees
// their own currency, converted from a live rate and marked with a tilde,
// because an unqualified "$360" would be a price the checkout never honours.
// If the rate is unavailable they simply see rupees — nothing here invents a
// number.

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
  const local = useLocalPrice(plan?.priceINR)
  const track = useAnalytics()
  const [left, setLeft] = useState(() => timeLeft(FOUNDER_DEADLINE, Date.now()))

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(FOUNDER_DEADLINE, Date.now())), 1000)
    return () => clearInterval(id)
  }, [])

  // An expired sale renders nothing. A dead ribbon frozen at 00:00:00 is worse
  // than no ribbon — a countdown still shouting about a deadline that passed
  // reads as a site nobody maintains.
  if (!plan || !left) return null

  const inr = formatPrice(plan)
  const price = local ? `${inr} (~${local.text})` : inr

  // A quiet bar, not a hazard strip. The deadline is real, so it only needs
  // to be stated plainly: no marquee, no stripes, no ticking seconds.
  const clock = left.days > 0 ? `${left.days}d ${pad(left.hours)}h` : `${pad(left.hours)}h ${pad(left.mins)}m`

  return (
    <Link
      to="/pay?plan=founder"
      onClick={() => track(EVENTS.UPGRADE_CLICKED, { plan: 'founder', surface: 'ribbon' })}
      aria-label={`Founder offer: lifetime access for ${inr}, one payment, never expires. Ends in ${left.days} days. Claim it.`}
      className="group block border-b border-white/10 bg-black"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-[12px] text-zinc-400 sm:gap-3 sm:text-[13px]">
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium text-white">Founder offer</span>
        <span className="hidden sm:inline">Lifetime access for {price}</span>
        <span className="sm:hidden">Lifetime · {inr}</span>
        <span aria-hidden="true" className="text-zinc-600">·</span>
        <span className="tabular-nums">Ends in {clock}</span>
        <span className="font-medium text-white transition group-hover:translate-x-0.5">Claim →</span>
      </div>
    </Link>
  )
}
