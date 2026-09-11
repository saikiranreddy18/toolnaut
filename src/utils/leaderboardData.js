// Leaderboard — SAMPLE DATA, and labelled as such in the UI.
//
// READ THIS BEFORE REMOVING THE LABEL.
// Toolnaut has no backend and no accounts. There are no users, so there is no
// real ranking to show. Every row below is invented. It is rendered under a
// visible "Sample" badge because a leaderboard is the single most credible-looking
// thing a product can put on a landing page — a visitor reading these names has
// no way to know they are placeholders unless we say so.
//
// The badge comes off when the numbers are real, not before.
//
// WHAT MAKES IT REAL LATER
// computeScore() below is not a placeholder. It is the actual scoring rule, and
// it runs on data the app already tracks per person in localStorage today:
// stack size, roadmap steps completed, and streak. When accounts land, the same
// function runs server-side over stored progress and these rows get replaced by
// a query. Nothing else in this file survives that change.

// Points per unit of progress. Weighted so that FINISHING things beats
// collecting things — a stack of thirty untouched tools should not outrank
// someone who actually worked through a four-week roadmap.
export const SCORING = {
  perToolInStack: 5,
  perRoadmapStep: 25,
  perStreakDay: 10,
  roadmapCompleteBonus: 150,
}

export function computeScore({ stackSize = 0, stepsDone = 0, streakDays = 0, roadmapComplete = false } = {}) {
  return (
    stackSize * SCORING.perToolInStack +
    stepsDone * SCORING.perRoadmapStep +
    streakDays * SCORING.perStreakDay +
    (roadmapComplete ? SCORING.roadmapCompleteBonus : 0)
  )
}

// Invented. Personas and scores chosen to look plausible against the scoring
// rule above, so the design is tested against realistic numbers rather than
// round ones. Names are deliberately handles, not real-looking full names.
export const SAMPLE_LEADERBOARD = [
  { rank: 1, handle: 'pixel_ronin', persona: 'Relentless Designer', domain: 'design', score: 1840, streak: 31 },
  { rank: 2, handle: 'sql_gremlin', persona: 'Methodical Analyst', domain: 'data', score: 1655, streak: 24 },
  { rank: 3, handle: 'ship_or_die', persona: 'Ambitious Engineer', domain: 'code', score: 1490, streak: 19 },
  { rank: 4, handle: 'quietloops', persona: 'Patient Automator', domain: 'automation', score: 1205, streak: 22 },
  { rank: 5, handle: 'draft_zero', persona: 'Prolific Creator', domain: 'writing', score: 1130, streak: 14 },
  { rank: 6, handle: 'nightclass', persona: 'Curious Learner', domain: 'learning', score: 940, streak: 27 },
  { rank: 7, handle: 'anon_builder', persona: 'Steady Founder', domain: 'code', score: 815, streak: 9 },
]

export const IS_SAMPLE = true
