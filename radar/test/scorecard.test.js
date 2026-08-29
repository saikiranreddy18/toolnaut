import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CRITERIA, RADAR_LABELS, assessmentFrom, isValidScorecard, labelFor, measureSignals,
  measuredScores, normalizeAssessment, publicScorecard, recommendationFor, scoreTool,
  shouldPersistRescore,
} from '../scorecard.js'

const NOW = '2026-08-29T00:00:00Z'

const ghCandidate = (raw = {}) => ({
  name: 'Widgetly',
  url: 'https://widgetly.dev',
  description: 'An AI widget generator',
  source: 'github',
  raw: { stars: 100, forks: 10, license: 'MIT', archived: false, topics: [], pushedAt: '2026-08-26T00:00:00Z', createdAt: '2025-06-01T00:00:00Z', ...raw },
})

const completeAutomation = {
  trigger: 'a new row in the sheet',
  input: 'the row plus the customer record',
  aiStep: 'classifies the request and drafts a reply',
  action: 'creates a ticket and posts to Slack',
  humanControl: 'approval required before the reply sends',
  outcome: 'first-response time drops from hours to minutes',
}

const assessmentWith = (scores, automation = completeAutomation) =>
  normalizeAssessment({ scores, automation, integration: { api: true } })

// The weights are the rubric. If one is edited without adjusting the others the
// scores silently stop meaning what the method says they mean.
test('the rubric weights sum to 100, split 62 utility / 38 trust', () => {
  const sum = (g) => CRITERIA.filter((c) => !g || c.group === g).reduce((n, c) => n + c.weight, 0)
  assert.equal(sum(), 100)
  assert.equal(sum('utility'), 62)
  assert.equal(sum('trust'), 38)
})

// --- measured signals ---------------------------------------------------------

test('only a GitHub candidate with a push date yields measurable signals', () => {
  assert.equal(measureSignals({ source: 'hackernews', raw: { points: 300 } }, NOW), null)
  assert.equal(measureSignals({ source: 'github', raw: { stars: 900 } }, NOW), null)
  assert.ok(measureSignals(ghCandidate(), NOW))
})

test('signals convert timestamps to ages against the run clock, not wall time', () => {
  const s = measureSignals(ghCandidate({ pushedAt: '2026-08-22T00:00:00Z', createdAt: '2026-08-01T00:00:00Z' }), NOW)
  assert.equal(s.daysSincePush, 7)
  assert.equal(s.ageDays, 28)
  assert.equal(s.measuredAt, NOW)
})

test('a repo pushed this week is at full momentum; an archived one is at zero', () => {
  const fresh = measuredScores(measureSignals(ghCandidate({ pushedAt: '2026-08-27T00:00:00Z' }), NOW))
  assert.equal(fresh.momentum.score, 5)
  const dead = measuredScores(measureSignals(ghCandidate({ archived: true }), NOW))
  assert.equal(dead.momentum.score, 0)
  assert.match(dead.momentum.evidence, /archived/)
})

// New is not proven — the radar's whole beat is week-old repos, so this ceiling
// is what stops a launch-week project scoring as a mature product.
test('a repo created days ago cannot score above 2 on maturity', () => {
  const m = measuredScores(measureSignals(ghCandidate({ createdAt: '2026-08-26T00:00:00Z', license: null }), NOW))
  assert.equal(m.maturity.score, 2)
})

test('a missing license is scored as a data-control fact, not left blank', () => {
  const m = measuredScores(measureSignals(ghCandidate({ license: null }), NOW))
  assert.equal(m.dataControl.score, 1)
  assert.match(m.dataControl.evidence, /no license/)
})

// A permissive license proves you could self-host and read the code. It proves
// nothing about retention, telemetry or vulnerability handling — so it must not
// buy a reassuring score on a criterion that also covers those.
test('a license alone caps data control at 3 and says what it does not cover', () => {
  const m = measuredScores(measureSignals(ghCandidate({ license: 'MIT' }), NOW))
  assert.equal(m.dataControl.score, 3)
  assert.match(m.dataControl.evidence, /retention, telemetry and security posture unverified/)
})

