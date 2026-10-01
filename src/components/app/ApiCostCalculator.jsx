import { useState } from 'react'
import { read, write } from '../../state/scopedStorage'
import { estimateApiCost } from '../../utils/apiCost'

const KEY = 'exus_api_cost_v1'

// "If I send N requests a day of this shape, what does this model's API cost
// me a month?" — the one AI-cost question the Usage-based API tools raise
// with no answer anywhere on the site. Billed in USD by every provider
// regardless of the visitor's own region, so unlike StackValue this never
// shows ₹ — a converted figure nobody's invoice would match is worse than no
// figure at all.

function loadInputs() {
  const saved = read(KEY)
  return {
    requestsPerDay: typeof saved?.requestsPerDay === 'string' ? saved.requestsPerDay : '',
    avgInputTokens: typeof saved?.avgInputTokens === 'string' ? saved.avgInputTokens : '',
    avgOutputTokens: typeof saved?.avgOutputTokens === 'string' ? saved.avgOutputTokens : '',
  }
}

export default function ApiCostCalculator({ models }) {
  const [modelSlug, setModelSlug] = useState(models[0].slug)
  const [inputs, setInputs] = useState(loadInputs)

  const model = models.find((m) => m.slug === modelSlug) || models[0]

  function changed(field, value) {
    const next = { ...inputs, [field]: value }
    setInputs(next)
    try { write(KEY, next) } catch { /* storage blocked */ }
  }

  const result = estimateApiCost({
    inputPer1M: model.inputPer1M,
    outputPer1M: model.outputPer1M,
    requestsPerDay: inputs.requestsPerDay,
    avgInputTokens: inputs.avgInputTokens,
    avgOutputTokens: inputs.avgOutputTokens,
  })

  return (
    <div className="sticker mt-8 p-5" style={{ transform: 'rotate(0)' }}>
      <p className="arcade-heading compact text-lg">API cost estimate</p>
      <p className="mt-2 text-sm text-zinc-300">
        What calling this model's API would cost you a month, at your own usage shape.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Model</span>
          <select
            value={modelSlug}
            onChange={(e) => setModelSlug(e.target.value)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white outline-none"
          >
            {models.map((m) => (
              <option key={m.slug} value={m.slug} className="bg-black">
                {m.provider} {m.model}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Requests per day</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={inputs.requestsPerDay}
            onChange={(e) => changed('requestsPerDay', e.target.value)}
            placeholder="0"
            className="w-16 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-right text-xs text-white outline-none"
          />
          <span>reqs/day</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Average input tokens per request</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={inputs.avgInputTokens}
            onChange={(e) => changed('avgInputTokens', e.target.value)}
            placeholder="0"
            className="w-16 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-right text-xs text-white outline-none"
          />
          <span>in tok</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Average output tokens per request</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={inputs.avgOutputTokens}
            onChange={(e) => changed('avgOutputTokens', e.target.value)}
            placeholder="0"
            className="w-16 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-right text-xs text-white outline-none"
          />
          <span>out tok</span>
        </label>
      </div>

      {result && (
        <p className="mt-3 font-display text-base font-bold text-(--lime)" role="status">
          ≈ ${result.monthlyCost < 1 ? result.monthlyCost.toFixed(2) : Math.round(result.monthlyCost).toLocaleString()}/mo
        </p>
      )}

      <p className="mt-3 text-[10px] text-zinc-600">
        {model.provider} {model.model}: ${model.inputPer1M}/${model.outputPer1M} per 1M input/output tokens,
        as of {model.asOf} — <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">source</a>.
        Your inputs, not ours.
      </p>
    </div>
  )
}
