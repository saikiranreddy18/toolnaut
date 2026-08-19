import { retry, httpError } from '../util/retry.js'
import { log } from '../util/logger.js'

// Hacker News via the free Algolia API — no key required. Recent stories that
// look like AI-tool launches become candidates.
export async function fetchHackerNews({ limit = 40 } = {}) {
  const queries = ['AI tool', 'AI agent', 'launch AI']
  const per = Math.ceil(limit / queries.length)
  const out = []
  for (const q of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=${per}`
      const data = await retry(() =>
        fetch(url, { signal: AbortSignal.timeout(15000) }).then((r) => {
          if (!r.ok) throw httpError(r, `Hacker News ${r.status}`)
          return r.json()
        }),
      )
      for (const hit of data.hits || []) {
        if (!hit.url || !hit.title) continue
        out.push({
          name: cleanTitle(hit.title),
          url: hit.url,
          description: hit.title,
          source: 'hackernews',
          sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          raw: { points: hit.points, author: hit.author },
        })
      }
    } catch (e) {
      log.warn(`HN query failed: ${q}`, e.message)
    }
  }
  return out
}

function cleanTitle(t) {
  return String(t)
    .replace(/^show hn:\s*/i, '')
    .replace(/\s*[–—-]\s.*$/, '') // "Name – description" → "Name"
    .trim()
}
