import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PLANS, formatPrice } from '../../utils/planData'
import { useLocalPrice } from '../../hooks/useLocalPrice'

// The founder ribbon — a live marquee carrying the whole offer: what it is,
// what it costs, how long is left, and a link that takes the money.
//
// THE DEADLINE IS A FIXED MOMENT, NOT "TEN DAYS FROM NOW"
// A countdown computed from page load is not a deadline, it is a lie that
// resets for every visitor: come back on day nine and it still says ten days.
// This counts toward one real instant, so the number here is the same number
// everybody else is looking at.
//
// PRICE IS INR, SHOWN LOCALLY WHERE POSSIBLE
// Rs 29,999 is what the card is charged, worldwide. A visitor abroad also sees
// their own currency, converted from a live rate and marked with a tilde,
// because an unqualified "$360" would be a price the checkout never honours.
// If the rate is unavailable they simply see rupees — nothing here invents a
// number.
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
  const local = useLocalPrice(plan?.priceINR)
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

  // A chunky black chip per unit. tabular-nums so ticking seconds do not shove
  // the text beside them a pixel left and right every second.
  const Clock = () => (
    <span className="inline-flex items-center gap-1">
      {[[left.days, 'D'], [left.hours, 'H'], [left.mins, 'M'], [left.secs, 'S']].map(([v, k]) => (
        <span
          key={k}
          className="rounded-[4px] bg-black px-1.5 py-0.5 font-black tabular-nums"
          style={{ color: 'var(--arcade-yellow)' }}
        >
          {pad(v)}<span className="opacity-50">{k}</span>
        </span>
      ))}
    </span>
  )

  const message = (
    <span className="flex items-center gap-3 whitespace-nowrap px-5">
      <span className="rounded-[4px] bg-black px-2 py-0.5" style={{ color: 'var(--arcade-yellow)' }}>FOUNDER</span>
      <span>Lifetime access · {price}</span>
      <span aria-hidden="true">✦</span>
      <span>Pay once, never expires</span>
      <span aria-hidden="true">✦</span>
      <span className="flex items-center gap-1.5">Ends in <Clock /></span>
      <span aria-hidden="true">✦</span>
      <span className="rounded-full border-2 border-black px-3 py-0.5">CLAIM IT →</span>
    </span>
  )

  return (
    <Link
      to="/pay?plan=founder"
      aria-label={`Founder offer: lifetime access for ${inr}, one payment, never expires. Ends in ${left.days} days. Claim it.`}
      className="group relative block"
    >
      {/* Skewed and over-wide so the ends run off screen — a strip of tape
          slapped across the page rather than a tidy bar sitting in a slot. The
          rotation is what stops it reading as another navigation row. */}
      <div className="relative -mx-4 overflow-hidden border-y-[3px] border-black py-3 sm:py-3.5 [transform:rotate(-0.6deg)_scale(1.03)]">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, var(--arcade-yellow), var(--arcade-orange) 50%, var(--arcade-yellow))' }}
          aria-hidden="true"
        />
        {/* Hazard stripes — the visual language of a deadline. Kept faint so
            the words stay the thing you actually read. */}
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #000 0 10px, transparent 10px 20px)' }}
          aria-hidden="true"
        />
        {/* aria-hidden on the moving copy: the accessible name above states the
            whole offer once, and a screen reader should not have to chase a
            scrolling strip or hear the seconds re-announced every tick. */}
        <div
          className="relative flex text-[13px] font-black uppercase tracking-wider text-black sm:text-[15px]"
          aria-hidden="true"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex shrink-0 items-center [animation:founder-marquee_32s_linear_infinite] motion-reduce:[animation:none]"
            >
              {message}
              {message}
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}
