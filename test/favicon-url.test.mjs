import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { getFaviconUrl } = await import('../src/utils/faviconUrl.js')

describe('getFaviconUrl', () => {
  test('builds a Google favicon URL from the tool website hostname', () => {
    const tool = { website: 'https://openai.com/chatgpt' }
    assert.equal(getFaviconUrl(tool), 'https://www.google.com/s2/favicons?domain=openai.com&sz=32')
  })

  test('respects a custom size', () => {
    const tool = { website: 'https://claude.ai' }
    assert.equal(getFaviconUrl(tool, 64), 'https://www.google.com/s2/favicons?domain=claude.ai&sz=64')
  })

  test('returns null when website is missing', () => {
    assert.equal(getFaviconUrl({}), null)
    assert.equal(getFaviconUrl({ website: '' }), null)
  })

  test('returns null for a malformed website URL', () => {
    assert.equal(getFaviconUrl({ website: 'not-a-url' }), null)
  })
})
