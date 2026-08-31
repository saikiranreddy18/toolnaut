import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import PricingPillar from '../ui/PricingPillar'
import { PLANS, COMPARISON } from '../../utils/planData'
import { initialCurrency, fetchCountry, savedCurrency, saveCurrency } from '../../utils/region'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import FounderPayButton from './FounderPayButton'

function Cell({ value }) {
  if (value === true) return <span className="text-exus-lime" aria-label="included">✓</span>
  if (value === false) return <span className="text-slate-600" aria-label="not included">✕</span>
  if (value === 'planned') {
    return (
      <span
        className="whitespace-nowrap rounded-full border border-slate-600 px-1.5 py-0.5 font-display text-[9px] font-black uppercase text-slate-500"
        aria-label="planned, not yet built"
      >
        planned
      </span>
    )
  }
  return <span className="text-slate-200">{value}</span>
}

export default function PricingSection({ titleAs = 'h2' }) {
  // Regional pricing: India pays in rupees, everyone else in dollars.
  // First paint uses the synchronous answer (saved choice, else timezone);
  // the edge country then confirms or corrects it — but never overrides a
  // choice the person made themselves, because detection is a guess and a
  // VPN or an NRI's card proves it wrong. The ₹/$ switch is that escape.
  const [currency, setCurrency] = useState(initialCurrency)
  useEffect(() => {
    if (savedCurrency()) return
    let alive = true
    fetchCountry().then((c) => {
      if (alive && c) setCurrency(c === 'IN' ? 'INR' : 'USD')
    })
    return () => { alive = false }
  }, [])
  const pick = (cur) => { setCurrency(cur); saveCurrency(cur) }

  const [compare, setCompare] = useState(false)
  const track = useAnalytics()

  return (
    <SectionShell id="pricing" eyebrow="Pricing" titleAs={titleAs} title="Start solo. Scale with your team.">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prices in</span>
        {[['INR', '₹ INR'], ['USD', '$ USD']].map(([cur, label]) => (
          <button
            key={cur}
            onClick={() => pick(cur)}
            aria-pressed={currency === cur}
            className={`arcade-chip press min-h-8 cursor-pointer ${currency === cur ? 'on' : ''}`}
            style={{ fontSize: 10 }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-8 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PricingPillar key={plan.id} plan={plan} currency={currency} />
        ))}
      </div>

      {/* Founder lifetime offer. Separate from the pillars above on purpose:
          Razorpay Standard Checkout takes a ONE-TIME payment, so attaching it
          to a monthly plan would charge once and imply forever. */}
      <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center text-center">
        <FounderPayButton />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 text-center">
        <button
          onClick={() => {
            setCompare((c) => !c)
            track(EVENTS.CTA_CLICK, { cta: 'compare_all', location: 'pricing' })
          }}
          className="nb-btn dark px-6 py-2.5 text-sm"
          aria-expanded={compare}
        >
          {compare ? 'Hide comparison' : 'Compare all plans'}
        </button>
      </motion.div>

      <AnimatePresence>
        {compare && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="sticker mt-8 overflow-x-auto p-2" style={{ transform: 'none' }}>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-left font-display font-black uppercase italic">
                    <th className="p-4 text-slate-400">Feature</th>
                    <th className="p-4 text-lime-400">Student · $3</th>
                    <th className="p-4" style={{ color: 'var(--hot-pink)' }}>Pro · $8</th>
                    <th className="p-4 text-cyan-300">Team · $50</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([label, s, p, t]) => (
                    <tr key={label} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-slate-300">{label}</td>
                      <td className="p-4"><Cell value={s} /></td>
                      <td className="p-4"><Cell value={p} /></td>
                      <td className="p-4"><Cell value={t} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionShell>
  )
}
