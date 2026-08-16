import { config } from '../config.js'
import { fetchHackerNews } from './hackernews.js'
import { fetchGitHub } from './github.js'
import { fetchProductHunt } from './producthunt.js'
import { fetchRSS } from './rss.js'
import { log } from '../util/logger.js'

// Runs every enabled source concurrently and independently. Promise.allSettled
// means one broken source (rate limit, outage) never sinks the whole run — it
// just contributes zero candidates and logs a warning.
export async function collectCandidates() {
  const s = config.sources
  const jobs = []
  if (s.hackernews.enabled) jobs.push(['hackernews', fetchHackerNews({})])
  if (s.github.enabled) jobs.push(['github', fetchGitHub({ token: s.github.token })])
  if (s.producthunt.enabled) jobs.push(['producthunt', fetchProductHunt({ token: s.producthunt.token })])
  if (s.rss.enabled) jobs.push(['rss', fetchRSS({ feeds: s.rss.feeds })])

  const results = await Promise.allSettled(jobs.map(([, p]) => p))
  const candidates = []
  results.forEach((r, i) => {
    const name = jobs[i][0]
    if (r.status === 'fulfilled') {
      candidates.push(...r.value)
      log.info(`source ${name}: ${r.value.length} candidates`)
    } else {
      log.warn(`source ${name} rejected`, r.reason?.message)
    }
  })
  return candidates
}
