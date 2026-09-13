import { test } from 'node:test'
import assert from 'node:assert/strict'
import { costBreakdown, costSummary } from '../src/utils/stackCost.js'

test('counts each price type and never guesses an unpriced tool into a bucket', () => {
  const b = costBreakdown([
    { price: 'free' }, { price: 'free' }, { price: 'freemium' },
    { price: 'paid' }, { name: 'hand-added, no price' }, { price: 'weird' }, null,
  ])
  assert.deepEqual(b, { free: 2, freemium: 1, paid: 1, unknown: 3 })
})

test('an all-free stack says there is nothing to pay for', () => {
  assert.equal(costSummary(costBreakdown([{ price: 'free' }, { price: 'freemium' }])), '1 free, 1 freemium — nothing to pay for')
})

test('paid or unpriced tools never get the "nothing to pay for" claim', () => {
  assert.doesNotMatch(costSummary(costBreakdown([{ price: 'free' }, { price: 'paid' }])), /nothing to pay/)
  assert.doesNotMatch(costSummary(costBreakdown([{ price: 'free' }, {}])), /nothing to pay/)
})

test('an empty stack says so rather than implying it is free', () => {
  assert.equal(costSummary(costBreakdown([])), 'No tools yet')
})
