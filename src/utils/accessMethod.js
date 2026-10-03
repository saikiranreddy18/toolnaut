// Derived, not vendor-declared: the catalog has no `platform` field (confirmed
// against radar/schema.js and toolsCatalog.js's full 704-record schema), so
// this infers a usage-method label from data that already exists — the `api`/
// `open-source` tags and the literal wording of `pricing` — rather than adding
// a new catalog field and re-enriching 704 live records to back it.
export const ACCESS_METHODS = ['web', 'api', 'self-hosted']

export const ACCESS_METHOD_LABELS = {
  web: 'Web app',
  api: 'API',
  'self-hosted': 'Self-hosted',
}

export function accessMethodOf(tool) {
  const pricing = tool?.pricing || ''
  if (tool?.tags?.includes('api') || /\bAPI\b/.test(pricing)) return 'api'
  if (tool?.tags?.includes('open-source') || /open\s*weights/i.test(pricing)) return 'self-hosted'
  return 'web'
}
