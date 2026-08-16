import './env.js'
import { createStore } from './store/index.js'
import { makeToolRecord } from './schema.js'
import { contentHash } from './util/hash.js'
import { domainKey } from './util/slug.js'
import { log } from './util/logger.js'

// One-time seed: load the app's existing 704-tool catalog into the radar store
// as already-published, already-known records. After this, the daily radar only
// adds genuinely NEW tools instead of re-discovering the current catalog.
const now = new Date().toISOString()

const catalog = await import('../src/utils/toolsCatalog.js').catch((e) => {
  log.error('could not import ../src/utils/toolsCatalog.js', e.message)
  return null
})

if (!catalog?.TOOLS) {
  log.error('catalog has no TOOLS export — nothing to seed')
  process.exit(1)
}

const store = createStore()
let n = 0
for (const t of catalog.TOOLS) {
  const rec = makeToolRecord({
    ...t,
    source: 'seed',
    sourceUrl: t.website || '',
    discoveredAt: now,
    updatedAt: now,
    enrichedBy: 'seed',
    confidence: 1,
    lifecycle: 'published',
  })
  rec.contentHash = contentHash(rec)
  store.upsertTool(rec)
  store.markKnown(rec.slug, domainKey(rec.website))
  n++
}
log.info(`seeded ${n} tools into the radar store`)
