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

export default function FounderRibbon({ compact = false }) {
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
  // Nor does it show while checkout is switched off: a "claim it" bar in front
  // of a page that says no payment is taken is the page contradicting itself.
  if (!plan || !left || import.meta.env.VITE_PAYMENTS_ENABLED !== 'true') return null

  const inr = formatPrice(plan)
  const price = local ? `${inr} (~${local.text})` : inr

  // A premium announcement bar: big enough to be seen at a glance, detailed
  // enough to explain the offer without a click, and calm enough to sit above
  // a quiet page. Every figure is real — the price from planData, the clock
  // counting to the one fixed deadline everyone shares.
  const units = [
    [left.days, 'Days'],
    [left.hours, 'Hrs'],
    [left.mins, 'Min'],
    [left.secs, 'Sec'],
  ]

  return (
    <Link
      to="/pay?plan=founder"
      onClick={() => track(EVENTS.UPGRADE_CLICKED, { plan: 'founder', surface: 'ribbon' })}
      aria-label={`Founder offer: lifetime access for ${inr}, one payment, never expires. Ends in ${left.days} days. Claim it.`}
      className="founder-bar group relative block overflow-hidden bg-black"
    >
      {/* soft cosmic glow + a slow light sweep */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 140% at 12% 50%, rgba(124,58,237,0.22), transparent 70%),' +
            'radial-gradient(50% 140% at 88% 50%, rgba(14,165,233,0.16), transparent 70%)',
        }}
      />
      <div aria-hidden="true" className="founder-shine absolute inset-y-0 -left-1/3 w-1/3" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #a78bfa 25%, #f0abfc 50%, #7dd3fc 75%, transparent)' }}
      />

      <div
        className={`relative mx-auto flex items-center justify-between gap-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${compact ? 'py-1.5' : 'py-2.5 md:py-3'}`}
        style={{ maxWidth: compact ? '100vw' : '72rem', paddingLeft: compact ? 24 : 20, paddingRight: compact ? 24 : 20 }}
      >
        {/* the offer */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="shrink-0 rounded-full p-px"
            style={{ background: 'linear-gradient(90deg, #a78bfa, #f0abfc, #7dd3fc)' }}
          >
            <span className="flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold text-white sm:text-xs">
              <span aria-hidden="true" className="text-[#f0abfc]">✦</span>
              <span className="hidden min-[400px]:inline">Founder edition</span><span className="min-[400px]:hidden">Founder</span>
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-white sm:text-[15px]">
              <span className="sm:hidden">{inr} lifetime</span>
              <span className="hidden sm:inline">Lifetime access for {inr}</span>
              <span className="hidden font-normal text-zinc-400 lg:inline">{local ? ` (~${local.text})` : ''}</span>
            </p>
            <p className={`truncate text-[12px] text-zinc-400 ${compact ? 'hidden' : 'hidden md:block'}`}>
              Everything in Pro, forever · one payment · never renews
            </p>
          </div>
        </div>

        {/* the clock */}
        <div className="hidden items-center gap-3 sm:flex">
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 lg:inline">Offer ends in</span>
          <div className="flex items-center gap-1.5">
            {units.map(([v, k]) => (
              <span
                key={k}
                className={`flex min-w-[40px] flex-col items-center rounded-lg border border-white/10 bg-white/[0.04] px-2 backdrop-blur ${compact ? 'py-0.5' : 'py-1'}`}
              >
                <span className="text-[15px] font-semibold leading-none tabular-nums text-white">{pad(v)}</span>
                {!compact && <span className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-500">{k}</span>}
              </span>
            ))}
          </div>
        </div>

        {/* the action */}
        <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black transition group-hover:bg-zinc-200 sm:px-4 sm:py-2 sm:text-[13px]">
          <span className="hidden sm:inline">Claim founder access</span>
          <span className="sm:hidden">{left.days}d left · Claim</span>
          <span aria-hidden="true" className="ml-1 inline-block transition group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  )
}
