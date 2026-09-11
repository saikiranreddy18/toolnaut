import { TOOLS } from './toolsCatalog'

// How current the catalogue actually is.
//
// The landing page claims a tool count and a "last updated" date. Both have to
// be measured, not typed into the markup: the count changes every time the
// radar publishes, and a hardcoded date becomes a lie the day after you write
// it. The product review is explicit that trust cues belong on the page "only
// if true" — so these read the catalogue at render time.
//
// TOOLS is hydrated from /tools.json before first paint (see liveCatalog.js),
// so by the time anything renders this reflects the live set, not just the
// bundled one.

export function catalogSize() {
  return TOOLS.length
}

// The newest discoveredAt in the catalogue. Bundled tools carry no date — only
// radar-discovered ones do — so this is genuinely "when the catalogue last
// gained something", which is the claim being made.
export function lastUpdated() {
  let newest = null
  for (const t of TOOLS) {
    const d = t.discoveredAt ? new Date(t.discoveredAt) : null
    if (d && !Number.isNaN(d.getTime()) && (!newest || d > newest)) newest = d
  }
  return newest
}

// "today", "yesterday", "3 days ago", or a date once it is old enough that the
// relative form stops being informative. Returns null when nothing is dated,
// so callers can omit the claim rather than print a placeholder.
export function lastUpdatedLabel() {
  const d = lastUpdated()
  if (!d) return null
  const days = Math.floor((Date.now() - d.getTime()) / 86400e3)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
