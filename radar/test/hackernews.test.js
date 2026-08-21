import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchHackerNews } from '../sources/hackernews.js'

// fetchHackerNews issues one query per search term and serves this same canned
// response to each, so a single hit comes back once per term (no dedup at this layer).
async function withHits(hits, fn) {
  const real = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ hits }) })
  try {
    return await fn()
  } finally {
    globalThis.fetch = real
  }
}

test('cleanTitle strips a "Show HN:" prefix', async () => {
  const hits = [{ objectID: '1', url: 'https://a.dev', title: 'Show HN: Widgetly' }]
  const out = await withHits(hits, () => fetchHackerNews({ limit: 1 }))
  assert.ok(out.length > 0)
  assert.ok(out.every((o) => o.name === 'Widgetly'))
})

test('cleanTitle strips a trailing " – description" suffix', async () => {
  const hits = [{ objectID: '2', url: 'https://b.dev', title: 'Widgetly – an AI widget generator' }]
  const out = await withHits(hits, () => fetchHackerNews({ limit: 1 }))
  assert.ok(out.length > 0)
  assert.ok(out.every((o) => o.name === 'Widgetly'))
})

test('cleanTitle handles a plain hyphen separator together with the HN prefix', async () => {
  const hits = [{ objectID: '3', url: 'https://c.dev', title: 'Show HN: Widgetly - now with agents' }]
  const out = await withHits(hits, () => fetchHackerNews({ limit: 1 }))
  assert.ok(out.length > 0)
  assert.ok(out.every((o) => o.name === 'Widgetly'))
})

test('a title with no separator or prefix passes through untouched', async () => {
  const hits = [{ objectID: '4', url: 'https://d.dev', title: 'Widgetly' }]
  const out = await withHits(hits, () => fetchHackerNews({ limit: 1 }))
  assert.ok(out.length > 0)
  assert.ok(out.every((o) => o.name === 'Widgetly'))
})

test('hits missing a url or title are skipped', async () => {
  const hits = [
    { objectID: '5', title: 'No URL' },
    { objectID: '6', url: 'https://e.dev' },
  ]
  const out = await withHits(hits, () => fetchHackerNews({ limit: 2 }))
  assert.equal(out.length, 0)
})

test('description is the raw title, not the cleaned name', async () => {
  const hits = [{ objectID: '7', url: 'https://f.dev', title: 'Show HN: Widgetly – an AI widget generator' }]
  const out = await withHits(hits, () => fetchHackerNews({ limit: 1 }))
  assert.ok(out.every((o) => o.name === 'Widgetly'))
  assert.ok(out.every((o) => o.description === 'Show HN: Widgetly – an AI widget generator'))
})
