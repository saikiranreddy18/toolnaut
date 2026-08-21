import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchProductHunt } from '../sources/producthunt.js'

// Serves one canned GraphQL response instead of hitting the network.
async function withPosts(edges, fn) {
  const real = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ data: { posts: { edges } } }),
  })
  try {
    return await fn()
  } finally {
    globalThis.fetch = real
  }
}

test('without a token, returns [] and never calls fetch', async () => {
  const real = globalThis.fetch
  let called = false
  globalThis.fetch = async () => { called = true; throw new Error('should not be called') }
  try {
    const out = await fetchProductHunt({ limit: 5 })
    assert.deepEqual(out, [])
    assert.equal(called, false)
  } finally {
    globalThis.fetch = real
  }
})

test('maps a post, preferring website over url and tagline over name', async () => {
  const edges = [{ node: { name: 'Widgetly', tagline: 'An AI widget generator', website: 'https://widgetly.dev', url: 'https://producthunt.com/posts/widgetly' } }]
  const out = await withPosts(edges, () => fetchProductHunt({ token: 'x', limit: 1 }))
  assert.equal(out.length, 1)
  assert.equal(out[0].name, 'Widgetly')
  assert.equal(out[0].url, 'https://widgetly.dev')
  assert.equal(out[0].description, 'An AI widget generator')
  assert.equal(out[0].source, 'producthunt')
  assert.equal(out[0].sourceUrl, 'https://producthunt.com/posts/widgetly')
})

test('falls back to the Product Hunt url and name when website or tagline are missing', async () => {
  const edges = [{ node: { name: 'Widgetly', tagline: '', website: '', url: 'https://producthunt.com/posts/widgetly' } }]
  const out = await withPosts(edges, () => fetchProductHunt({ token: 'x', limit: 1 }))
  assert.equal(out[0].url, 'https://producthunt.com/posts/widgetly')
  assert.equal(out[0].description, 'Widgetly')
})

test('a response with no posts resolves to []', async () => {
  const out = await withPosts([], () => fetchProductHunt({ token: 'x', limit: 5 }))
  assert.deepEqual(out, [])
})

test('a non-OK response is swallowed and resolves to []', async () => {
  const real = globalThis.fetch
  // 404 fails fast (no retry backoff), unlike a 5xx which retry() treats as transient.
  globalThis.fetch = async () => ({ ok: false, status: 404, headers: new Headers(), json: async () => ({}) })
  try {
    const out = await fetchProductHunt({ token: 'x', limit: 1 })
    assert.deepEqual(out, [])
  } finally {
    globalThis.fetch = real
  }
})
