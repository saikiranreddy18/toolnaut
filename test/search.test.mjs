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

  test('multi-word query matches words in any order across fields, not just as one literal phrase', () => {
    const videoTool = {
      name: 'Kapwing',
      blurb: 'Edit videos online with an AI-powered editor',
      sourceCategory: 'Video Editing',
      dev: 'Kapwing Inc',
      tags: ['video', 'editing'],
    }
    // "video editor" is not a literal substring anywhere above (it's
    // "videos online with an AI-powered editor"), but both words are present.
    assert.equal(matchesQuery(videoTool, 'video editor'), true)
  })

  test('multi-word query still requires every word to be present somewhere', () => {
    assert.equal(matchesQuery(TOOL, 'coding spreadsheet'), false)
  })

  test('multi-word literal-phrase queries that matched before still match', () => {
    assert.equal(matchesQuery(TOOL, 'long documents'), true)
  })
})
