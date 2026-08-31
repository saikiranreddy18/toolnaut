// Lives in test/ with the rest of the app suite rather than beside the module:
// npm run test:app targets test/*.test.mjs, so a test file under src/ is a test
// file CI never runs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  UNKNOWN, constraintConflicts, coverageBand, needsTeamRefinement, profileCompleteness,
  hardFilterCount, rankingSeparation, stackConfidence, teamContext, teamPenalty, teamRelevance,
} from '../src/utils/stackConfidence.js'

const FULL = { goal: 'time', role: 'analyst', experience: 'regular', blocker: 'toomany', domain: 'data', budget: 'low' }
const ok = (over = {}) => ({ ...FULL, ...over })

// The rule the whole module exists to protect.
test('an unanswered team question stays unknown and is never guessed to individual', () => {
  assert.equal(teamContext({}), UNKNOWN)
  assert.equal(teamContext({ role: 'student' }), UNKNOWN)
  assert.notEqual(teamContext({ role: 'student' }), 'individual')
  // an explicit answer is kept as given
  assert.equal(teamContext({ team_context: 'individual' }), 'individual')
  assert.equal(teamPenalty({ team_context: 'solo', role: 'manager' }), 0)
})

test('completeness scores the six fields that change which tools fit', () => {
  assert.equal(profileCompleteness({}), 0)
  assert.equal(profileCompleteness(FULL), 100)
  // career_stage/pace/learning_style shape the roadmap, not the tool pick
  assert.equal(profileCompleteness({ career_stage: 'mid', pace: 'deep', learning_style: 'course' }), 0)
  assert.equal(profileCompleteness({ goal: 'ship' }), 30)
})

// The founder/freelancer split the spec asks for.
test('team relevance separates a solo founder from one buying for a team', () => {
  assert.equal(teamRelevance({ role: 'founder', career_stage: 'founder', goal: 'ship' }), 0.35)
  assert.equal(teamRelevance({ role: 'founder', goal: 'time' }), 0.7)
  assert.equal(teamRelevance({ goal: 'lead' }), 1)
  assert.equal(teamRelevance({ role: 'manager' }), 0.9)
  assert.equal(teamRelevance({ goal: 'freelance' }), 0.4)
  assert.equal(teamRelevance({ role: 'student' }), 0.05)
  assert.equal(teamRelevance({ budget: 'company' }), 0.5)
})

test('the missing-team penalty scales with relevance, so a student loses almost nothing', () => {
  assert.equal(teamPenalty({ role: 'student' }), 1)   // 15 * 0.05
  assert.equal(teamPenalty({ goal: 'freelance' }), 6) // 15 * 0.4
  assert.equal(teamPenalty({ goal: 'lead' }), 15)     // 15 * 1
  assert.ok(teamPenalty({ role: 'student' }) < teamPenalty({ role: 'manager' }))
})

test('we only ask about team when the answer would change the Stack', () => {
  assert.equal(needsTeamRefinement({ goal: 'lead' }), true)
  assert.equal(needsTeamRefinement({ role: 'manager' }), true)
  assert.equal(needsTeamRefinement({ role: 'founder', goal: 'time' }), true)
  // solo cases are not interrogated
  assert.equal(needsTeamRefinement({ role: 'student' }), false)
  assert.equal(needsTeamRefinement({ goal: 'freelance' }), false)
  assert.equal(needsTeamRefinement({ role: 'founder', career_stage: 'founder', goal: 'ship' }), false)
  // and never once it has been answered
  assert.equal(needsTeamRefinement({ goal: 'lead', team_context: 'solo' }), false)
})

test('coverage bands treat a thin candidate set as low confidence', () => {
  assert.equal(coverageBand(0), 'none')
  assert.equal(coverageBand(2), 'sparse')
  assert.equal(coverageBand(5), 'good')
  assert.equal(coverageBand(40), 'broad')
  assert.equal(coverageBand(null), 'unknown')
})

test('ranking separation shows when several tools are equally good', () => {
  assert.equal(rankingSeparation([87, 86, 85]), 1)
  assert.equal(rankingSeparation([92, 70, 61]), 22)
  assert.equal(rankingSeparation([50]), null)
})

test('conflicts are named as trade-offs, drawn from real answers', () => {
  assert.equal(constraintConflicts(ok({ budget: 'free', goal: 'lead' })).length, 1)
  assert.match(constraintConflicts(ok({ budget: 'free', goal: 'lead' }))[0], /\$0 budget/)
  assert.equal(constraintConflicts(ok({ pace: 'micro', goal: 'ship', experience: 'beginner' })).length, 1)
  assert.deepEqual(constraintConflicts(FULL), [])
})

// --- what the UI actually receives -------------------------------------------

test('no percentage ever reaches the label, only words and one action', () => {
  const c = stackConfidence({ answers: FULL, candidateCount: 20, scores: [90, 60] })
  assert.equal(c.label, 'Tailored to your workflow')
  assert.equal(c.cta, 'See why these tools fit')
  assert.doesNotMatch(c.label, /\d/)
  assert.doesNotMatch(c.copy, /\d+\s*%/)
})

test('an empty profile gets starter recommendations, not a warning', () => {
  const c = stackConfidence({ answers: {}, candidateCount: 20 })
  assert.equal(c.label, 'Starter recommendations')
  assert.doesNotMatch(c.copy, /low confidence|we may be wrong|unsure/i)
  assert.equal(c.missing[0], 'goal') // heaviest gap first
})

test('a thin candidate set outranks a tidy profile', () => {
  const c = stackConfidence({ answers: FULL, candidateCount: 2 })
  assert.equal(c.label, 'Limited matching options')
  assert.equal(c.cta, 'Adjust requirements')
})

test('a team-relevant goal asks the team question before asserting a fit', () => {
  const c = stackConfidence({ answers: ok({ goal: 'lead' }), candidateCount: 20 })
  assert.equal(c.label, 'Team details needed')
  assert.equal(c.cta, 'Tell us about your team')
  assert.equal(c.teamContext, UNKNOWN)
})

test('the same answers minus the team goal do not ask, and score higher', () => {
  const team = stackConfidence({ answers: ok({ goal: 'lead' }), candidateCount: 20 })
  const solo = stackConfidence({ answers: ok({ goal: 'time', role: 'student' }), candidateCount: 20 })
  assert.ok(solo.score > team.score)
  assert.notEqual(solo.label, 'Team details needed')
})

test('conflicting priorities are surfaced as trade-offs, once team is known', () => {
  const c = stackConfidence({ answers: ok({ budget: 'free', goal: 'lead', team_context: 'small' }), candidateCount: 20 })
  assert.equal(c.label, 'Trade-offs detected')
  assert.equal(c.conflicts.length, 1)
})

test('the candidate count respects budget as a wall, not a preference', () => {
  const tools = [
    { price: 'free', category: 'data' }, { price: 'freemium', category: 'data' },
    { price: 'paid', category: 'data' }, { price: 'free', category: 'code' },
  ]
  assert.equal(hardFilterCount(tools, { budget: 'free' }), 2)
  assert.equal(hardFilterCount(tools, { budget: 'free', domain: 'data' }), 1)
  assert.equal(hardFilterCount(tools, { budget: 'low', domain: 'data' }), 2)
  assert.equal(hardFilterCount(tools, { budget: 'high' }), 4)
  assert.equal(hardFilterCount(tools, {}), 4)
})
