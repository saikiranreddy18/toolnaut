// When a catalogue page last changed, taken from the data itself.
//
// Answer engines and search crawlers weigh freshness, and the catalogue pages
// genuinely change every day as the radar adds tools. But a date is a claim:
// stamping pages with the build time would announce "updated today" on a page
// whose content did not move, which is exactly the fake data this project
// refuses. So every date here is the newest real discoveredAt among the tools
// a page actually shows, and a page with no dated tools gets no date at all.
//
// No imports on purpose: scripts/stamp-sitemap.mjs loads this straight into
// Node at build time, where Vite's extensionless import resolution does not
// exist.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The audience's calendar. A tool found at 23:24 UTC on the 10th was found on
// the 11th for anyone reading in India.
const IST_OFFSET_MS = 330 * 60_000

// ISO string of the newest valid discoveredAt, or null when nothing is dated.
// Bundled catalogue tools carry no discoveredAt, so only radar finds count.
export function newestDiscovery(tools) {
  let best = null
  for (const t of tools || []) {
    const ms = Date.parse(t?.discoveredAt)
    if (Number.isFinite(ms) && (best === null || ms > best)) best = ms
  }
  return best === null ? null : new Date(best).toISOString()
}

// "11 Sep 2026", in India time. Formatted by hand rather than with
// toLocaleDateString, whose output varies by browser, ICU version and the
// locale of the headless browser that prerenders the page.
export function formatUpdated(iso) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms + IST_OFFSET_MS)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Adds <lastmod> to the sitemap entries whose date is actually known: /new
// (newest tool overall) and each /tools/<category> (newest tool in it). Every
// other URL is left without one — a missing lastmod is neutral, a wrong one
// teaches crawlers to ignore the field on the whole sitemap.
//
// Returns { xml, stamped } where stamped lists the URLs that received a date.
export function stampSitemap(xml, tools, site = 'https://toolnaut.xyz') {
  const dates = new Map()

  const overall = newestDiscovery(tools)
  if (overall) dates.set(`${site}/new`, overall)

  const byCategory = new Map()
  for (const t of tools || []) {
    if (!t?.category) continue
    if (!byCategory.has(t.category)) byCategory.set(t.category, [])
    byCategory.get(t.category).push(t)
  }
  for (const [category, list] of byCategory) {
    const newest = newestDiscovery(list)
    if (newest) dates.set(`${site}/tools/${category}`, newest)
  }

  const stamped = []
  const out = String(xml).replace(/<url>([\s\S]*?)<\/url>/g, (block, inner) => {
    const loc = inner.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim()
    const date = loc && dates.get(loc)
    if (!date || /<lastmod>/.test(inner)) return block
    stamped.push(loc)
    return block.replace(/<\/loc>/, `</loc><lastmod>${date}</lastmod>`)
  })

  return { xml: out, stamped }
}
