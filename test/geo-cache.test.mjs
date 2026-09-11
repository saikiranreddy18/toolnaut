import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// /api/geo returns a DIFFERENT answer per visitor, so it must never carry a
// shared-cache header.
//
// This shipped broken: `public, max-age=3600` put a per-visitor response into
// Vercel's CDN, which then served the first caller's country to everyone on
// earth for an hour. The symptom was that switching VPN region changed no
// prices — the page was reading a cached "IN" no matter where it was opened.
// Nothing failed, nothing logged, and it looked like a currency bug.
test('/api/geo is never shared-cached', () => {
  const src = readFileSync(join(root, 'api/geo.js'), 'utf8')
  const header = src.match(/Cache-Control['"],\s*['"]([^'"]+)['"]/)
  assert.ok(header, 'geo.js must set Cache-Control explicitly')
  const value = header[1].toLowerCase()
  assert.ok(
    !value.includes('public'),
    `Cache-Control is "${header[1]}" — "public" lets the CDN serve one visitor's country to everyone`,
  )
  assert.ok(
    value.includes('private') || value.includes('no-store'),
    `Cache-Control is "${header[1]}" — a per-visitor response needs private or no-store`,
  )
})

// The same trap applies to anything else keyed on the requesting visitor.
test('no endpoint reading the country header is publicly cached', () => {
  const files = ['api/geo.js', 'api/create-order.js', 'api/entitlement.js']
  for (const f of files) {
    let src
    try { src = readFileSync(join(root, f), 'utf8') } catch { continue }
    if (!/x-vercel-ip-country|countryOf\(/.test(src)) continue
    const m = src.match(/Cache-Control['"],\s*['"]([^'"]+)['"]/)
    if (!m) continue
    assert.ok(
      !m[1].toLowerCase().includes('public'),
      `${f} reads the visitor's country but sets Cache-Control: ${m[1]}`,
    )
  }
})
