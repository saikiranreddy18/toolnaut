import '../env.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { log } from '../util/logger.js'

// Writes public/feed.xml, an RSS 2.0 feed of the newest published tools, so a
// feed reader or another aggregator can watch radar's output without polling
// the /new page. Reads the same source sync-to-app.js reads, applies the same
// noise filter the app's own "New this week" / /new UI applies before display
// (duplicated inline rather than importing src/ — radar/ and src/ are kept
// independent per CLAUDE.md's "two independent halves"). Run after
// sync-to-app.js so radar.yml's existing export step covers both.
const SITE = 'https://toolnaut.xyz'
const FEED_CAP = 50

// Mirrors src/utils/prominence.js's isCatalogNoise() regexes exactly.
const REPO_SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/
const FORUM_POST = /^(launch|show|ask) hn:/i
const LINK_LIST = /^awesome[-_ ]/i
const isCatalogNoise = (name) => REPO_SLUG.test(name) || FORUM_POST.test(name) || LINK_LIST.test(name)

const src = path.join(config.dataDir, 'tools.json')
const dest = fileURLToPath(new URL('../../public/feed.xml', import.meta.url))

let tools = []
try {
  tools = JSON.parse(fs.readFileSync(src, 'utf8'))
} catch {
  log.error(`no radar tools at ${src} — run the pipeline (or seed) first`)
  process.exit(1)
}

const items = tools
  .filter((t) => t.lifecycle === 'published' && !isCatalogNoise(t.name || ''))
  .sort((a, b) => new Date(b.discoveredAt) - new Date(a.discoveredAt))
  .slice(0, FEED_CAP)

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const rssItems = items
  .map((t) => {
    const url = `${SITE}/ai-tools/${t.slug}`
    return `    <item>
      <title>${esc(t.name)}</title>
      <link>${url}</link>
      <description>${esc(t.blurb)}</description>
      <guid isPermaLink="false">${esc(t.slug)}</guid>
      <pubDate>${new Date(t.discoveredAt).toUTCString()}</pubDate>
    </item>`
  })
  .join('\n')

const lastBuildDate = items.length ? new Date(items[0].discoveredAt).toUTCString() : new Date().toUTCString()

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Toolnaut — newly discovered AI tools</title>
    <link>${SITE}/new</link>
    <description>AI tools Toolnaut's radar pipeline just added to the catalog.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`

fs.writeFileSync(dest, rss)
log.info(`wrote ${items.length} feed items → ${dest}`)
