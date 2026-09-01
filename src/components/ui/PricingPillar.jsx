import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUp } from './SectionShell'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { formatPrice } from '../../utils/planData'
import { useVisitorCountry } from '../../hooks/useVisitorCountry'

// Sticker-shadow color per plan so the three pillars read lime / pink / cyan.
const STICKER_VARIANT = { shishya: '', guru: 'pink', pandava: 'cyan' }

// Bold filled emblem per pack — replaces the old Devanagari glyph with a plain
// logo mark (mortarboard / bolt / group) so the plans read in any language.
const ICON_PATH = {
  student: 'M12 3 1 8l11 5 9-4.09V15h2V8L12 3ZM5 12.18V15.5c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.32l-7 3.18-7-3.18Z',
  pro: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  team: 'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19c0-2.7 3.13-4.5 7-4.5s7 1.8 7 4.5v1H2v-1Zm15.5-4.4c1.6.6 4.5 1.9 4.5 4.4v1h-4v-1c0-1.7-.7-3.1-1.8-4.2.44-.13.86-.2 1.3-.2Z',
}

function PlanIcon({ type, color }) {
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-white/5"
      style={{ boxShadow: '2px 2px 0 #000' }}
      aria-hidden="true"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d={ICON_PATH[type]} fill={color} />
      </svg>
    </span>
  )
}

export default function PricingPillar({ plan, currency = 'USD' }) {
  // Regional plans price by country; everything else ignores it.
  const country = useVisitorCountry()
  const track = useAnalytics()

  return (
    // h-full so the grid's items-stretch actually reaches the card: without it
    // this wrapper sizes to its own content and the card's h-full resolves
    // against that, leaving three different heights. plan.lift is dropped — it
    // was a negative top margin that raised the featured plan out of the very
    // row it exists to be compared across.
    <motion.div variants={fadeUp} className="relative h-full">
      <div
        className={`sticker flat ${STICKER_VARIANT[plan.id] ?? ''} relative flex h-full flex-col p-7 ${
          // No scale on the featured plan. scale() grows from the centre, so it
          // pushed PRO's top edge above STUDENT and TEAM and broke the row it is
          // meant to be compared across. The MOST POPULAR tape and the pink edge
          // already mark it, and neither moves it.
          plan.featured ? 'md:z-10' : ''
        }`}
        onMouseEnter={() => track(EVENTS.PLAN_HOVER, { plan: plan.id })}
      >
        {plan.badge && (
          <span className="tape-label absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ fontSize: 10, padding: '5px 14px' }}>
            {currency === 'INR' && plan.badgeINR ? plan.badgeINR : plan.badge}
          </span>
        )}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-[11px] font-black uppercase tracking-[0.3em] text-lime-400">{plan.tier}</p>
            <h3 className="mt-1 font-display text-2xl font-black uppercase italic text-white">{plan.name}</h3>
          </div>
          <PlanIcon type={plan.icon} color={plan.accent} />
        </div>
        <p className="mt-3 flex items-baseline gap-1">
          <span className="font-display text-5xl font-black italic text-white" style={{ textShadow: '3px 3px 0 #000' }}>
            {/* A regionally priced plan ignores the currency toggle: it has one
                real price per country, and letting the toggle quote the other
                one would show a number the checkout will not charge. */}
            {plan.currency === 'USD'
              ? formatPrice(plan, country)
              : currency === 'INR'
                ? `₹${plan.priceINR.toLocaleString('en-IN')}`
                : `$${plan.price}`}
          </span>
          {/* "/month" was a promise we do not keep. Nothing renews: there is no
              Razorpay Subscription anywhere in the codebase, and a payment buys
              a flat 30 days from activateEntitlement. Saying "per month" tells
              someone their card will be charged again, and it will not be —
              which is the kind of surprise that ends in a chargeback. */}
          <span className="text-sm font-bold text-slate-400">
            {plan.lifetime ? 'one time' : '/30 days'}
          </span>
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {plan.lifetime ? 'Pay once · never expires' : 'One payment · does not auto-renew'}
        </p>
        <p className="mt-3 text-xs text-slate-400">{plan.audience}</p>

        <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-200">
          {plan.plus && <li className="font-display font-black uppercase text-cyan-300">{plan.plus}</li>}
          {plan.features.map((f) => (
            <li key={f.text} className="flex flex-wrap items-center gap-2">
              <span aria-hidden="true" style={{ color: plan.accent }}>✦</span>
              {f.text}
              {f.status === 'planned' && (
                <span className="whitespace-nowrap rounded-full border border-slate-600 px-1.5 py-0.5 font-display text-[9px] font-black uppercase text-slate-500">
                  planned
                </span>
              )}
            </li>
          ))}
        </ul>

        <Link
          to="/goal"
          onClick={() => track(EVENTS.PLAN_SELECT, { plan: plan.id, price: plan.price })}
          className={`nb-btn ${plan.id === 'guru' ? 'pink' : plan.id === 'pandava' ? 'cyan' : ''} mt-8 block w-full py-3 text-center text-sm`}
        >
          Reserve {plan.name} at launch
        </Link>
      </div>
    </motion.div>
  )
}
