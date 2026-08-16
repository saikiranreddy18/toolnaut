import { DOMAINS, PRICES, LEVELS, REQUIRED_TOOL_FIELDS, SOURCE_CATEGORY_IDS } from './schema.js'

// THE VALIDATE GATE — a pure, synchronous function (no I/O), so it runs and is
// tested identically in any runtime. It decides one of three outcomes:
//   reject  — hard rule broken, or confidence too low
//   review  — valid but not confident enough to auto-publish (human check)
//   publish — valid and confident
// Hard rules produce `errors` (→ reject). Soft issues produce `warnings` that
// only lower the confidence score.
export function validate(record, { publishThreshold = 0.75, reviewThreshold = 0.4 } = {}) {
  const errors = []
  const warnings = []

  for (const f of REQUIRED_TOOL_FIELDS) {
    if (record[f] == null || record[f] === '') errors.push(`missing:${f}`)
  }
  if (record.category && !DOMAINS.includes(record.category)) errors.push(`enum:category=${record.category}`)
  if (record.price && !PRICES.includes(record.price)) errors.push(`enum:price=${record.price}`)
  if (record.level && !LEVELS.includes(record.level)) errors.push(`enum:level=${record.level}`)
  if (record.website && !/^https?:\/\//i.test(record.website)) errors.push('website-not-url')

  if (record.sourceCategory && !SOURCE_CATEGORY_IDS.has(record.sourceCategory)) warnings.push('sourceCategory-unknown')
  if (record.blurb) {
    if (record.blurb.length < 12) warnings.push('blurb-short')
    if (record.blurb.length > 140) warnings.push('blurb-long')
  }
  if (!record.tags || record.tags.length === 0) warnings.push('no-tags')

  // Any hard error → reject, regardless of confidence.
  if (errors.length) {
    return { valid: false, decision: 'reject', confidence: 0, errors, warnings }
  }

  // Confidence from signals. LLM-enriched records start higher than fallback;
  // each warning costs a little; a couple of quality signals add a little.
  let c = String(record.enrichedBy || '').startsWith('llm') ? 0.9 : 0.6
  c -= warnings.length * 0.06
  if (record.dev) c += 0.03
  if (record.audience) c += 0.02
  c = Math.max(0, Math.min(1, c))

  const decision = c >= publishThreshold ? 'publish' : c >= reviewThreshold ? 'review' : 'reject'
  return { valid: true, decision, confidence: Number(c.toFixed(2)), errors, warnings }
}
