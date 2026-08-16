import { createHash } from 'node:crypto'
import { HASHED_FIELDS } from '../schema.js'

// Stable 16-char content hash over the identity fields. Same meaningful content
// → same hash, so re-runs are idempotent and real changes are detectable.
export function contentHash(record) {
  const basis = HASHED_FIELDS.map((f) => {
    const v = record[f]
    return Array.isArray(v) ? v.slice().sort().join(',') : String(v ?? '')
  }).join('|')
  return createHash('sha256').update(basis).digest('hex').slice(0, 16)
}
