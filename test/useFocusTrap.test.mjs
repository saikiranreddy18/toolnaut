import test from 'node:test'
import assert from 'node:assert/strict'
import { wrapTarget } from '../src/hooks/useFocusTrap.js'

const [a, b, c] = ['first', 'middle', 'last']
const focusable = [a, b, c]

test('Tab from the last element wraps to the first', () => {
  assert.equal(wrapTarget(focusable, c, false), a)
})

test('Shift+Tab from the first element wraps to the last', () => {
  assert.equal(wrapTarget(focusable, a, true), c)
})

test('Tab from a middle element does not wrap', () => {
  assert.equal(wrapTarget(focusable, b, false), null)
  assert.equal(wrapTarget(focusable, b, true), null)
})

test('a single focusable element wraps to itself in both directions', () => {
  assert.equal(wrapTarget([a], a, false), a)
  assert.equal(wrapTarget([a], a, true), a)
})

test('an empty focusable set never wraps', () => {
  assert.equal(wrapTarget([], null, false), null)
  assert.equal(wrapTarget([], null, true), null)
})
