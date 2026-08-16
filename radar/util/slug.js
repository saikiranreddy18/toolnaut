// Canonical slug + domain key — the two identity handles used for dedup.
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/['".]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function domainKey(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}
