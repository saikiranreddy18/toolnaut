import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify } from '../dedup.js'

// Mirrors the store's key layout (s: slug, d: domain) so the test would catch a
// regression back to domain-keyed identity.
function memKnown(seed = []) {
  const known = new Set(seed)
  return {
    isKnown: (slug, d) => known.has(`s:${slug}`) || (d ? known.has(`d:${d}`) : false),
    markKnown(slug, d) {
      known.add(`s:${slug}`)
      if (d) known.add(`d:${d}`)
    },
  }
}

test('a known hostname never makes a new tool a duplicate', () => {
  // github.com / producthunt.com are shared fallback hosts — one repo being
  // known must not blacklist every other repo on the same host.
  const store = memKnown(['s:repo-one', 'd:github.com', 'd:producthunt.com'])
  assert.equal(classify({ name: 'Repo Two', url: 'https://github.com/acme/repo-two' }, store).status, 'new')
  assert.equal(classify({ name: 'Hunted Thing', url: 'https://www.producthunt.com/posts/x' }, store).status, 'new')
})

test('the slug alone decides known vs new', () => {
  const store = memKnown()
  const first = classify({ name: 'Repo One', url: 'https://github.com/acme/repo-one' }, store)
  assert.equal(first.status, 'new')
  assert.equal(first.slug, 'repo-one')
  store.markKnown(first.slug)
  assert.equal(classify({ name: 'Repo One', url: 'https://elsewhere.dev' }, store).status, 'skip')
  assert.equal(classify({ name: 'Repo Two', url: 'https://github.com/acme/repo-two' }, store).status, 'new')
})
