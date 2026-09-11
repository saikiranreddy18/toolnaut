// Adds <lastmod> to dist/sitemap.xml for the pages whose last change is known
// from data: /new and each /tools/<category>, dated by the newest tool the
// radar added to them. See src/utils/freshness.js for why static pages get no
// date rather than the build time.
//
// Bing weighs lastmod, and ChatGPT search leans heavily on Bing's index, so a
// catalogue that changes daily should say so — truthfully.
//
// Runs as a post-build step, after public/ has been copied into dist/, for the
// same reason as stamp-sw and gen-llms.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { stampSitemap } = await import(pathToFileURL(resolve('src/utils/freshness.js')).href)

const mapPath = resolve('dist/sitemap.xml')
const xml = readFileSync(mapPath, 'utf8')

// Optional, like everywhere else that reads it: no live file means no dated
// tools, which means no lastmod — never a failed build.
let tools = []
const livePath = resolve('dist/tools.json')
if (existsSync(livePath)) {
  try {
    const raw = JSON.parse(readFileSync(livePath, 'utf8'))
    tools = Array.isArray(raw) ? raw : raw?.tools || []
  } catch {
    console.warn('stamp-sitemap: dist/tools.json unreadable — sitemap left without lastmod')
  }
}

const { xml: out, stamped } = stampSitemap(xml, tools)
writeFileSync(mapPath, out)

const paths = stamped.map((u) => u.replace(/^https?:\/\/[^/]+/, ''))
console.log(
  `stamp-sitemap: lastmod on ${stamped.length} URL${stamped.length === 1 ? '' : 's'}` +
  (paths.length ? ` (${paths.join(', ')})` : ' — no dated tools'),
)
