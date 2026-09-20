// One-off catalog repair.
//
// Two defects shipped into the live catalog:
//   1. Articles, blog posts and press coverage were ingested as if they were
//      tools (a Washington Post piece is not something you add to your stack).
//   2. Tool names carried the whole submission headline — "Ablo, make your AI
//      app multiplayer" instead of "Ablo".
//
// Run:  node radar/scripts/clean-catalog.mjs <in.json> <out.json> [--apply]
// Without --apply it only prints the report.

import { readFileSync, writeFileSync } from 'node:fs'

// Publishers and aggregators. Anything hosted here is coverage, not a product.
const NEWS_HOSTS = new Set([
  'washingtonpost.com', 'nytimes.com', 'bloomberg.com', 'wired.com', 'semafor.com',
  'technologyreview.com', 'thehindu.com', 'ithome.com', 'morningbrew.com',
  'musically.com', 'theverge.com', 'techcrunch.com', 'arstechnica.com', 'cnbc.com',
  'reuters.com', 'forbes.com', 'businessinsider.com', 'venturebeat.com', 'zdnet.com',
  'engadget.com', 'theregister.com', 'axios.com', 'ft.com', 'wsj.com', 'guardian.com',
  'theguardian.com', 'lifespan.io', 'arxiv.org', 'en.wikipedia.org', 'wikipedia.org',
  'papers.ssrn.com', 'ssrn.com', 'researchgate.net', 'acm.org', 'ieee.org',
  'martinfowler.com', 'infoq.com', 'thenewstack.io', 'hackernoon.com', 'medium.com',
  'substack.com', 'dev.to', 'blog.logrocket.com', 'smashingmagazine.com', 'nist.gov',
  'aisi.gov.uk', 'genai.owasp.org', 'sciencedirect.com', 'nature.com',
])

const isNewsHost = (h) =>
  NEWS_HOSTS.has(h) || h.endsWith('.substack.com') || h.endsWith('.medium.com')

// A URL that points at a dated post / blog / news path is an article even on a
// company's own domain. GitHub is exempt: /blog/ there is usually a repo path.
const ARTICLE_PATH =
  /(^|\/)(blog|news|posts?|article|articles|stories|press|research|writing)(\/|$)|\/20\d{2}\/\d{1,2}\/|\/p\/[a-z0-9-]{8,}/i

const ARTICLE_NAME = new RegExp([
  // first-person narrative
  '^(i|we)\\s+(built|made|wrote|spent|tried|learned|shipped|ran|run|gave|told|might)\\b',
  // question headlines
  '\\?$',
  '^(how|why|what|when|where|who|should|can|will|is|are|does|do)\\b',
  // announcement / press
  '\\b(launch(es|ed)?|unveil(s|ed)?|announc(es|ed)|introduc(es|ing)|publish(es|ed)|releases|rolls out|is live|goes live|now available)\\b',
  // opinion / analysis headline shapes
  '\\b(the )?(anatomy|state|future|history|rise|fall|death|case) of\\b',
  '\\b(lessons|thoughts|notes|reflections|takeaways|myths|mistakes|tips|reasons)\\b',
  '\\b(benchmarking|measuring|evaluating|comparing|understanding|exploring|rethinking|revisiting|designing|scaling|managing|obsessing)\\b',
  '\\beffects? of\\b',
  '\\bdon\'?t work\\b',
  '\\b(vs\\.?|versus)\\b',
  // declarative sentence: a subject followed by a verb, near the start
  '^(?:the|a|an|this|that|it|they|your|my|our)?\\s*[\\w.-]+(?:\\s+[\\w.-]+)?\\s+(?:is|are|was|were|will|can|could|should|has|have|makes?|needs?|keeps?|started|gets?)\\b',
].join('|'), 'i')

// "Launch HN: Vendo (YC S26)" -> Vendo   |   "Show HN: Foo - does bar" -> Foo
const HN_PREFIX = /^(?:show|ask|launch|tell)\s+hn[:\s-]+\s*/i
const YC_SUFFIX = /\s*\((?:yc\s*)?[a-z]\d{2}\)\s*$/i

