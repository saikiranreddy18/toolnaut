import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUp } from './SectionShell'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

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

export default function PricingPillar({ plan }) {
  const track = useAnalytics()

  return (
    <motion.div variants={fadeUp} className={`relative ${plan.lift}`}>
      <div
        className={`sticker ${STICKER_VARIANT[plan.id] ?? ''} relative flex h-full flex-col p-7 ${plan.featured ? 'md:scale-[1.03]' : ''}`}
        onMouseEnter={() => track(EVENTS.PLAN_HOVER, { plan: plan.id })}
      >
        {plan.badge && (
          <span className="tape-label absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ fontSize: 10, padding: '5px 14px' }}>
            {plan.badge}
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
            ${plan.price}
          </span>
          <span className="text-sm font-bold text-slate-400">/month</span>
        </p>
        <p className="mt-3 text-xs text-slate-400">{plan.audience}</p>

        <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-200">
          {plan.plus && <li className="font-display font-black uppercase text-cyan-300">{plan.plus}</li>}
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span aria-hidden="true" style={{ color: plan.accent }}>✦</span>
              {f}
            </li>
          ))}
        </ul>

        <Link
          to="/quiz"
          onClick={() => track(EVENTS.PLAN_SELECT, { plan: plan.id, price: plan.price })}
          className={`nb-btn ${plan.id === 'guru' ? 'pink' : plan.id === 'pandava' ? 'cyan' : ''} mt-8 block w-full py-3 text-center text-sm`}
        >
          Reserve {plan.name} at launch
        </Link>
      </div>
    </motion.div>
  )
}
