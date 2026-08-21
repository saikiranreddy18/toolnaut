import { test } from 'node:test'
import assert from 'node:assert/strict'
import { enrich } from '../enrich.js'

// No LLM key is set in this environment, so enrich() always falls through to
// enrichFallback — the deterministic classifier this repo relies on when no
// LLM is configured (see enrich.js's own top comment).

test('classifyDomain falls back to automation when no domain keyword matches', async () => {
  const record = await enrich(
    { name: 'Zorvane', url: 'https://zorvane.example', description: 'Turnip badger hallway lumber cabinet doorway.', source: 'test', sourceUrl: 'https://x/1' },
    'zorvane',
    { now: '2026-01-01T00:00:00Z' },
  )
  assert.equal(record.category, 'automation')
})

test('firstSentence truncates to 97 chars plus an ellipsis past the 100-char cutoff', async () => {
  const record = await enrich(
    { name: 'LongDescTool', url: 'https://longdesc.example', description: 'x'.repeat(150), source: 'test', sourceUrl: 'https://x/2' },
    'longdesctool',
    { now: '2026-01-01T00:00:00Z' },
  )
  assert.equal(record.blurb, `${'x'.repeat(97)}…`)
})

test('extractTags seeds with the domain and caps at 5 tags', async () => {
  const record = await enrich(
    {
      name: 'SuperAgent',
      url: 'https://superagent.example',
      description: 'agent chat image video voice code api data automation writing search collaboration tool',
      source: 'test',
      sourceUrl: 'https://x/3',
    },
    'superagent',
    { now: '2026-01-01T00:00:00Z' },
  )
  assert.ok(record.tags.length <= 5)
  assert.ok(record.tags.includes(record.category))
})