test('integration is measured only when two or more topic groups back it up', () => {
  const one = measuredScores(measureSignals(ghCandidate({ topics: ['api'] }), NOW))
  assert.equal(one.integrationReadiness, undefined)
  const two = measuredScores(measureSignals(ghCandidate({ topics: ['api', 'docker', 'mcp'] }), NOW))
  assert.equal(two.integrationReadiness.score, 5)
  assert.match(two.integrationReadiness.evidence, /repo topics/)
})

// --- scoring ------------------------------------------------------------------

test('no evidence produces no scores at all, not a middling one', () => {
  const sc = scoreTool({ now: NOW })
  assert.equal(sc.radar, null)
  assert.equal(sc.utility, null)
  assert.equal(sc.trust, null)
  assert.equal(sc.coverage, 0)
  assert.equal(sc.label, 'unrated')
  assert.equal(sc.basis, 'none')
  assert.equal(sc.unscored.length, CRITERIA.length)
})

// The failure this guards against: momentum alone is 3 of 100 weight, so a
// renormalised utility of 100 is arithmetically true and editorially worthless.
// Coverage is what makes that visible, and the label refuses to be drawn from it.
test('a thin but perfect signal set renormalises to a high score and still refuses a label', () => {
  const sc = scoreTool({ signals: measureSignals(ghCandidate(), NOW), now: NOW })
  assert.equal(sc.utility, 100) // momentum 5/5 is the only utility criterion scored
  assert.equal(sc.coverage, 0.26)
  assert.equal(sc.label, 'unrated')
  assert.equal(sc.basis, 'measured')
  assert.ok(sc.unscored.includes('workflowImpact'))
})

test('a measured criterion wins over the model estimate for the same criterion', () => {
  const sc = scoreTool({
    signals: measureSignals(ghCandidate({ archived: true }), NOW),
    assessment: assessmentWith({ momentum: 5, workflowImpact: 4 }),
    now: NOW,
  })
  assert.equal(sc.criteria.momentum.score, 0)
  assert.equal(sc.criteria.momentum.basis, 'measured')
  assert.equal(sc.criteria.workflowImpact.basis, 'estimated')
  assert.equal(sc.basis, 'mixed')
})

test('scores a strong, fully-assessed tool as a category leader', () => {
  const sc = scoreTool({
    assessment: assessmentWith({
      workflowImpact: 5, outputReliability: 4, integrationReadiness: 5, usability: 4,
      dataControl: 4, costRoi: 4, maturity: 4, adoption: 4, differentiation: 4, momentum: 4,
    }),
    now: NOW,
  })
  assert.equal(sc.utility, 91)
  assert.equal(sc.trust, 80)
  assert.equal(sc.coverage, 1)
  assert.equal(sc.label, 'category-leader')
  assert.equal(sc.recommendation, 'Strong recommendation.')
})

test('high utility with weak trust lands on builder-ready, not production-ready', () => {
  const sc = scoreTool({
    assessment: assessmentWith({
      workflowImpact: 4, outputReliability: 3, integrationReadiness: 5, usability: 3,
      dataControl: 2, costRoi: 3, maturity: 2, adoption: 2, differentiation: 3, momentum: 3,
    }),
    now: NOW,
  })
  assert.equal(sc.utility, 76)
  assert.equal(sc.trust, 48)
  assert.equal(sc.label, 'builder-ready')
  assert.equal(sc.recommendation, 'Worth testing, but keep it out of critical workflows.')
})

// The automation test is the method's gate: a tool whose workflow nobody can
// state is interesting, not radar-worthy — however well it scores.
test('an unstatable workflow caps even a top-scoring tool at watchlist', () => {
  const scores = {
    workflowImpact: 5, outputReliability: 4, integrationReadiness: 5, usability: 4,
    dataControl: 4, costRoi: 4, maturity: 4, adoption: 4, differentiation: 4, momentum: 4,
  }
  const partial = { ...completeAutomation, action: '', trigger: '' }
  const sc = scoreTool({ assessment: assessmentWith(scores, partial), now: NOW })
  assert.equal(sc.utility, 91)
  assert.equal(sc.label, 'watchlist')
})

