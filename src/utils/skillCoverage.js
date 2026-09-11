import { CATEGORY_META } from './toolsCatalog'

// Per-tool progress statuses live in Stack.jsx's localStorage-backed map,
// keyed by tool name. Index 0 = "Not started" .. 3 = "Mastered".
const STATUS_STEPS = 4

// Groups a resolved stack (starter + added tools) by galaxy domain and
// scores each domain by mean progress, so a user can see which domains
// they've never touched at all, not just an overall completion percentage.
export function getDomainCoverage(tools, progress) {
  const byDomain = new Map(Object.keys(CATEGORY_META).map((domain) => [domain, []]))
  for (const tool of tools) {
    const bucket = byDomain.get(tool.category)
    if (bucket) bucket.push(tool)
  }
  return Object.entries(CATEGORY_META).map(([domain, meta]) => {
    const domainTools = byDomain.get(domain) || []
    const count = domainTools.length
    const avgStatus = count === 0
      ? 0
      : domainTools.reduce((sum, t) => sum + (progress[t.name] || 0), 0) / count / (STATUS_STEPS - 1)
    return { domain, name: meta.name, color: meta.color, count, avgStatus }
  })
}