// "Name, a lowercase clause" / "Name: A Description" / "Name — desc"
const TRAILING_CLAUSE = /^(.{2,32}?)\s*(?:,|:|—|–|\s-\s)\s+(.{4,})$/

// Heads that survive the split but name nothing — "Public beta: a runtime for X"
// leaves "Public beta", which is not a product.
const GENERIC_HEADS = new Set([
  'ai', 'app launch', 'public beta', 'launch', 'beta', 'new', 'update', 'introducing',
  'pov', 'vim-like', 'open source', 'free', 'show', 'demo', 'release', 'announcement',
  'observational reconstruction', 'tool', 'tools', 'my', 'the ai',
])

// Press verbs. These mark coverage of a product rather than the product, and
// they outrank a salvageable-looking head ("Meta launches Muse" is still news).
const ANNOUNCEMENT =
  /\b(launch(?:es|ed)|unveil(?:s|ed)|announc(?:es|ed)|publish(?:es|ed)|rolls? out|is live|goes live)\b/i

const looksLikeProductName = (s) =>
  s.length >= 2 &&
  s.split(/\s+/).length <= 3 &&
  !GENERIC_HEADS.has(s.toLowerCase()) &&
  !ANNOUNCEMENT.test(s) &&
  !/^(the|a|an|open|free|new|my|your|our)$/i.test(s)

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// The identifiers the product publishes itself: its domain label, or its GitHub
// repo name. Matching the title against these confirms a name rather than
// inventing one.
function selfIdentifiers(url) {
  const out = []
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (/^(github|gitlab)\.com$/.test(host)) {
      const repo = u.pathname.split('/').filter(Boolean)[1]
      if (repo) out.push(norm(repo))
    } else {
      const parts = host.split('.')
      if (parts.length >= 2) out.push(norm(parts[parts.length - 2]))
      out.push(norm(parts[0]))
    }
  } catch {}
  return out.filter(Boolean)
}

function cleanName(raw, url) {
  let n = String(raw).trim()
  n = n.replace(HN_PREFIX, '').replace(YC_SUFFIX, '').trim()

  const m = n.match(TRAILING_CLAUSE)
  if (m) {
    const head = m[1].trim().replace(/[.,:;—–-]+$/, '')
    // Only trust the head if it reads like a name, not like the start of a sentence.
    if (looksLikeProductName(head)) return head
  }

  // Longest leading run of words that the product's own domain/repo confirms.
  const ids = selfIdentifiers(url)
  if (ids.length) {
    const words = n.split(/\s+/)
    for (let take = Math.min(3, words.length); take >= 1; take--) {
      const cand = words.slice(0, take).join(' ').replace(/[.,:;—–-]+$/, '')
      if (cand.length >= 3 && ids.includes(norm(cand))) return cand
    }
  }

  return n
}

// Last resort for a title that never carried a name — "Coordination Layer for
// Coding Agents" is Twing. Every candidate comes off the record itself (its repo,
// its vendor field, its domain), so nothing here is invented.
const PERSONISH = /^(?:mr|ms|dr|uncle)\b|^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/
const GENERIC_DEV = /^(?:the|a|an|open|team|inc|llc|ltd|labs?|studio|community)$/i

function deriveName(t) {
  let host = '', segs = []
  try {
    const u = new URL(t.website)
    host = u.hostname.replace(/^www\./, '')
    segs = u.pathname.split('/').filter(Boolean)
  } catch { return null }

  // A repo name is the project's own identifier.
  if (/^(github|gitlab)\.com$/.test(host) && segs[1]) return segs[1]

  // On a *.github.io page the subdomain is the author, not the project; the
  // project is the first path segment, if the page has one.
  if (/\.github\.io$/.test(host)) return segs[0] || null

  const dev = String(t.dev || '').trim()
  if (dev && dev.split(/\s+/).length <= 2 && !PERSONISH.test(dev) && !GENERIC_DEV.test(dev)) return dev

  const label = host.split('.').slice(-2)[0]
  if (label && label.length >= 3 && !/^(github|gitlab|sites|apps|blog|www)$/.test(label))
    return label.charAt(0).toUpperCase() + label.slice(1)

  return null
}

