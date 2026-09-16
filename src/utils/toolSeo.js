// One public, indexable page per tool — and the single source for what that
// page says to a search engine.
//
// WHY THIS EXISTS
// The catalogue had 1,100+ tools and Google could see 24 URLs. Every tool page
// lived under /app/tools/:slug, behind the app shell, rendered only in the
// browser and never listed in the sitemap — so a search for "ChatGPT
// alternatives" or "is Jasper free" could not possibly land here. A directory
// with no crawlable entries has nothing to rank with.
//
// SHARED BY TWO RUNTIMES ON PURPOSE. The React page (pages/ToolPublic.jsx) and
// the build step that writes static HTML (scripts/gen-tool-pages.mjs) both call
// these functions. If the title the crawler saw and the title the browser set
// were computed in two places, they would drift, and Google treats a page whose
// head changes after load as a weaker, less trustworthy document.
//
// NO INVENTED FACTS. Everything here is read from the catalogue entry. There is
// no rating, no review count and no price figure the catalogue does not hold —
// the site's first rule is no fake data, and review markup Google cannot verify
// is penalised anyway.

import { FLAGSHIP, isCatalogNoise } from './prominence.js'

export const SITE = 'https://toolnaut.xyz'

const PRICE_WORDS = { free: 'Free', freemium: 'Freemium', paid: 'Paid' }
const LEVEL_WORDS = { beginner: 'Beginner-friendly', intermediate: 'Intermediate', advanced: 'Advanced' }

export function toolPath(slug) {
  return `/ai-tools/${slug}`
}

export function toolTitle(t) {
  // Name first: the query is almost always the tool's name. "Alternatives" and
  // "pricing" are the two things people search next to a tool name.
  return `${t.name} — pricing, features & alternatives | Toolnaut`
}

export function toolDescription(t) {
  const bits = [
    t.blurb ? t.blurb.replace(/\.$/, '') + '.' : '',
    t.price ? `${PRICE_WORDS[t.price] || t.price}` : '',
    t.level ? `${LEVEL_WORDS[t.level] || t.level}.` : '',
    t.dev ? `By ${t.dev}.` : '',
    'Compare it with similar AI tools on Toolnaut.',
  ].filter(Boolean)
  const text = bits.join(' ').replace(/\s+/g, ' ').trim()
  return text.length > 158 ? text.slice(0, 155).replace(/\s+\S*$/, '') + '…' : text
}

// Similar tools, for the "alternatives" list — the internal links that let a
// crawler walk from one tool page to the next, and the thing a reader actually
// came for.
//
// Ranked by how recognisable a tool is BEFORE alphabet. Sorting ties by name
// put "ChatPanel Now Available on Firefox" beside Claude as an alternative to
// ChatGPT: a radar headline, not a product anyone would switch to. Names that
// read like a sentence are left out entirely.
const looksLikeAName = (o) =>
  String(o.name || '').length <= 28 && String(o.name).split(/\s+/).length <= 3 && !/[,:]/.test(o.name)

export function relatedTools(t, catalog, limit = 6) {
  if (!t) return []
  const flagships = new Set(Object.values(FLAGSHIP).flat())
  const score = (o) =>
    (flagships.has(o.name) ? 6 : 0)
    + (o.sourceCategory && o.sourceCategory === t.sourceCategory ? 3 : 0)
    + (o.category === t.category ? 1 : 0)
    + (o.status === 'Active' ? 1 : 0)
    // Bundled, hand-curated entries have no discoveredAt; radar finds do.
    + (o.discoveredAt ? 0 : 1)
  return catalog
    .filter((o) => o && o.slug !== t.slug && looksLikeAName(o) && !isCatalogNoise(o)
      && (o.category === t.category || o.sourceCategory === t.sourceCategory))
    .map((o) => ({ o, s: score(o) }))
    .sort((a, b) => b.s - a.s || String(a.o.name).localeCompare(String(b.o.name)))
    .slice(0, limit)
    .map((x) => x.o)
}

export function toolJsonLd(t, related = []) {
  const url = `${SITE}${toolPath(t.slug)}`
  const app = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t.name,
    url,
    description: t.blurb || undefined,
    applicationCategory: t.sourceCategory || 'AI tool',
    operatingSystem: 'Web',
    ...(t.dev ? { author: { '@type': 'Organization', name: t.dev } } : {}),
    ...(t.year ? { datePublished: String(t.year) } : {}),
    ...(t.website ? { sameAs: [t.website] } : {}),
    // A price is only stated when the catalogue says the tool is free. For
    // freemium and paid tools the real figure is not in the data, and a guessed
    // number would be exactly the fake data this project refuses.
    ...(t.price === 'free' ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } } : {}),
  }
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Toolnaut', item: SITE },
      ...(t.category
        ? [{ '@type': 'ListItem', position: 2, name: `AI tools for ${t.category}`, item: `${SITE}/tools/${t.category}` }]
        : []),
      { '@type': 'ListItem', position: t.category ? 3 : 2, name: t.name, item: url },
    ],
  }
  const out = [app, crumbs]
  if (related.length) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Alternatives to ${t.name}`,
      itemListElement: related.map((o, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: o.name,
        url: `${SITE}${toolPath(o.slug)}`,
      })),
    })
  }
  return out
}

// Static markup for the build step. Plain, semantic HTML: the crawler reads it
// as-is, and the React page replaces it on mount with the interactive version
// of the same content.
export function toolStaticHtml(t, related = []) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const row = (label, value) => (value ? `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>` : '')
  return [
    '<main style="max-width:760px;margin:0 auto;padding:48px 20px;color:#e4e4e7;font-family:Inter,system-ui,sans-serif">',
    '<nav><a href="/">Toolnaut</a> › ',
    t.category ? `<a href="/tools/${esc(t.category)}">AI tools for ${esc(t.category)}</a> › ` : '',
    `${esc(t.name)}</nav>`,
    `<h1>${esc(t.name)}</h1>`,
    t.dev || t.year ? `<p>${esc([t.dev, t.year ? `since ${t.year}` : ''].filter(Boolean).join(' · '))}</p>` : '',
    t.blurb ? `<p>${esc(t.blurb)}</p>` : '',
    '<table>',
    row('Pricing', PRICE_WORDS[t.price] || t.pricing),
    row('Level', LEVEL_WORDS[t.level]),
    row('Category', t.sourceCategory),
    row('Best for', t.audience),
    row('Note', t.note),
    '</table>',
    t.tags?.length ? `<p>Tags: ${t.tags.map(esc).join(', ')}</p>` : '',
    t.website ? `<p><a href="${esc(t.website)}" rel="nofollow noopener">Visit ${esc(t.name)}</a></p>` : '',
    related.length
      ? `<h2>Alternatives to ${esc(t.name)}</h2><ul>${related
          .map((o) => `<li><a href="${toolPath(esc(o.slug))}">${esc(o.name)}</a> — ${esc(o.blurb || '')}</li>`)
          .join('')}</ul>`
      : '',
    '<p><a href="/goal">Build your personal AI stack on Toolnaut</a></p>',
    '</main>',
  ].join('')
}
