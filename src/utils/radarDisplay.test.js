import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  automationSteps, basisSummary, caveats, coveragePercent, criteriaRows,
  hasEstimateFootnote, labelText, radarOf, scoreText, showsNumericScores,
} from './radarDisplay.js'
// Fixtures come from the real pipeline rather than hand-written objects, so
// this doubles as the contract test: if publicScorecard's shape drifts, the
// display rules fail here instead of in the browser.
import { publicScorecard, scoreTool } from '../../radar/scorecard.js'

const NOW = '2026-08-29T00:00:00Z'
const COMPLETE_AUTOMATION = {
  trigger: 'a new support request arrives on Telegram',
  input: 'the request plus the account record',
  aiStep: 'classifies intent and extracts structured fields',
  action: 'creates a ticket and drafts a reply',
  humanControl: 'approval required before the reply sends',
  outcome: 'triage time drops from hours to minutes',
}

const publicOf = (scores, { automation = COMPLETE_AUTOMATION, signals = null } = {}) =>
  publicScorecard(scoreTool({ signals, assessment: { scores, automation }, now: NOW }), { automation })

// Utility 100 at 41% coverage is arithmetically true and psychologically
// misleading. The badge alone does not save it — people anchor on the number,
// so the number must not be offered as a headline at all.
test('a sparse, unrated scorecard offers coverage instead of its numbers', () => {
  const sc = publicOf({ integrationReadiness: 5, dataControl: 4, maturity: 5, adoption: 4, momentum: 5 })
  assert.equal(sc.label, 'unrated')
  assert.ok(sc.utility > 90) // the misleading number really is in the data
  assert.equal(showsNumericScores(sc), false)
  assert.equal(coveragePercent(sc), 41)
  assert.equal(labelText(sc), 'Unrated')
})

test('a rated tool above the coverage line shows both scores', () => {
  const sc = publicOf({
    workflowImpact: 4, outputReliability: 3, integrationReadiness: 5, usability: 3,
    dataControl: 2, costRoi: 3, maturity: 2, adoption: 2, differentiation: 3, momentum: 3,
  })
  assert.equal(sc.label, 'builder-ready')
  assert.equal(showsNumericScores(sc), true)
  assert.equal(coveragePercent(sc), 100)
  assert.equal(labelText(sc), 'Builder-ready')
  assert.match(basisSummary(sc), /10 model estimates/)
})

test('a tool with no evidence at all reads as not assessed, not as zero', () => {
  const sc = publicOf({}, { automation: null })
  assert.equal(sc.utility, null)
  assert.equal(sc.trust, null)
  assert.equal(coveragePercent(sc), 0)
  assert.equal(showsNumericScores(sc), false)
  assert.equal(basisSummary(sc), 'No evidence gathered yet')
  for (const row of criteriaRows(sc)) assert.equal(row.scoreText, '—')
})

test('an unscored criterion renders as an em dash and "Not evaluated"', () => {
  const rows = criteriaRows(publicOf({ workflowImpact: 4 }))
  const scored = rows.find((r) => r.key === 'workflowImpact')
  const blank = rows.find((r) => r.key === 'outputReliability')
  assert.equal(scored.scoreText, '4/5')
  assert.equal(blank.score, null)
  assert.equal(blank.scoreText, '—')
  assert.equal(blank.basisText, 'Not evaluated')
  assert.notEqual(blank.scoreText, '0/5')
  assert.equal(scoreText(0), '0/5') // a real zero still reads as a real zero
})

test('measured and estimated criteria each carry their own basis and evidence', () => {
  const signals = {
    source: 'github', stars: 1200, forks: 90, license: 'Apache-2.0', archived: false,
    topics: ['api', 'docker', 'webhooks'], daysSincePush: 2, ageDays: 940,
  }
  const rows = criteriaRows(publicOf({ workflowImpact: 4 }, { signals }))
  const measured = rows.find((r) => r.key === 'integrationReadiness')
  const estimated = rows.find((r) => r.key === 'workflowImpact')
  assert.equal(measured.basisText, 'Measured')
  assert.match(measured.evidence, /repo topics/)
  assert.equal(estimated.basisText, 'Estimated')
  // Ten rows repeating "model estimate from the listing text" bury the one row
  // that carries a real fact, so the stock line is collapsed to a footnote.
  assert.equal(estimated.evidence, '—')
  assert.equal(hasEstimateFootnote(publicOf({ workflowImpact: 4 }, { signals })), true)
  assert.equal(hasEstimateFootnote(publicOf({}, { signals })), false)
})

test('an incomplete workflow shape is reported as incomplete, not hidden', () => {
  const strong = {
    workflowImpact: 5, outputReliability: 4, integrationReadiness: 5, usability: 4,
    dataControl: 4, costRoi: 4, maturity: 4, adoption: 4, differentiation: 4, momentum: 4,
  }
  const partial = { ...COMPLETE_AUTOMATION, trigger: '', action: '' }
  const sc = publicOf(strong, { automation: partial })
  assert.equal(sc.label, 'watchlist') // capped despite the scores
  assert.equal(automationSteps(sc).complete, false)
  assert.equal(automationSteps(sc).steps.some((s) => s.key === 'trigger'), false)
  assert.equal(automationSteps(publicOf(strong)).complete, true)
  assert.equal(automationSteps(publicOf({}, { automation: null })), null)
})

// The 77 tools discovered before any of this existed must render, not crash.
test('a legacy record with no scorecard degrades to "Not yet assessed"', () => {
  const legacy = { slug: 'chatgpt', name: 'ChatGPT', category: 'writing' }
  const sc = radarOf(legacy)
  assert.equal(sc, null)
  assert.equal(labelText(sc), 'Not yet assessed')
  assert.equal(showsNumericScores(sc), false)
  assert.equal(coveragePercent(sc), null)
  assert.equal(basisSummary(sc), 'Not yet assessed')
  assert.deepEqual(criteriaRows(sc), [])
  assert.deepEqual(caveats(sc), [])
  assert.equal(automationSteps(sc), null)
})

test('a criterion with no evidence string is never rendered as substantiated', () => {
  const sc = publicOf({ workflowImpact: 4 })
  sc.criteria.workflowImpact.evidence = ''
  const rows = criteriaRows(sc)
  assert.equal(rows.find((r) => r.key === 'workflowImpact').evidence, 'Evidence unavailable')
  assert.equal(rows.find((r) => r.key === 'usability').evidence, 'No evidence found')
})

test('caveats name what was not verified, so a gap does not read as a fault', () => {
  const list = caveats(publicOf({ workflowImpact: 4, integrationReadiness: 5 }))
  assert.equal(list.length, 8)
  assert.ok(list.some((c) => /retention, model-training use and deletion/i.test(c)))
  assert.ok(list.every((c) => /not |no /i.test(c)))
})
