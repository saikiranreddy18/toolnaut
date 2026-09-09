// Replaces __TOOL_COUNT__ in dist/llms.txt with the real size of the catalogue
// a visitor actually gets: the bundled tools plus the live radar tools that are
// merged in at runtime by hydrateCatalog().
//
// llms.txt exists to be quoted verbatim by answer engines, so a stale number in
// it is worse than in ordinary marketing copy — it gets repeated as fact by
// something the reader trusts. The radar publishes new tools daily, so any
// figure typed by hand here is wrong within the week. Generating it at build
// time is the only version that stays true without anyone remembering to
// update it.
//
// Runs as a post-build step (not a Vite plugin) so it is guaranteed to happen
// after public/ has been copied into dist/ — same reason as stamp-sw.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const llmsPath = resolve('dist/llms.txt')
const llms = readFileSync(llmsPath, 'utf8')

if (!llms.includes('__TOOL_COUNT__')) {
  console.error('gen-llms: __TOOL_COUNT__ placeholder missing from dist/llms.txt')
  process.exit(1)
}

const { BUNDLED_COUNT, TOOLS } = await import(
  pathToFileURL(resolve('src/utils/toolsCatalog.js')).href
)

// The live file is optional by design — the app treats a missing tools.json as
// "no new tools", and so does this. Better to publish the bundled floor than to
// fail the build over a file the radar may not have written yet.
let live = 0
const livePath = resolve('dist/tools.json')
if (existsSync(livePath)) {
  try {
    const raw = JSON.parse(readFileSync(livePath, 'utf8'))
    const list = Array.isArray(raw) ? raw : raw?.tools
    if (Array.isArray(list)) {
      const known = new Set(TOOLS.map((t) => t.slug))
      live = list.filter((t) => t?.slug && !known.has(t.slug)).length
    }
  } catch {
    console.warn('gen-llms: dist/tools.json unreadable — publishing bundled count only')
  }
}

const total = BUNDLED_COUNT + live
writeFileSync(llmsPath, llms.replaceAll('__TOOL_COUNT__', String(total)))
console.log(`gen-llms: catalogue → ${total} tools (${BUNDLED_COUNT} bundled + ${live} live)`)
