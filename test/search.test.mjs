// matchesQuery is shared by the session-gated Discover search box and the
// public /search page — a regression here silently breaks both at once.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { matchesQuery } = await import('../src/utils/search.js')

const TOOL = {
  name: 'Claude',
  blurb: 'AI assistant for writing, analysis, coding and long documents',
  sourceCategory: 'LLMs & Chatbots',
  dev: 'Anthropic',
  tags: ['writing', 'coding', 'assistant'],
}

describe('matchesQuery', () => {
  test('empty query matches everything', () => {
    assert.equal(matchesQuery(TOOL, ''), true)
    assert.equal(matchesQuery(TOOL, '   '), true)
  })

  test('matches on name, case-insensitively', () => {
    assert.equal(matchesQuery(TOOL, 'claude'), true)
    assert.equal(matchesQuery(TOOL, 'CLAUDE'), true)
  })

  test('matches on blurb substring', () => {
    assert.equal(matchesQuery(TOOL, 'long documents'), true)
  })

  test('matches on sourceCategory', () => {
    assert.equal(matchesQuery(TOOL, 'chatbots'), true)
  })

  test('matches on dev, and tolerates a missing dev field', () => {
    assert.equal(matchesQuery(TOOL, 'anthropic'), true)
    assert.equal(matchesQuery({ ...TOOL, dev: undefined }, 'anthropic'), false)
  })

  test('matches on tags', () => {
    assert.equal(matchesQuery(TOOL, 'coding'), true)
  })

  test('no match returns false', () => {
    assert.equal(matchesQuery(TOOL, 'spreadsheet'), false)
  })
})
