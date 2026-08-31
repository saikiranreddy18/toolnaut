import { CATEGORY_META } from './toolsCatalog'

// Persona → tool fit score (20–99). Client-side stand-in for the real
// recommendation service; the inputs (quiz answers) and output shape won't
// change when the backend takes over.

const BUDGET_PRICE_BONUS = {
  free: { free: 15, freemium: 8, paid: -12 },
  low: { free: 12, freemium: 10, paid: -6 },
  mid: { free: 4, freemium: 8, paid: 8 },
  high: { free: 2, freemium: 6, paid: 10 },
  company: { free: 0, freemium: 5, paid: 12 },
}

const EXPERIENCE_LEVEL_BONUS = {
  beginner: { beginner: 12, intermediate: 0, advanced: -10 },
  dabbler: { beginner: 10, intermediate: 4, advanced: -6 },
  regular: { beginner: 2, intermediate: 10, advanced: 4 },
  builder: { beginner: -2, intermediate: 6, advanced: 10 },
  teacher: { beginner: 0, intermediate: 6, advanced: 10 },
}

// Secondary domains that still earn a partial category bonus.
const ADJACENT = {
  code: ['automation', 'data'],
  design: ['writing'],
  writing: ['design', 'learning'],
  data: ['code', 'automation'],
  automation: ['code', 'data'],
  learning: ['writing'],
}

// The flagship source category for each domain. A tool sitting in it (real
// coding tools for a "code" persona, vs. security which also maps to code)
// gets an extra nudge so the most on-the-nose tools rise to the top.
const PRIMARY_SOURCE = {
  code: 'AI Coding & Development',
  design: 'Image Generation & Editing',
  writing: 'Writing & Editing',
  data: 'Data & Analytics',
  automation: 'AI Agents & Automation',
  learning: 'Education & Learning',
}

export function matchScore(tool, answers) {
  if (!answers || !answers.domain) return null

  let score = 50

  if (tool.category === answers.domain) score += 28
  else if ((ADJACENT[answers.domain] || []).includes(tool.category)) score += 10

  if (tool.sourceCategory === PRIMARY_SOURCE[answers.domain]) score += 9

  score += BUDGET_PRICE_BONUS[answers.budget]?.[tool.price] ?? 0
  score += EXPERIENCE_LEVEL_BONUS[answers.experience]?.[tool.level] ?? 0

  // Learners get a nudge toward learning tools regardless of domain.
  if (answers.goal === 'job' && tool.category === 'learning') score += 6

  return Math.max(20, Math.min(99, score))
}

// A qualitative band for a tool's fit, for display INSTEAD of a percentage.
//
// The raw number is a heuristic sum of at most four bonuses off a baseline of
// 50. Rendering it as "87%" invites the reading "87% likely to be right", which
// is a claim about calibration against outcome data that does not exist — no
// recommendation has ever been scored against whether the person kept the tool.
// A band says what the number can honestly support: a rank ordering.
//
// Deliberately NOT confidence.js's BANDS. Those describe how complete the
// PROFILE is; this describes how well one TOOL fits. Sharing a scale would
// merge two different claims into one vocabulary.
//
// Below 'possible' there is no badge at all. A "weak fit" label on a tool
// someone is already looking at is noise, not information.
const FIT_BANDS = [
  { min: 85, key: 'strong', label: 'Strong fit' },
  { min: 70, key: 'good', label: 'Good fit' },
  { min: 55, key: 'possible', label: 'Possible fit' },
]

export function fitBand(score) {
  if (score == null) return null
  return FIT_BANDS.find((b) => score >= b.min) || null
}

// Human-readable reasons behind a score — powers "Why this fits you".
export function matchReasons(tool, answers) {
  if (!answers || !answers.domain) return []
  const reasons = []

  if (tool.category === answers.domain) {
    reasons.push('Sits in your home category — the fastest path to daily use.')
  } else if ((ADJACENT[answers.domain] || []).includes(tool.category)) {
    reasons.push('A natural neighbor to your main domain.')
  }

  const priceBonus = BUDGET_PRICE_BONUS[answers.budget]?.[tool.price] ?? 0
  if (priceBonus >= 8) reasons.push('Fits comfortably inside your stated budget.')
  else if (priceBonus < 0) reasons.push('Heads up: pricier than your stated budget.')

  const levelBonus = EXPERIENCE_LEVEL_BONUS[answers.experience]?.[tool.level] ?? 0
  if (levelBonus >= 8) reasons.push('Difficulty matches your experience level.')
  else if (levelBonus < 0) reasons.push('Steeper learning curve than your current level.')

  return reasons
}

// One short badge-sized reason for a card, where the full matchReasons() list
// is too long to sit under a blurb. Ordered by how much the factor actually
// moved the score, so the line explains the number the user is looking at.
// Returns null when there is no persona — cards then show no reason at all
// rather than an empty or generic one.
export function matchReasonShort(tool, answers) {
  if (!answers || !answers.domain) return null

  const home = CATEGORY_META[answers.domain]?.name || answers.domain

  if (tool.category === answers.domain) return `Core ${home} pick for you`
  if ((ADJACENT[answers.domain] || []).includes(tool.category)) {
    return `Pairs with your ${home} work`
  }

  const priceBonus = BUDGET_PRICE_BONUS[answers.budget]?.[tool.price] ?? 0
  if (priceBonus >= 10) return 'Fits your budget'

  const levelBonus = EXPERIENCE_LEVEL_BONUS[answers.experience]?.[tool.level] ?? 0
  if (levelBonus >= 10) return 'Matches your level'
  if (levelBonus < 0) return 'Steeper than your level'

  return null
}
