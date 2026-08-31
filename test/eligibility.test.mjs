import test from 'node:test'
import assert from 'node:assert/strict'
import {
  passesHardConstraints,
  partitionByEligibility,
  exclusionReason,
  hasHardConstraints,
} from '../src/utils/eligibility.js'
import { generatePersona } from '../src/utils/personaGenerator.js'
import { TOOLS } from '../src/utils/toolsCatalog.js'

const FREE = { domain: 'design', budget: 'free', experience: 'beginner', goal: 'ship' }
const DOMAINS = ['code', 'design', 'writing', 'data', 'automation', 'learning']

test('a free-only budget excludes paid tools', () => {
  assert.equal(passesHardConstraints({ price: 'paid' }, FREE), false)
})

test('freemium survives a free-only budget — it has a usable free tier', () => {
  // Not a detail. Excluding freemium collapses the design pool from 129 to 17
  // and makes the product useless for exactly the users it protects.
  assert.equal(passesHardConstraints({ price: 'freemium' }, FREE), true)
  assert.equal(passesHardConstraints({ price: 'free' }, FREE), true)
})

test('every other budget leaves paid tools eligible', () => {
  for (const budget of ['low', 'mid', 'high', 'company']) {
    assert.equal(
      passesHardConstraints({ price: 'paid' }, { ...FREE, budget }),
      true,
      `budget=${budget} should not exclude paid`,
    )
  }
})

test('an unanswered budget constrains nothing', () => {
  assert.equal(passesHardConstraints({ price: 'paid' }, {}), true)
  assert.equal(passesHardConstraints({ price: 'paid' }, null), true)
  assert.equal(hasHardConstraints({}), false)
  assert.equal(hasHardConstraints(FREE), true)
})

test('partition returns both halves and loses nothing', () => {
  const tools = TOOLS.filter((t) => t.category === 'design')
  const { eligible, excluded } = partitionByEligibility(tools, FREE)
  assert.equal(eligible.length + excluded.length, tools.length)
  assert.ok(eligible.every((t) => t.price !== 'paid'))
  assert.ok(excluded.every((t) => t.price === 'paid'))
  assert.ok(excluded.length > 0, 'design has paid tools, so some must be excluded')
})

test('an excluded tool can say why, in the user\'s own terms', () => {
  assert.match(exclusionReason({ price: 'paid' }, FREE), /free/i)
  assert.equal(exclusionReason({ price: 'freemium' }, FREE), null)
})

// The regression this whole module exists for.
test('no starter stack offers a paid tool to a free-only user, in any domain', () => {
  for (const domain of DOMAINS) {
    const persona = generatePersona({ ...FREE, domain })
    const paid = persona.stack.filter((t) => t.price === 'paid')
    assert.deepEqual(
      paid.map((t) => t.name),
      [],
      `${domain} offered paid tools to a free-only user`,
    )
  }
})

test('the filter never starves a starter stack', () => {
  // A hard filter that empties the result is worse than the bug it fixes.
  for (const domain of DOMAINS) {
    const persona = generatePersona({ ...FREE, domain })
    assert.equal(persona.stack.length, 3, `${domain} could not fill a starter stack`)
  }
})

test('excluded paid tools are surfaced, not silently dropped', () => {
  const persona = generatePersona({ ...FREE, domain: 'design' })
  assert.ok(persona.constrained, 'design has paid tools, so the filter should bite')
  assert.ok(persona.excludedByBudget.length > 0)
  assert.ok(persona.excludedByBudget.every((t) => t.price === 'paid'))
  // And they must NOT leak back into the recommendation.
  const slugs = new Set(persona.stack.map((t) => t.slug))
  assert.ok(persona.excludedByBudget.every((t) => !slugs.has(t.slug)))
})

test('paying users still get the paid flagship', () => {
  const persona = generatePersona({ ...FREE, budget: 'mid', domain: 'design' })
  assert.ok(persona.stack.some((t) => t.price === 'paid'))
  assert.equal(persona.constrained, false)
})
