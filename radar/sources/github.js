import { retry, httpError } from '../util/retry.js'
import { log } from '../util/logger.js'

// GitHub repository search for recently-created AI tools. Works without a token
// (lower rate limit); a GITHUB_TOKEN raises the limit.
export async function fetchGitHub({ token, limit = 40 } = {}) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
  const q = `AI tool in:name,description created:>${since}`
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${limit}`
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'nexus-radar' }
  if (token) headers.authorization = `Bearer ${token}`
  try {
    const data = await retry(() =>
      fetch(url, { headers, signal: AbortSignal.timeout(15000) }).then(async (r) => {
        if (!r.ok) throw httpError(r, `GitHub ${r.status}`)
        return r.json()
      }),
    )
    return (data.items || []).map((repo) => ({
      name: repo.name,
      url: repo.homepage || repo.html_url,
      description: repo.description || repo.name,
      source: 'github',
      sourceUrl: repo.html_url,
      raw: { stars: repo.stargazers_count, lang: repo.language, owner: repo.owner?.login },
    }))
  } catch (e) {
    log.warn('GitHub source failed', e.message)
    return []
  }
}
