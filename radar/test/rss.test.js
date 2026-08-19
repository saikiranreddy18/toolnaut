import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchRSS } from '../sources/rss.js'

// Serves one canned feed body instead of hitting the network.
async function withFeed(xml, fn) {
  const real = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Headers(), text: async () => xml })
  try {
    return await fn()
  } finally {
    globalThis.fetch = real
  }
}

test('decodes XML entities in RSS titles and links', async () => {
  const xml = `<rss><channel><item>
    <title>Ink &amp; Pixel &#8212; Studio</title>
    <link>https://ink.dev/?ref=feed&amp;utm=rss</link>
    <description>Design &lt;stuff&gt;</description>
  </item></channel></rss>`
  const out = await withFeed(xml, () => fetchRSS({ feeds: ['https://feed.test/rss'] }))
  assert.equal(out.length, 1)
  assert.equal(out[0].name, 'Ink & Pixel — Studio')
  assert.equal(out[0].url, 'https://ink.dev/?ref=feed&utm=rss')
  assert.equal(out[0].description, 'Design <stuff>')
})

test('decodes entities in an Atom link href, and &amp; is decoded last', async () => {
  const xml = `<feed><entry>
    <title>Bolt &amp;amp; Co</title>
    <link rel="alternate" href="https://bolt.dev/a?x=1&amp;y=2"/>
    <summary>s</summary>
  </entry></feed>`
  const out = await withFeed(xml, () => fetchRSS({ feeds: ['https://feed.test/atom'] }))
  assert.equal(out.length, 1)
  assert.equal(out[0].url, 'https://bolt.dev/a?x=1&y=2')
  assert.equal(out[0].name, 'Bolt &amp; Co') // double-escaped stays escaped once
})
