import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateValue } from '../src/utils/stackValue.js'

test('multiplies hours saved by hourly value into a weekly and monthly figure', () => {
  const r = estimateValue({ hoursSavedPerWeek: '5', hourlyValue: '20' })
  assert.equal(r.weeklyValue, 100)
  assert.equal(r.monthlyValue, 433)
})

test('returns null until both inputs are present and positive', () => {
  assert.equal(estimateValue({ hoursSavedPerWeek: '', hourlyValue: '20' }), null)
  assert.equal(estimateValue({ hoursSavedPerWeek: '5', hourlyValue: '' }), null)
  assert.equal(estimateValue({ hoursSavedPerWeek: '0', hourlyValue: '20' }), null)
  assert.equal(estimateValue({ hoursSavedPerWeek: '5', hourlyValue: '0' }), null)
})

test('never guesses on non-numeric input', () => {
  assert.equal(estimateValue({ hoursSavedPerWeek: 'a lot', hourlyValue: '20' }), null)
  assert.equal(estimateValue({ hoursSavedPerWeek: '-5', hourlyValue: '20' }), null)
})