test('labelFor stays inside the published ladder for every branch', () => {
  const cases = [
    { utility: 0, trust: 0, coverage: 0 },
    { utility: 40, trust: 90, coverage: 1 },
    { utility: 55, trust: 20, coverage: 0.7 },
    { utility: 90, trust: 90, coverage: 1 },
  ]
  for (const c of cases) {
    assert.ok(RADAR_LABELS.includes(labelFor({ ...c, criteria: {}, assessment: { automation: completeAutomation } })))
  }
})

test('the recommendation matrix separates useful from trustworthy', () => {
  assert.equal(recommendationFor({ utility: 80, trust: 80, label: 'production-ready' }), 'Strong recommendation.')
  assert.equal(recommendationFor({ utility: 80, trust: 40, label: 'builder-ready' }), 'Worth testing, but keep it out of critical workflows.')
  assert.equal(recommendationFor({ utility: 40, trust: 80, label: 'experiment' }), 'Mature, but not compelling for this job.')
  assert.equal(recommendationFor({ utility: 20, trust: 20, label: 'watchlist' }), 'Skip, or keep on the watchlist.')
  assert.match(recommendationFor({ utility: 90, trust: 90, label: 'unrated' }), /Not enough evidence/)
})

// --- the model's half ---------------------------------------------------------

test('normalizeAssessment drops out-of-range and non-numeric scores', () => {
  const a = normalizeAssessment({ scores: { workflowImpact: 4, usability: 9, costRoi: 'high', adoption: -1, momentum: 3.4 } })
  assert.deepEqual(a.scores, { workflowImpact: 4, momentum: 3 })
})

test('an integration capability counts only when the model asserts it outright', () => {
  const a = normalizeAssessment({ integration: { api: true, webhooks: 'yes', mcp: 1, sdk: false } })
  assert.equal(a.integration.api, true)
  assert.equal(a.integration.webhooks, false)
  assert.equal(a.integration.mcp, false)
  assert.equal(a.integration.sdk, false)
})

test('normalizeAssessment survives junk and caps free text', () => {
  assert.equal(normalizeAssessment(null), null)
  assert.equal(normalizeAssessment('nope'), null)
  const a = normalizeAssessment({ bestFor: 'x'.repeat(500), alternatives: ['Zapier', 42, '', 'n8n', 'Make', 'Pipedream', 'Retool'] })
  assert.equal(a.bestFor.length, 200)
  assert.deepEqual(a.alternatives, ['Zapier', 'n8n', 'Make', 'Pipedream'])
  assert.deepEqual(a.scores, {})
})

// --- re-scoring ---------------------------------------------------------------

test('assessmentFrom recovers only the estimated half of a scored record', () => {
  const record = {
    assessedBy: 'llm',
    automation: completeAutomation,
    integration: { api: true },
    verdict: { bestFor: 'ops teams', alternatives: ['n8n'] },
    scorecard: scoreTool({
      signals: measureSignals(ghCandidate(), NOW),
      assessment: assessmentWith({ workflowImpact: 4, momentum: 2, adoption: 5 }),
      now: NOW,
    }),
  }
  const a = assessmentFrom(record)
  assert.deepEqual(a.scores, { workflowImpact: 4 }) // momentum + adoption were measured
  assert.equal(a.automation.trigger, completeAutomation.trigger)
  assert.equal(a.bestFor, 'ops teams')
  assert.equal(assessmentFrom({ assessedBy: '' }), null)
})

