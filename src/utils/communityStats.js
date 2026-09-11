import { loadStack } from '../state/stackStore'
import { loadRoadmapProgress } from '../state/roadmapStore'
import { computeScore } from './leaderboardData'

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED COMMUNITY NUMBERS — the only invented values in the product.
//
// Toolnaut has no accounts and no payments, so there is no explorer count, no
// subscriber count and no conversion rate to read. These are placeholders,
// deliberately kept in ONE file so replacing them is a single edit rather than
// a search across components.
//
// Everything downstream of them is real arithmetic: the conversion rate is
// computed from the two figures rather than typed, so it can never contradict
// them, and a visitor's rank is derived from progress the app genuinely tracks.
//
// WHEN THE NUMBERS BECOME REAL
//   1. replace EXPLORERS and SUBSCRIBERS with a query
//   2. set SEEDED = false
// The "preview" chips in the UI are wired to SEEDED and disappear on their own.
// ─────────────────────────────────────────────────────────────────────────────

export const SEEDED = true

// EXPLORERS IS NO LONGER SHOWN AS A STATISTIC.
//
// The landing page now counts real sign-ups through utils/explorerCount.js
// (public.explorer_count(), one row per account) and hides the tile when that
// count cannot be read, rather than falling back to this number.
//
// It survives here for ONE job: anchoring the leaderboard's starting rank
// below. That is a game mechanic, not a claim about how many people use the
// product — a new explorer needs somewhere to enter the queue and something to
// climb, and RankCard says "preview — leaderboard not live yet" on its face.
// Do not reintroduce it as a displayed count.
export const EXPLORERS = 1300
export const SUBSCRIBERS = 84

// Where a brand-new explorer enters the ranking. Sits one past EXPLORERS on
// purpose: joining puts you at the back of the queue, and every point moves you
// up it. Keeping the two tied means the story stays consistent when the real
// count replaces the seeded one.
export const STARTING_RANK = EXPLORERS + 1

export function conversionRate() {
  if (!EXPLORERS) return 0
  return (SUBSCRIBERS / EXPLORERS) * 100
}

export function conversionLabel() {
  return `${conversionRate().toFixed(1)}%`
}

// How much score it takes to climb one place. Set by testing the small cases,
// not by taste: at 20, adding three tools (15 points) moved you zero places —
// you did something and the number sat still, which is the worst possible
// feedback for a progress mechanic. At 10, every single action moves you: one
// tool is a place, one roadmap step is two.
export const POINTS_PER_PLACE = 10

// A visitor's standing, computed from what they have actually done. Stack size,
// completed roadmap steps and streak are all really tracked in localStorage —
// only the crowd they are ranked against is seeded.
// Streak is owned by Stack.jsx, which writes { date, count } under its own key
// rather than going through a store. Read it the same way rather than moving it:
// this is a read-only consumer and relocating live state to suit it would risk
// the streak itself.
const STREAK_KEY = 'exus_streak_v1'

export function myStanding() {
  let stackSize = 0
  let stepsDone = 0
  let streakDays = 0

  try {
    // loadStack returns a flat array of slugs.
    const stack = loadStack()
    stackSize = Array.isArray(stack) ? stack.length : 0
  } catch { /* storage blocked — treat as a fresh explorer */ }

  try {
    // Roadmap progress is a FLAT map keyed "<milestoneId>:<stepIndex>", plus
    // "<milestoneId>:quiz" for checkpoint passes. There is no nested steps
    // object — reading one silently scored every explorer at zero and pinned
    // the whole leaderboard to its starting rank.
    const p = loadRoadmapProgress() || {}
    stepsDone = Object.entries(p).filter(([k, v]) => v && !k.endsWith(':quiz')).length
  } catch { /* same */ }

  try {
    const s = JSON.parse(localStorage.getItem(STREAK_KEY)) || {}
    streakDays = Number(s.count) || 0
  } catch { /* same */ }

  const score = computeScore({ stackSize, stepsDone, streakDays })
  const climbed = Math.floor(score / POINTS_PER_PLACE)
  const rank = Math.max(1, STARTING_RANK - climbed)

  return { rank, score, stackSize, stepsDone, streakDays, isNew: score === 0 }
}
