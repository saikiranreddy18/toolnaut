import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateCode, hashCode, normalizeCode, checkCode, cooldownLeft,
  CODE_TTL_MS, MAX_ATTEMPTS, RESEND_COOLDOWN_MS, REASON_MESSAGES,
} from '../api/_accountDeletion.js'

const PEPPER = 'server_secret_for_tests_only'
const USER = '11111111-1111-4111-8111-111111111111'
const NOW = Date.parse('2026-09-11T12:00:00Z')

const issue = (code, over = {}) => ({
  code_hash: hashCode(USER, code, PEPPER),
  expires_at: new Date(NOW + CODE_TTL_MS).toISOString(),
  attempts: 0,
  sent_at: new Date(NOW).toISOString(),
  ...over,
})

test('codes are six digits and not predictable', () => {
  const seen = new Set()
  for (let i = 0; i < 2000; i++) {
    const c = generateCode()
    assert.match(c, /^\d{6}$/)
    seen.add(c)
  }
  assert.ok(seen.size > 1900, `expected near-unique codes, got ${seen.size} distinct of 2000`)
})

test('the right code confirms, and spaces pasted from an email are fine', () => {
  const rec = issue('042917')
  assert.deepEqual(checkCode(rec, '042917', { userId: USER, pepper: PEPPER, now: NOW }), { ok: true })
  assert.deepEqual(checkCode(rec, ' 042 917 ', { userId: USER, pepper: PEPPER, now: NOW }), { ok: true })
})

test('a wrong or malformed code is refused', () => {
  const rec = issue('042917')
  for (const bad of ['042918', '42917', '0429170', 'abcdef', '', null, undefined]) {
    assert.equal(checkCode(rec, bad, { userId: USER, pepper: PEPPER, now: NOW }).reason, 'wrong', `${bad}`)
  }
})

test("a code issued to one account can never delete another", () => {
  const rec = issue('042917')
  const other = '22222222-2222-4222-8222-222222222222'
  assert.equal(checkCode(rec, '042917', { userId: other, pepper: PEPPER, now: NOW }).reason, 'wrong')
})

test('an expired code is refused even when it is the right one', () => {
  const rec = issue('042917')
  assert.equal(checkCode(rec, '042917', { userId: USER, pepper: PEPPER, now: NOW + CODE_TTL_MS }).reason, 'expired')
})

test('after the attempt limit the code is dead, right or not', () => {
  const rec = issue('042917', { attempts: MAX_ATTEMPTS })
  assert.equal(checkCode(rec, '042917', { userId: USER, pepper: PEPPER, now: NOW }).reason, 'locked')
})

test('no record means no code was sent', () => {
  assert.equal(checkCode(null, '042917', { userId: USER, pepper: PEPPER, now: NOW }).reason, 'none')
})

test('the stored hash is not the code, and needs the server secret', () => {
  const h = hashCode(USER, '042917', PEPPER)
  assert.ok(!h.includes('042917'))
  assert.notEqual(h, hashCode(USER, '042917', 'a_different_secret'))
  assert.throws(() => hashCode(USER, '042917', ''))
})

test('a new code waits out the cooldown', () => {
  const rec = issue('042917')
  assert.equal(cooldownLeft(rec, NOW), RESEND_COOLDOWN_MS)
  assert.equal(cooldownLeft(rec, NOW + RESEND_COOLDOWN_MS), 0)
  assert.equal(cooldownLeft(null, NOW), 0)
})

test('normalizeCode and every refusal has words for the person', () => {
  assert.equal(normalizeCode('12 34 56'), '123456')
  assert.equal(normalizeCode('12-34-56'), null)
  for (const r of ['none', 'expired', 'locked', 'wrong']) assert.ok(REASON_MESSAGES[r], r)
})
