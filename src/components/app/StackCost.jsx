import { COST_BUCKETS, costBreakdown, costSummary } from '../../utils/stackCost'

// What your stack will cost you, at a glance.
//
// COUNTS, NOT RUPEES. The catalogue records each tool's price TYPE (free,
// freemium, paid) reliably, but its `pricing` field is free text — "Usage-based
// API", "Enterprise", "Freemium" — with no amount, no currency and no period.
// Adding those up into "₹4,200/month" would be inventing a number, so this
// says what is actually known: how many tools cost nothing, how many have a
// usable free tier, and how many you will have to pay for.

export default function StackCost({ tools }) {
  if (!tools?.length) return null
  const b = costBreakdown(tools)
  const summary = costSummary(b)

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" role="note" aria-label={`Stack cost: ${summary}`} title={summary}>
      {COST_BUCKETS.filter((x) => b[x.key]).map((x) => (
        <span
          key={x.key}
          className="rounded-full border border-white/10 px-2 py-0.5 font-display text-[10px] font-semibold text-black"
          style={{ background: x.color }}
          aria-hidden="true"
        >
          {b[x.key]} {x.label}
        </span>
      ))}
      {b.unknown > 0 && (
        <span className="rounded-full border-2 border-zinc-600 px-2 py-0.5 font-display text-[10px] font-semibold text-zinc-400" aria-hidden="true">
          {b.unknown} unpriced
        </span>
      )}
      {!b.paid && !b.unknown && (
        <span className="font-display text-[10px] font-bold text-(--lime)" aria-hidden="true">
          · nothing to pay for
        </span>
      )}
    </span>
  )
}
