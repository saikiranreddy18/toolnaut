import { retry, httpError } from '../util/retry.js'
import { log } from '../util/logger.js'

// Product Hunt GraphQL API. Requires a developer token (PRODUCTHUNT_TOKEN);
// without one this source is disabled in config and never runs.
export async function fetchProductHunt({ token, limit = 30 } = {}) {
  if (!token) return []
  const query = `{ posts(first: ${limit}, order: NEWEST) { edges { node { name tagline website url } } } }`
  try {
    const data = await retry(() =>
      fetch('https://api.producthunt.com/v2/api/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(15000),
      }).then(async (r) => {
        if (!r.ok) throw httpError(r, `Product Hunt ${r.status}`)
        return r.json()
      }),
    )
    return (data.data?.posts?.edges || []).map(({ node }) => ({
      name: node.name,
      url: node.website || node.url,
      description: node.tagline || node.name,
      source: 'producthunt',
      sourceUrl: node.url,
      raw: {},
    }))
  } catch (e) {
    log.warn('Product Hunt source failed', e.message)
    return []
  }
}
