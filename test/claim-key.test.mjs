// The reviewer's required cases for the claim_key normaliser, verbatim, plus
// the DB-contract check: every output must satisfy the CHECK constraint in
// 0003_tool_claims.sql ('^[a-z0-9._-]*$') or the write fails anyway.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { toClaimKey, claimKeyCollisions } from '../src/utils/claimKey.js'

const DB_CHECK = /^[a-z0-9._-]*$/

describe('toClaimKey', () => {
  const cases = [
    ['Slack', 'slack'],
    [' slack', 'slack'],
    ['SLACK', 'slack'],
    ['Google Sheets', 'google-sheets'],
    ['Google   Sheets', 'google-sheets'],
    ['Notion AI', 'notion-ai'],
    ['n8n', 'n8n'],
    ['Pro Plan', 'pro-plan'],
    ['API', 'api'],
    ['GPT-4.1', 'gpt-4.1'],
    ['Zapier for Teams', 'zapier-for-teams'],
    ['C++ SDK', 'c-sdk'],
  ]
  for (const [input, expected] of cases) {
    test(`${JSON.stringify(input)} -> ${expected}`, () => {
      assert.equal(toClaimKey(input), expected)
    })
  }

  test('blank and whitespace normalise to empty — caller decides legality', () => {
    assert.equal(toClaimKey(''), '')
    assert.equal(toClaimKey('   '), '')
    assert.equal(toClaimKey(undefined), '')
  })

  test('punctuation-only collapses to empty rather than junk', () => {
    assert.equal(toClaimKey('+++'), '')
    assert.equal(toClaimKey('!!!'), '')
  })

  test('every output satisfies the database CHECK constraint', () => {
    const nasty = ['Slack', 'C++ SDK', 'GPT-4.1', '  weird  NAME!! ', '--lead-trail--', 'ünïcode Tool', '💡 Idea Bot']
    for (const n of nasty) {
      assert.match(toClaimKey(n), DB_CHECK, `output for ${JSON.stringify(n)} violates the DB regex`)
    }
  })

  test('no leading or trailing separators survive', () => {
    assert.equal(toClaimKey('  -pro plan- '), 'pro-plan')
    assert.equal(toClaimKey('.hidden.'), 'hidden')
  })
})

describe('claimKeyCollisions', () => {
  test('distinct names with distinct keys — no collisions', () => {
    assert.deepEqual(claimKeyCollisions(['Slack', 'Telegram', 'Google Sheets']), [])
  })

  test('detects the C++ SDK / C SDK collapse and names both spellings', () => {
    const out = claimKeyCollisions(['C++ SDK', 'C SDK', 'Slack'])
    assert.equal(out.length, 1)
    assert.equal(out[0].key, 'c-sdk')
    assert.deepEqual(out[0].inputs.sort(), ['C SDK', 'C++ SDK'])
  })

  test('same spelling repeated is not a collision — idempotent re-import', () => {
    assert.deepEqual(claimKeyCollisions(['Slack', 'Slack', 'slack ']), [])
    // 'Slack' and 'slack ' are the SAME fact differently typed; both map to
    // one key and one canonical row, which is the entire point.
  })

  test('empties never collide — they are a validation concern', () => {
    assert.deepEqual(claimKeyCollisions(['', '  ', '+++']), [])
  })
})
