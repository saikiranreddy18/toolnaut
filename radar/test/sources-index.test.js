import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectCandidates } from '../sources/index.js'

// Every other source module (github.js, hackernews.js, producthunt.js, rss.js)
// has a dedicated test, but collectCandidates() — the orchestrator that runs
// them concurrently and merges their output — had none. In this environment
// (no PRODUCTHUNT_TOKEN, no RSS_FEEDS) only github and hackernews are enabled,
// so this covers what actually runs: results from both merge into one list,
// and disabled sources are never even called.
test('merges candidates from every enabled source and never calls a disabled one', async () => {
  const real = globalThis.fetch
  const calledUrls = []
  globalThis.fetch = async (url) => {
    calledUrls.push(String(url))
    if (String(url).includes('hn.algolia.com')) {
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => ({ hits: [{ objectID: '1', url: 'https://hn.dev', title: 'HN Tool' }] }),
      }
    }
    if (String(url).includes('api.github.com')) {
      return {
        ok: true, status: 200, headers: new Headers(),
        json: async () => ({
          items: [{ name: 'gh-tool', description: 'A tool', homepage: 'https://gh.dev', html_url: 'https://github.com/x/gh-tool', stargazers_count: 1, language: 'JS', owner: { login: 'x' } }],
        }),
      }
    }
    throw new Error(`unexpected fetch in this test: ${url}`)
  }
  try {
    const out = await collectCandidates()
    // fetchHackerNews issues one query per search term (3 terms), and each
    // gets served the same canned hit — see hackernews.test.js.
    assert.equal(out.filter((c) => c.source === 'hackernews').length, 3)
    assert.equal(out.filter((c) => c.source === 'github').length, 1)
    assert.ok(!calledUrls.some((u) => u.includes('producthunt.com')), 'producthunt is disabled and must not be called')
  } finally {
    globalThis.fetch = real
  }
})
