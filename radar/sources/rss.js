import { retry } from '../util/retry.js'
import { log } from '../util/logger.js'

// Minimal RSS/Atom reader for any changelog or "new tools" feeds configured via
// RSS_FEEDS. Deliberately dependency-free — a light regex parse, not a full XML
// library, since feed items only need title/link/description.
export async function fetchRSS({ feeds = [], limit = 40 } = {}) {
  const out = []
  const per = Math.ceil(limit / Math.max(feeds.length, 1))
  for (const feed of feeds) {
    try {
      const xml = await retry(() => fetch(feed).then((r) => r.text()))
      // RSS wraps entries in <item>, Atom in <entry> — support both formats.
      const isAtom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml)
      const items = xml.split(isAtom ? /<entry[\s>]/i : /<item[\s>]/i).slice(1)
      for (const item of items.slice(0, per)) {
        const name = tag(item, 'title')
        const url = isAtom ? atomLink(item) : tag(item, 'link')
        const description = tag(item, 'description') || tag(item, 'summary') || tag(item, 'content')
        if (!name || !url) continue
        out.push({ name, url, description: description || name, source: 'rss', sourceUrl: url, raw: { feed } })
      }
    } catch (e) {
      log.warn(`RSS feed failed: ${feed}`, e.message)
    }
  }
  return out
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  if (!m) return ''
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim()
}

// Atom's <link> is a self-closing element with an href attribute, not text
// content like RSS's <link>url</link> — prefer rel="alternate", else the
// first <link> found.
function atomLink(xml) {
  const links = [...xml.matchAll(/<link\b([^>]*)\/?>/gi)]
  const alt = links.find((m) => /rel=["']alternate["']/i.test(m[1])) || links[0]
  if (!alt) return ''
  const href = alt[1].match(/href=["']([^"']+)["']/i)
  return href ? href[1] : ''
}
