import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, domainKey } from '../util/slug.js'

test('slugify lowercases, strips quotes/periods, and dashes the rest', () => {
  assert.equal(slugify(`Acme A.I. "Pro"`), 'acme-ai-pro')
  assert.equal(slugify('  Leading/Trailing Spaces  '), 'leading-trailing-spaces')
  assert.equal(slugify('C++ Tool!!'), 'c-tool')
})

test('slugify has no leading/trailing dashes and caps at 60 chars', () => {
  assert.equal(slugify('---edges---'), 'edges')
  const long = 'a'.repeat(80)
  const out = slugify(long)
  assert.equal(out.length, 60)
  assert.equal(out, 'a'.repeat(60))
})

test('slugify tolerates missing/non-string input', () => {
  assert.equal(slugify(undefined), '')
  assert.equal(slugify(null), '')
  assert.equal(slugify(''), '')
})

test('domainKey strips a www prefix and lowercases the host', () => {
  assert.equal(domainKey('https://WWW.Example.com/path?x=1'), 'example.com')
  assert.equal(domainKey('https://github.com/acme/repo'), 'github.com')
})

test('domainKey returns empty string for an unparsable URL', () => {
  assert.equal(domainKey('not-a-url'), '')
  assert.equal(domainKey(undefined), '')
})
