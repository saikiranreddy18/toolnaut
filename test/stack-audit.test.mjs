import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditStack, clusterByOverlap, freeCoverFor, overlapScore } from '../src/utils/stackAudit.js'

// A small hand-made catalogue: two chat assistants that overlap, one video tool
// that does not, and a free assistant that can cover the pair.
const CHAT_A = { slug: 'chat-a', name: 'Chat A', category: 'writing', sourceCategory: 'LLMs & Chatbots', price: 'paid', tags: ['writing', 'chat', 'assistant'], year: 2023 }
const CHAT_B = { slug: 'chat-b', name: 'Chat B', category: 'writing', sourceCategory: 'LLMs & Chatbots', price: 'paid', tags: ['writing', 'chat'], year: 2024 }
const VIDEO = { slug: 'vid', name: 'Vid', category: 'design', sourceCategory: 'Video Generation', price: 'paid', tags: ['video', 'editing'], year: 2024 }
// Named after a real flagship on purpose: only tools from the curated flagship
// lists may be offered as a replacement, so an invented name would (correctly)
// never be suggested.
const FREE_CHAT = { slug: 'free-chat', name: 'Grammarly', category: 'writing', sourceCategory: 'LLMs & Chatbots', price: 'free', tags: ['writing', 'chat'], year: 2024, status: 'Active' }
const CATALOG = [CHAT_A, CHAT_B, VIDEO, FREE_CHAT]

test('tools doing the same job overlap; unrelated tools do not', () => {
  assert.ok(overlapScore(CHAT_A, CHAT_B) > 0.6)
  assert.ok(overlapScore(CHAT_A, VIDEO) < 0.1)
  assert.equal(overlapScore(CHAT_A, CHAT_A), 0, 'a tool never overlaps itself')
})

test('clustering groups the duplicates and leaves singles out', () => {
  const { clusters } = clusterByOverlap([CHAT_A, CHAT_B, VIDEO])
  assert.equal(clusters.length, 1)
  assert.deepEqual(clusters[0].map((t) => t.slug).sort(), ['chat-a', 'chat-b'])
})

test('a free tool is only offered when it actually covers the paid one', () => {
  assert.equal(freeCoverFor(CHAT_A, { catalog: CATALOG })?.tool.slug, 'free-chat')
  assert.equal(freeCoverFor(VIDEO, { catalog: CATALOG }), null, 'no free video tool in this catalogue')
})

test('an obscure free tool is never offered as a replacement', () => {
  const OBSCURE = { ...CHAT_A, slug: 'nobody-knows', name: 'Zzz Chat 9000', price: 'free' }
  assert.equal(freeCoverFor(CHAT_A, { catalog: [OBSCURE] }), null)
})

test('savings come only from what the person says they pay', () => {
  const r = auditStack(
    [{ slug: 'chat-a', monthly: 1600 }, { slug: 'chat-b', monthly: 900 }, { slug: 'vid', monthly: 0 }],
    { catalog: CATALOG },
  )
  assert.equal(r.monthlyTotal, 2500)
  assert.equal(r.duplicates.length, 1)
  // Same fit (no quiz answers), so the cheaper one is kept and the dearer one goes.
  assert.equal(r.duplicates[0].keeper.slug, 'chat-b')
  assert.equal(r.duplicates[0].drop[0].tool.slug, 'chat-a')
  assert.equal(r.monthlySaving, 1600)
  assert.equal(r.annualSaving, 1600 * 12)
})

test('an unpriced duplicate saves nothing, and is still reported', () => {
  const r = auditStack([{ slug: 'chat-a' }, { slug: 'chat-b' }], { catalog: CATALOG })
  assert.equal(r.duplicates.length, 1)
  assert.equal(r.monthlySaving, 0, 'never invents a price for a tool the user did not price')
  assert.equal(r.monthlyTotal, 0)
})

test('role fit decides the keeper when quiz answers exist', () => {
  // A designer's answers: matchScore rewards the design domain, so the design
  // tool wins its cluster even though it costs more.
  const DESIGN_A = { ...CHAT_A, slug: 'd-a', category: 'design', sourceCategory: 'Image Generation & Editing', tags: ['design', 'image'] }
  const DESIGN_B = { ...CHAT_B, slug: 'd-b', category: 'design', sourceCategory: 'Image Generation & Editing', tags: ['design', 'image'] }
  const r = auditStack(
    [{ slug: 'd-a', monthly: 500 }, { slug: 'd-b', monthly: 200 }],
    { catalog: [DESIGN_A, DESIGN_B], answers: { domain: 'design', experience: 'some', budget: 'paid' } },
  )
  assert.equal(r.duplicates.length, 1)
  assert.equal(r.duplicates[0].drop.length, 1)
  assert.equal(r.monthlySaving, r.duplicates[0].drop[0].monthly)
})

test('a clean stack scores 100 and reports nothing to cut', () => {
  const r = auditStack([{ slug: 'vid', monthly: 700 }], { catalog: [VIDEO] })
  assert.equal(r.duplicates.length, 0)
  assert.equal(r.freeSwaps.length, 0)
  assert.equal(r.monthlySaving, 0)
  assert.equal(r.health, 100)
})

test('health drops when the stack is redundant', () => {
  const messy = auditStack(
    [{ slug: 'chat-a', monthly: 1600 }, { slug: 'chat-b', monthly: 900 }],
    { catalog: CATALOG },
  )
  assert.ok(messy.health < 70, `expected a low score, got ${messy.health}`)
})

test('a paid tool a free one covers is flagged, without double counting a dropped one', () => {
  const r = auditStack(
    [{ slug: 'chat-a', monthly: 1600 }, { slug: 'chat-b', monthly: 900 }],
    { catalog: CATALOG },
  )
  const flagged = r.freeSwaps.map((s) => s.tool.slug)
  assert.ok(!flagged.includes('chat-a'), 'already counted as a duplicate to drop')
  assert.deepEqual(flagged, ['chat-b'])
  assert.equal(r.freeSwaps[0].alternative.slug, 'free-chat')
})

test('unknown slugs are ignored rather than crashing the audit', () => {
  const r = auditStack([{ slug: 'nope', monthly: 999 }, { slug: 'vid', monthly: 100 }], { catalog: CATALOG })
  assert.equal(r.toolCount, 1)
  assert.equal(r.monthlyTotal, 100)
})
