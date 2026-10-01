import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateApiCost } from '../src/utils/apiCost.js'

const gpt = { inputPer1M: 5, outputPer1M: 30 }

test('multiplies daily requests by token shape and price into a monthly figure', () => {
  const r = estimateApiCost({ ...gpt, requestsPerDay: '1000', avgInputTokens: '1000', avgOutputTokens: '500' })
  assert.equal(r.dailyCost, 20) // (1000*1000/1e6)*5 + (1000*500/1e6)*30 = 5 + 15
  assert.ok(Math.abs(r.monthlyCost - r.dailyCost * 30.44) < 1e-9)
})

test('returns null until requests per day is present and positive', () => {
  assert.equal(estimateApiCost({ ...gpt, requestsPerDay: '', avgInputTokens: '100', avgOutputTokens: '50' }), null)
  assert.equal(estimateApiCost({ ...gpt, requestsPerDay: '0', avgInputTokens: '100', avgOutputTokens: '50' }), null)
})

test('returns null when both token counts are zero or either is negative', () => {
  assert.equal(estimateApiCost({ ...gpt, requestsPerDay: '10', avgInputTokens: '0', avgOutputTokens: '0' }), null)
  assert.equal(estimateApiCost({ ...gpt, requestsPerDay: '10', avgInputTokens: '-5', avgOutputTokens: '50' }), null)
})

test('never guesses on non-numeric input', () => {
  assert.equal(estimateApiCost({ ...gpt, requestsPerDay: 'lots', avgInputTokens: '100', avgOutputTokens: '50' }), null)
})

test('output-only usage still costs something', () => {
  const r = estimateApiCost({ ...gpt, requestsPerDay: '10', avgInputTokens: '0', avgOutputTokens: '1000000' })
  assert.equal(r.dailyCost, 300)
})