// A tool scored the day it launched must not keep that score forever: the same
// record re-scored months later loses the momentum it no longer has.
test('re-scoring the same record against a later clock decays measured momentum', () => {
  const signals = measureSignals(ghCandidate({ pushedAt: '2026-08-27T00:00:00Z' }), NOW)
  const atDiscovery = scoreTool({ signals, now: NOW })
  const sixMonthsOn = scoreTool({ signals: measureSignals(ghCandidate({ pushedAt: '2026-08-27T00:00:00Z' }), '2027-03-01T00:00:00Z'), now: '2027-03-01T00:00:00Z' })
  assert.equal(atDiscovery.criteria.momentum.score, 5)
  assert.equal(sixMonthsOn.criteria.momentum.score, 1)
  assert.ok(sixMonthsOn.radar < atDiscovery.radar)
})

// Exactly the pair scripts/rescore.js runs: stored signals + the recovered
// estimate half, against a new clock.
const rescore = (record, { signals, now }) =>
  scoreTool({ signals, assessment: assessmentFrom(record), now })

test('a re-score follows the measured state down and never props up the old result', () => {
  const healthy = measureSignals(ghCandidate({ pushedAt: '2026-08-27T00:00:00Z' }), NOW)
  const record = {
    assessedBy: 'llm',
    automation: completeAutomation,
    scorecard: scoreTool({
      signals: healthy,
      assessment: assessmentWith({ workflowImpact: 4, outputReliability: 4, integrationReadiness: 5, usability: 4, costRoi: 4, differentiation: 4 }),
      now: NOW,
    }),
  }
  assert.equal(record.scorecard.label, 'production-ready')

  // The project is abandoned: a later run re-measures it as archived and stale.
  const abandoned = measureSignals(ghCandidate({ archived: true, pushedAt: '2026-08-27T00:00:00Z', license: null }), '2027-06-01T00:00:00Z')
  const after = rescore(record, { signals: abandoned, now: '2027-06-01T00:00:00Z' })

  assert.equal(after.criteria.momentum.score, 0)
  assert.equal(after.criteria.dataControl.score, 1)
  assert.ok(after.criteria.maturity.score < record.scorecard.criteria.maturity.score)
  assert.ok(after.trust < record.scorecard.trust)
  assert.notEqual(after.label, 'production-ready')
  assert.match(after.criteria.momentum.evidence, /archived/)
})

// The central "nothing is invented" rule, tested at the point it would most
// plausibly erode: a repeat pass over a record that is missing evidence.
test('re-scoring never fills a gap — an unscored criterion stays unscored', () => {
  const signals = measureSignals(ghCandidate(), NOW)
  const record = {
    assessedBy: 'llm',
    automation: completeAutomation,
    scorecard: scoreTool({ signals, assessment: assessmentWith({ workflowImpact: 4 }), now: NOW }),
  }
  const before = record.scorecard
  const after = rescore(record, { signals, now: NOW })

  for (const key of before.unscored) {
    assert.equal(after.criteria[key], undefined)
    assert.ok(after.unscored.includes(key))
  }
  assert.equal(after.coverage, before.coverage)
  assert.equal(after.utility, before.utility)
  assert.equal(after.label, before.label)
  assert.ok(after.unscored.includes('outputReliability'))
})

// --- what a re-score is allowed to write --------------------------------------

// The regression this guards: every one of the 77 catalogue records predates
// the scorecard, so each re-scores to a valid but EMPTY result. Persisting that
// would create `tool.scorecard` on all of them, and the app renders radar UI on
// the presence of that field — turning the whole catalogue into
// "Unrated - 0% evidence" overnight. Verified by rescore.js --dry-run before
// the guard existed: "re-scored 77 tools - 77 changed".
test('a never-assessed record is left alone rather than handed an empty scorecard', () => {
  const legacy = { slug: 'chatgpt', name: 'ChatGPT' } // no signals, no assessment
  const after = scoreTool({ signals: legacy.signals || null, assessment: assessmentFrom(legacy), now: NOW })

  assert.equal(after.basis, 'none')
  assert.equal(after.label, 'unrated')
  assert.equal(after.utility, null)
  assert.equal(shouldPersistRescore(legacy.scorecard, after), false)
})

