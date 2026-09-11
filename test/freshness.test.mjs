import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newestDiscovery, formatUpdated, stampSitemap } from '../src/utils/freshness.js'

const SITE = 'https://toolnaut.xyz'

test('newestDiscovery picks the latest real date and ignores the rest', () => {
  const tools = [
    { slug: 'a', discoveredAt: '2026-09-01T10:00:00Z' },
    { slug: 'b', discoveredAt: '2026-09-10T23:24:02.732Z' },
    { slug: 'c' },                              // bundled tool: never dated
    { slug: 'd', discoveredAt: 'not a date' },
    null,
  ]
  assert.equal(newestDiscovery(tools), '2026-09-10T23:24:02.732Z')
})

test('nothing dated means no date, never the current time', () => {
  assert.equal(newestDiscovery([{ slug: 'x' }, { slug: 'y', discoveredAt: '' }]), null)
  assert.equal(newestDiscovery([]), null)
  assert.equal(newestDiscovery(undefined), null)
})

test('the visible date is the Indian calendar date', () => {
  // 23:24 UTC on the 10th is 04:54 IST on the 11th.
  assert.equal(formatUpdated('2026-09-10T23:24:02.732Z'), '11 Sep 2026')
  assert.equal(formatUpdated('2026-09-10T10:00:00Z'), '10 Sep 2026')
  assert.equal(formatUpdated('garbage'), null)
})

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><changefreq>weekly</changefreq></url>
  <url><loc>${SITE}/new</loc><changefreq>daily</changefreq></url>
  <url><loc>${SITE}/tools/code</loc><changefreq>weekly</changefreq></url>
  <url><loc>${SITE}/tools/design</loc><changefreq>weekly</changefreq></url>
  <url><loc>${SITE}/pricing</loc><changefreq>monthly</changefreq></url>
</urlset>`

const TOOLS = [
  { slug: 'c1', category: 'code', discoveredAt: '2026-09-05T08:00:00Z' },
  { slug: 'c2', category: 'code', discoveredAt: '2026-09-09T08:00:00Z' },
  { slug: 'w1', category: 'writing', discoveredAt: '2026-09-10T08:00:00Z' },
  { slug: 'd1', category: 'design' },           // no date in this category
]

test('only pages whose change is known get a lastmod, each with its own date', () => {
  const { xml, stamped } = stampSitemap(SITEMAP, TOOLS, SITE)
  assert.match(xml, /<loc>https:\/\/toolnaut\.xyz\/new<\/loc><lastmod>2026-09-10T08:00:00\.000Z<\/lastmod>/)
  assert.match(xml, /<loc>https:\/\/toolnaut\.xyz\/tools\/code<\/loc><lastmod>2026-09-09T08:00:00\.000Z<\/lastmod>/)
  assert.deepEqual(stamped.sort(), [`${SITE}/new`, `${SITE}/tools/code`])
})

test('static pages and undated categories are left alone', () => {
  const { xml } = stampSitemap(SITEMAP, TOOLS, SITE)
  for (const path of ['/', '/pricing', '/tools/design']) {
    const block = xml.match(new RegExp(`<url><loc>${SITE}${path.replace(/\//g, '\\/')}</loc>[^\\n]*</url>`))?.[0]
    assert.ok(block, `${path} must still be in the sitemap`)
    assert.doesNotMatch(block, /<lastmod>/, `${path} must not get an invented date`)
  }
})

test('a category with tools but no sitemap entry is ignored, and re-running never duplicates', () => {
  const once = stampSitemap(SITEMAP, TOOLS, SITE).xml
  assert.doesNotMatch(once, /tools\/writing/, 'no entry is invented for a category the sitemap lacks')
  const twice = stampSitemap(once, TOOLS, SITE)
  assert.equal(twice.stamped.length, 0)
  assert.equal((twice.xml.match(/<lastmod>/g) || []).length, 2)
})

test('no tools at all leaves the sitemap byte-for-byte unchanged', () => {
  const { xml, stamped } = stampSitemap(SITEMAP, [], SITE)
  assert.equal(xml, SITEMAP)
  assert.equal(stamped.length, 0)
})
