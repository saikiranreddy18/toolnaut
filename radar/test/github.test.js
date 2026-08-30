import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchGitHub } from '../sources/github.js'

// Serves one canned search response instead of hitting the network.
async function withItems(items, fn) {
  const real = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ items }) })
  try {
    return await fn()
  } finally {
    globalThis.fetch = real
  }
}

test('maps a repo, preferring homepage over html_url', async () => {
  const items = [{
    name: 'widgetly', description: 'An AI widget generator',
    homepage: 'https://widgetly.dev', html_url: 'https://github.com/x/widgetly',
    stargazers_count: 12, language: 'TypeScript', owner: { login: 'x' },
    forks_count: 3, open_issues_count: 7, license: { spdx_id: 'MIT' }, archived: false,
    topics: ['ai', 'cli'], pushed_at: '2026-08-20T00:00:00Z', created_at: '2026-01-02T00:00:00Z',
  }]
  const out = await withItems(items, () => fetchGitHub({ limit: 1 }))
  assert.equal(out.length, 1)
  assert.equal(out[0].name, 'widgetly')
  assert.equal(out[0].url, 'https://widgetly.dev')
  assert.equal(out[0].description, 'An AI widget generator')
  assert.equal(out[0].source, 'github')
  assert.equal(out[0].sourceUrl, 'https://github.com/x/widgetly')
  assert.deepEqual(out[0].raw, {
    stars: 12, lang: 'TypeScript', owner: 'x',
    forks: 3, openIssues: 7, license: 'MIT', archived: false,
    topics: ['ai', 'cli'], pushedAt: '2026-08-20T00:00:00Z', createdAt: '2026-01-02T00:00:00Z',
  })
})

// The scorecard reads raw.pushedAt / license / topics. An older GitHub response
// that omits them must map to nulls, not to undefined keys that read as
// "archived: undefined" downstream.
test('a repo with no license, topics or timestamps maps to explicit nulls', async () => {
  const items = [{ name: 'bare', description: 'x', html_url: 'https://github.com/x/bare', stargazers_count: 0, owner: { login: 'x' } }]
  const out = await withItems(items, () => fetchGitHub({ limit: 1 }))
  assert.equal(out[0].raw.license, null)
  assert.equal(out[0].raw.pushedAt, null)
  assert.equal(out[0].raw.createdAt, null)
  assert.equal(out[0].raw.archived, false)
  assert.deepEqual(out[0].raw.topics, [])
})

test('falls back to html_url and repo name when homepage or description are missing', async () => {
  const items = [{ name: 'widgetly', description: '', homepage: '', html_url: 'https://github.com/x/widgetly', stargazers_count: 0, language: null, owner: null }]
  const out = await withItems(items, () => fetchGitHub({ limit: 1 }))
  assert.equal(out[0].url, 'https://github.com/x/widgetly')
  assert.equal(out[0].description, 'widgetly')
  assert.equal(out[0].raw.owner, undefined)
})

test('a response with no items resolves to []', async () => {
  const out = await withItems([], () => fetchGitHub({ limit: 5 }))
  assert.deepEqual(out, [])
})

test('a non-OK response is swallowed and resolves to []', async () => {
  const real = globalThis.fetch
  // 404 fails fast (no retry backoff), unlike a 5xx which retry() treats as transient.
  globalThis.fetch = async () => ({ ok: false, status: 404, headers: new Headers(), json: async () => ({}) })
  try {
    const out = await fetchGitHub({ limit: 1 })
    assert.deepEqual(out, [])
  } finally {
    globalThis.fetch = real
  }
})

test('a token is sent as a bearer authorization header', async () => {
  const real = globalThis.fetch
  let seenHeaders
  globalThis.fetch = async (url, opts) => {
    seenHeaders = opts.headers
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ items: [] }) }
  }
  try {
    await fetchGitHub({ token: 'gh-secret', limit: 1 })
    assert.equal(seenHeaders.authorization, 'Bearer gh-secret')
  } finally {
    globalThis.fetch = real
  }
})

test('without a token, no authorization header is sent', async () => {
  const real = globalThis.fetch
  let seenHeaders
  globalThis.fetch = async (url, opts) => {
    seenHeaders = opts.headers
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ items: [] }) }
  }
  try {
    await fetchGitHub({ limit: 1 })
    assert.equal(seenHeaders.authorization, undefined)
  } finally {
    globalThis.fetch = real
  }
})