// Did the domain/repo confirm this name? Only a self-confirmed name is allowed
// to rescue a title that otherwise reads like an article headline.
function domainConfirmed(raw, url) {
  const ids = selfIdentifiers(url)
  if (!ids.length) return null
  const words = String(raw).replace(HN_PREFIX, '').trim().split(/\s+/)
  for (let take = Math.min(3, words.length); take >= 1; take--) {
    const cand = words.slice(0, take).join(' ').replace(/[.,:;—–-]+$/, '')
    if (cand.length >= 3 && ids.includes(norm(cand))) return cand
  }
  return null
}

const [, , inPath, outPath, ...flags] = process.argv
const apply = flags.includes('--apply')
const tools = JSON.parse(readFileSync(inPath, 'utf8'))

const removed = []
const renamed = []
const kept = []

for (const t of tools) {
  const name = String(t.name || '')
  let host = ''
  try { host = new URL(t.website).hostname.replace(/^www\./, '') } catch {}

  const isGit = /^(github|gitlab)\.com$/.test(host)
  let path = ''
  try { path = new URL(t.website).pathname } catch {}

  // Strip the headline down first: a submission titled "Ablo, make your AI app
  // multiplayer" is the tool Ablo, not an article, and only the leftover tail
  // makes it read like prose.
  const fixed = cleanName(name, t.website)
  // A headline that splits cleanly on punctuation ("Ablo, make your app…") is a
  // tool; one that only looks tidy because the domain agrees is also a tool.
  // Anything else that reads like prose is coverage.
  const salvagedName = fixed !== name && looksLikeProductName(fixed)
  const confirmed = domainConfirmed(name, t.website)

  let reason = null
  if (isNewsHost(host)) reason = `news-host:${host}`
  // Decisive even when the vendor's own domain confirms the name: "Axelera AI
  // Launches Europa" on axelera.ai is still the press release, not the product.
  else if (ANNOUNCEMENT.test(name)) reason = 'announcement-coverage'
  else if (ARTICLE_NAME.test(name) && !salvagedName && !confirmed) reason = 'article-headline'
  else if (!salvagedName && !confirmed && !isGit && ARTICLE_PATH.test(path) && fixed.split(/\s+/).length > 4)
    reason = `article-path:${path.slice(0, 36)}`

  if (reason) { removed.push({ slug: t.slug, name, host, reason }); continue }

  // Still a sentence? The title never contained a name, so take one from the record.
  let final = fixed
  if (final.split(/\s+/).length > 4) final = deriveName(t) || final

  if (final !== name) renamed.push({ slug: t.slug, from: name, to: final })
  kept.push({ ...t, name: final })
}

// Trimming headlines down to product names collapses entries that were only
// distinct because each carried a different tagline (three "Muse" rows).
const seen = new Set()
const deduped = []
const dupes = []
for (const t of kept) {
  const key = t.name.toLowerCase().trim()
  if (seen.has(key)) { dupes.push(t.name); continue }
  seen.add(key)
  deduped.push(t)
}

console.log(`in: ${tools.length}   kept: ${deduped.length}   removed: ${removed.length}   renamed: ${renamed.length}   deduped: ${dupes.length}\n`)
console.log('=== REMOVED ===')
for (const r of removed) console.log(`  [${r.reason}] ${r.name}  (${r.host})`)
console.log('\n=== RENAMED ===')
for (const r of renamed) console.log(`  "${r.from}"  ->  "${r.to}"`)

console.log('\n=== DEDUPED ===')
for (const d of dupes) console.log(`  duplicate name: ${d}`)

if (apply) {
  writeFileSync(outPath, JSON.stringify(deduped, null, 2) + '\n')
  console.log(`\nwrote ${outPath} (${deduped.length} entries)`)
}
