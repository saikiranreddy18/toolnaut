import { hydrateCatalog } from './toolsCatalog'

// Content fields the app expects on a tool (mirrors the bundled catalog shape).
// The radar-evaluation fields at the end are optional: a tool discovered before
// the scorecard existed, or one nobody could gather evidence on, simply has no
// `scorecard` — which the UI must read as "unrated", never as a score of zero.
const FIELDS = [
  'slug', 'name', 'category', 'sourceCategory', 'price', 'pricing', 'level',
  'blurb', 'audience', 'dev', 'year', 'website', 'status', 'note', 'tags',
  'discoveredAt', 'scorecard', 'integration', 'verdict',
]

function toCatalogShape(t) {
  const o = {}
  for (const f of FIELDS) o[f] = t[f]
  if (!Array.isArray(o.tags)) o.tags = []
  return o
}

// Fetches /tools.json (produced by the radar pipeline's sync-to-app step) and
// merges any NEW tools into the catalog before the app renders. Safe by design:
// a missing file, bad JSON, slow network, or any error just leaves the bundled
// catalog untouched — the app never depends on the live file existing.
export async function loadLiveCatalog() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch('/tools.json', { cache: 'no-cache', signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return 0
    // The SPA rewrite turns a missing /tools.json into a 200 + index.html, so
    // res.ok alone is not enough — check the content type before parsing.
    if (!(res.headers.get('content-type') || '').includes('json')) return 0
    const data = await res.json()
    const tools = Array.isArray(data) ? data : data?.tools
    if (!Array.isArray(tools)) return 0
    const clean = tools
      .filter((t) => t && t.slug && t.name && t.category)
      .map(toCatalogShape)
    return hydrateCatalog(clean)
  } catch {
    return 0
  }
}
