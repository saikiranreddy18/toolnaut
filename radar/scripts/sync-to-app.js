import '../env.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { publicScorecard } from '../scorecard.js'
import { log } from '../util/logger.js'

// Exports the radar store's PUBLISHED tools into the app as public/tools.json,
// stripped to the content fields the app's catalog expects. The app fetches
// this at startup and merges any new tools over its bundled baseline. Run this
// after each pipeline run:  node run.js && node scripts/sync-to-app.js
const FIELDS = [
  'slug', 'name', 'category', 'sourceCategory', 'price', 'pricing', 'level',
  'blurb', 'audience', 'dev', 'year', 'website', 'status', 'note', 'tags',
  'discoveredAt', 'integration', 'verdict',
]

const src = path.join(config.dataDir, 'tools.json')
const dest = fileURLToPath(new URL('../../public/tools.json', import.meta.url))

let tools = []
try {
  tools = JSON.parse(fs.readFileSync(src, 'utf8'))
} catch {
  log.error(`no radar tools at ${src} — run the pipeline (or seed) first`)
  process.exit(1)
}

const published = tools
  .filter((t) => t.lifecycle === 'published')
  .map((t) => {
    const o = {}
    for (const f of FIELDS) o[f] = t[f]
    if (!Array.isArray(o.tags)) o.tags = []
    // The scorecard travels in its app-facing form, which absorbs `automation`
    // as `automationFit`. `signals` stays behind entirely: the per-criterion
    // evidence strings are its readable half.
    o.scorecard = publicScorecard(t.scorecard, { automation: t.automation })
    return o
  })

fs.writeFileSync(dest, JSON.stringify(published, null, 2))
log.info(`wrote ${published.length} published tools → ${dest}`)
