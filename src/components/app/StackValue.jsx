import { useState } from 'react'
import { read, write } from '../../state/scopedStorage'
import { initialCurrency } from '../../utils/region'
import { estimateValue } from '../../utils/stackValue'

const KEY = 'exus_stack_value_v1'

// Is this stack worth the time it costs? StackCost (see that file) answers
// what the stack costs in price-type counts, deliberately never a rupee
// figure — the catalogue has no per-tool price amount to sum. This answers
// the next question with numbers that need no catalogue data at all: the
// visitor's own estimate of hours saved and what an hour of their time is
// worth. Toolnaut does the multiplication; it never supplies either number.

function loadInputs() {
  const saved = read(KEY)
  return {
    hoursSavedPerWeek: typeof saved?.hoursSavedPerWeek === 'string' ? saved.hoursSavedPerWeek : '',
    hourlyValue: typeof saved?.hourlyValue === 'string' ? saved.hourlyValue : '',
  }
}

export default function StackValue() {
  const [inputs, setInputs] = useState(loadInputs)
  const symbol = initialCurrency() === 'INR' ? '₹' : '$'

  function changed(field, value) {
    const next = { ...inputs, [field]: value }
    setInputs(next)
    try { write(KEY, next) } catch { /* storage blocked */ }
  }

  const result = estimateValue({
    hoursSavedPerWeek: inputs.hoursSavedPerWeek,
    hourlyValue: inputs.hourlyValue,
  })

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Hours this stack saves you per week</span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={inputs.hoursSavedPerWeek}
          onChange={(e) => changed('hoursSavedPerWeek', e.target.value)}
          placeholder="0"
          className="w-14 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-right text-xs text-white outline-none"
        />
        <span>hrs/wk saved</span>
      </label>
      <span aria-hidden="true">×</span>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">What an hour of your time is worth, in your own currency</span>
        <span aria-hidden="true">{symbol}</span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={inputs.hourlyValue}
          onChange={(e) => changed('hourlyValue', e.target.value)}
          placeholder="0"
          className="w-16 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-right text-xs text-white outline-none"
        />
        <span>/hr</span>
      </label>
      {result && (
        <span className="font-display text-xs font-bold text-(--lime)" role="status">
          ≈ {symbol}{Math.round(result.monthlyValue).toLocaleString()}/mo in time saved
        </span>
      )}
      <span className="text-[10px] text-zinc-600">— your inputs, not ours</span>
    </div>
  )
}
