import test from 'node:test'
import assert from 'node:assert/strict'
import { TOOLS } from '../src/utils/toolsCatalog.js'
import { matchScore, fitBand } from '../src/utils/matchScore.js'

const base = { domain: 'automation', budget: 'mid', experience: 'regular', goal: 'ship' }
const DOMAINS = ['code', 'design', 'writing', 'data', 'automation', 'learning']

const rank = (answers, n) =>
  TOOLS
    .map((t) => ({ t, s: matchScore(t, answers) }))
    .sort((a, b) => b.s - a.s || a.t.name.localeCompare(b.t.name))
    .slice(0, n)

// ── the score must not saturate ──────────────────────────────────────────────

test('the score does not pin at its ceiling', () => {
  // With a baseline of 50 the bonuses overflowed 99 and an automation persona
  // had 114 of 133 in-domain tools tied at exactly 99 — their ordering was the
  // alphabetical tiebreaker, not fit. Any regression to that is a real bug.
  for (const domain of DOMAINS) {
    const answers = { ...base, domain }
    const inDomain = TOOLS.filter((t) => t.category === domain)
    const at99 = inDomain.filter((t) => matchScore(t, answers) === 99).length
    assert.equal(at99, 0, `${domain}: ${at99} tools pinned at the ceiling`)
  }
})

test('scores spread across a usable range', () => {
  const scores = TOOLS.map((t) => matchScore(t, { ...base, role: 'developer' }))
  const distinct = new Set(scores).size
  assert.ok(distinct >= 15, `only ${distinct} distinct scores — the scale is collapsing`)
  assert.ok(Math.max(...scores) <= 99)
  assert.ok(Math.min(...scores) >= 20)
})

// ── role must actually change what people see ────────────────────────────────

test('role reorders tools inside the same domain', () => {
  // Keyed on category this was decorative: a flat per-category bonus shifts
  // every in-domain tool equally and reorders nothing. It is keyed on
  // sourceCategory precisely so a developer and a manager who both chose
  // automation get different tools.
  const dev = rank({ ...base, role: 'developer' }, 60).map((x) => x.t.name).join()
  const mgr = rank({ ...base, role: 'manager' }, 60).map((x) => x.t.name).join()
  assert.notEqual(dev, mgr, 'developer and manager saw an identical list')
})

test('a developer gets build-it-yourself automation, a manager gets no-code', () => {
  const devTop = rank({ ...base, role: 'developer' }, 5)
  const mgrTop = rank({ ...base, role: 'manager' }, 5)
  assert.ok(
    devTop.every((x) => x.t.sourceCategory === 'AI Agents & Automation'),
    'developer top picks left AI Agents & Automation',
  )
  assert.ok(
    mgrTop.every((x) => x.t.sourceCategory === 'Productivity & Meetings'),
    'manager top picks left Productivity & Meetings',
  )
})

test('role never outranks the domain the person actually chose', () => {
  // Role refines; it must not drag someone out of their own domain. A designer
  // who says "automation" still gets automation tools first.
  const top = rank({ ...base, domain: 'automation', role: 'designer' }, 20)
  assert.ok(top.every((x) => x.t.category === 'automation'))
})

// ── bands must discriminate ──────────────────────────────────────────────────

test('the fit bands are selective rather than universal', () => {
  // Before the baseline fix every in-domain tool scored 99 and every card read
  // "Strong fit", which tells the reader nothing.
  const answers = { ...base, role: 'developer' }
  const bands = TOOLS.map((t) => fitBand(matchScore(t, answers))?.key || 'none')
  const strong = bands.filter((b) => b === 'strong').length
  const share = strong / bands.length
  assert.ok(share > 0.001, 'Strong fit is unreachable')
  assert.ok(share < 0.25, `Strong fit covers ${(share * 100).toFixed(1)}% — not selective`)
  assert.ok(new Set(bands).size >= 3, 'bands do not discriminate')
})

test('a weak match earns no badge at all', () => {
  const answers = { domain: 'data', budget: 'free', experience: 'beginner', goal: 'ship', role: 'analyst' }
  const worst = TOOLS
    .map((t) => ({ t, s: matchScore(t, answers) }))
    .sort((a, b) => a.s - b.s)[0]
  assert.equal(fitBand(worst.s), null, `worst tool (${worst.s}) should carry no badge`)
})