// The guard must not be implemented as "drop unrated scorecards". A low-coverage
// record backed by real measured evidence is worth keeping: the detail page
// shows the evidence, and the UI gate already withholds the numbers.
test('an unrated scorecard is still persisted when real evidence sits behind it', () => {
  const after = scoreTool({ signals: measureSignals(ghCandidate(), NOW), now: NOW })

  assert.equal(after.label, 'unrated')
  assert.ok(after.coverage < 0.5)
  assert.equal(after.basis, 'measured')
  assert.equal(shouldPersistRescore(undefined, after), true)
})

// Stated as a policy so it cannot be decided by accident later: when the
// evidence behind an assessed record goes away, the empty result is written.
// The alternative - keeping the old scorecard - would show a stale score as a
// current one, which is the failure the whole module exists to prevent.
test('an assessed record whose evidence has gone is overwritten, never left showing the old score', () => {
  const before = scoreTool({
    signals: measureSignals(ghCandidate(), NOW),
    assessment: assessmentWith({ workflowImpact: 4, outputReliability: 4, usability: 4, costRoi: 4, differentiation: 4 }),
    now: NOW,
  })
  const after = scoreTool({ signals: null, assessment: null, now: NOW })

  assert.ok(before.utility > 0)
  assert.equal(after.basis, 'none')
  assert.equal(shouldPersistRescore(before, after), true)
})

// --- the app boundary ---------------------------------------------------------

test('the app-facing scorecard carries the whole rubric, so the UI keeps no copy of it', () => {
  const sc = scoreTool({ signals: measureSignals(ghCandidate(), NOW), assessment: assessmentWith({ workflowImpact: 4 }), now: NOW })
  const pub = publicScorecard(sc, { automation: completeAutomation })
  assert.equal(publicScorecard(null), undefined)
  assert.equal(pub.label, sc.label)
  assert.equal(pub.coverage, sc.coverage)
  assert.equal(Object.keys(pub.criteria).length, CRITERIA.length)
  for (const c of CRITERIA) {
    const row = pub.criteria[c.key]
    assert.equal(row.weight, c.weight)
    assert.equal(row.label, c.label)
    assert.equal(row.group, c.group)
  }
  for (const c of Object.values(pub.criteria)) {
    if (c.basis === 'unscored') assert.equal(c.score, null)
    else assert.ok(c.evidence.length > 0)
  }
  assert.equal(pub.automationFit.complete, true)
  assert.equal(pub.automationFit.trigger, completeAutomation.trigger)
})

// A zero here would read as "we checked and it scored nothing", which is the
// one thing an unscored criterion must never say.
test('an unscored criterion reaches the app as null, never as zero', () => {
  const pub = publicScorecard(scoreTool({ assessment: assessmentWith({ workflowImpact: 4 }), now: NOW }))
  assert.equal(pub.criteria.workflowImpact.score, 4)
  assert.equal(pub.criteria.outputReliability.score, null)
  assert.equal(pub.criteria.outputReliability.basis, 'unscored')
  assert.equal(pub.automationFit, null)
})

// --- the gate's shape check ---------------------------------------------------

test('isValidScorecard accepts what scoreTool produces and rejects corruption', () => {
  const sc = scoreTool({ assessment: assessmentWith({ workflowImpact: 4 }), now: NOW })
  assert.equal(isValidScorecard(sc), true)
  assert.equal(isValidScorecard(null), false)
  assert.equal(isValidScorecard({ ...sc, label: 'awesome' }), false)
  assert.equal(isValidScorecard({ ...sc, utility: 140 }), false)
  assert.equal(isValidScorecard({ ...sc, criteria: { workflowImpact: { score: 9, basis: 'measured' } } }), false)
  assert.equal(isValidScorecard({ ...sc, criteria: { vibes: { score: 4, basis: 'measured' } } }), false)
  assert.equal(isValidScorecard({ ...sc, criteria: { workflowImpact: { score: 4, basis: 'vibes' } } }), false)
})
