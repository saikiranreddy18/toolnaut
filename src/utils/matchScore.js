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
