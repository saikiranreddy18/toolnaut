import { slugify } from './util/slug.js'

// Pre-enrich classification: is this candidate already known to the store?
// "Known" spans everything we've processed before — published, in-review, or
// rejected — so nothing gets re-enriched day after day. New tools proceed;
// everything else is skipped. (Refreshing an existing tool's data is a separate
// dedicated job, not the daily discovery run.)
//
// Identity is the SLUG ALONE. The hostname is deliberately NOT an identity key:
// GitHub repos without a homepage all share github.com, and Product Hunt's
// fallback URL shares producthunt.com — keying on the domain would mark those
// whole hosts as known after the first run and silently kill both sources.
export function classify(candidate, store) {
  const slug = slugify(candidate.name)
  if (!slug) return { status: 'skip', slug, reason: 'no-slug' }
  if (store.isKnown(slug)) return { status: 'skip', slug, reason: 'known' }
  return { status: 'new', slug }
}
