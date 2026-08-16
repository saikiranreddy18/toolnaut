import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import PricingPillar from '../ui/PricingPillar'
import { PLANS, COMPARISON } from '../../utils/planData'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

function Cell({ value }) {
  if (value === true) return <span className="text-exus-lime" aria-label="included">✓</span>
  if (value === false) return <span className="text-slate-600" aria-label="not included">✕</span>
  return <span className="text-slate-200">{value}</span>
}

export default function PricingSection() {
  const [compare, setCompare] = useState(false)
  const track = useAnalytics()

  return (
    <SectionShell id="pricing" eyebrow="Pricing" title="Start solo. Scale with your team.">
      <div className="grid items-start gap-8 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PricingPillar key={plan.id} plan={plan} />
        ))}
      </div>

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
