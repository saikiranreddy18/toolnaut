import { slugify, domainKey } from './util/slug.js'

// Pre-enrich classification: is this candidate already known to the store?
// "Known" spans everything we've processed before — published, in-review, or
// rejected — so nothing gets re-enriched day after day. New tools proceed;
// everything else is skipped. (Refreshing an existing tool's data is a separate
// dedicated job, not the daily discovery run.)
export function classify(candidate, store) {
  const slug = slugify(candidate.name)
  const dkey = domainKey(candidate.url)
  if (!slug) return { status: 'skip', slug, reason: 'no-slug' }
  if (store.isKnown(slug, dkey)) return { status: 'skip', slug, reason: 'known' }
  return { status: 'new', slug, dkey }
}
