// What a stack costs, as counts. See components/app/StackCost.jsx for why this
// is counts and not a rupee total. Kept free of JSX so the tests can import it.

export const COST_BUCKETS = [
  { key: 'free', label: 'free', color: 'var(--lime)' },
  { key: 'freemium', label: 'freemium', color: 'var(--cyan)' },
  { key: 'paid', label: 'paid', color: 'var(--hot-pink)' },
]

const KNOWN = new Set(COST_BUCKETS.map((b) => b.key))

// A tool with no price recorded, or an unrecognised one, is counted as unknown
// rather than guessed into a bucket.
export function costBreakdown(tools) {
  const out = { free: 0, freemium: 0, paid: 0, unknown: 0 }
  for (const t of tools || []) {
    if (t && KNOWN.has(t.price)) out[t.price]++
    else out.unknown++
  }
  return out
}

// One sentence for screen readers and the tooltip, so the meaning is not
// carried by colour alone.
export function costSummary(b) {
  const parts = COST_BUCKETS.filter((x) => b[x.key]).map((x) => `${b[x.key]} ${x.label}`)
  if (b.unknown) parts.push(`${b.unknown} unpriced`)
  if (!parts.length) return 'No tools yet'
  if (!b.paid && !b.unknown) return `${parts.join(', ')} — nothing to pay for`
  return parts.join(', ')
}
