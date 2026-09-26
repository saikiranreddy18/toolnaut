import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findOverlaps } from '../src/utils/stackOverlap.js'

test('tools sharing a sourceCategory are flagged, unrelated tools are not', () => {
  const overlaps = findOverlaps([
    { name: 'ChatGPT', sourceCategory: 'LLMs & Chatbots' },
    { name: 'Claude', sourceCategory: 'LLMs & Chatbots' },
    { name: 'Figma', sourceCategory: 'Design & Prototyping' },
  ])
  assert.equal(overlaps.length, 1)
  assert.equal(overlaps[0].category, 'LLMs & Chatbots')
  assert.deepEqual(overlaps[0].tools.map((t) => t.name), ['ChatGPT', 'Claude'])
})

test('a starter-pick pair in the same category is not flagged', () => {
  const overlaps = findOverlaps([
    { name: 'ChatGPT', sourceCategory: 'LLMs & Chatbots', starter: true },
    { name: 'Claude', sourceCategory: 'LLMs & Chatbots', starter: true },
  ])
  assert.equal(overlaps.length, 0)
})

test('a starter tool overlapping with an added tool is still flagged', () => {
  const overlaps = findOverlaps([
    { name: 'ChatGPT', sourceCategory: 'LLMs & Chatbots', starter: true },
    { name: 'Claude', sourceCategory: 'LLMs & Chatbots' },
  ])
  assert.equal(overlaps.length, 1)
})

test('tools with no sourceCategory are ignored rather than grouped together', () => {
  assert.deepEqual(findOverlaps([{ name: 'a' }, { name: 'b' }, null, undefined]), [])
})

test('an empty or missing stack has no overlaps', () => {
  assert.deepEqual(findOverlaps([]), [])
  assert.deepEqual(findOverlaps(undefined), [])
})
