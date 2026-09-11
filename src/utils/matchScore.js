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

// What a ROLE pulls toward, keyed on SOURCE CATEGORY.
//
// Role was collected and then ignored: it named the persona and touched nothing
// in the ranking, so someone answered a question and got no result from it.
//
// The first attempt keyed this on `category` and was still decorative. A
// category-level bonus lands on every in-domain tool equally, so it shifts the
// whole block by a constant and reorders nothing — and it can never bridge
// domain's +28 to pull an out-of-domain tool up. Measured: identical top-60 for
// a developer and a manager who both chose automation.
//
// Source category is where the real difference lives. "Automation" contains
// both AI Agents & Automation (build it yourself) and Productivity & Meetings
// (no-code); a developer and a manager want opposite ends of the same domain.
// Keying here reorders WITHIN the domain someone picked, which is the whole
// point of asking their role on top of it.
const ROLE_SOURCE_AFFINITY = {
  student: {
    'Education & Learning': 10, 'Search & Research': 6, 'Writing & Editing': 6, 'LLMs & Chatbots': 4,
  },
  developer: {
    'AI Coding & Development': 10, 'ML Infrastructure & LLMOps': 8, 'AI Agents & Automation': 6, 'Security': 4,
  },
  designer: {
    'Image Generation & Editing': 10, 'Video Generation & Avatars': 8, 'Presentations, Design & Websites': 6,
    '3D, Gaming & Simulation': 5, 'Audio, Music & Voice': 4,
  },
  creator: {
    'Writing & Editing': 10, 'Marketing, SEO & Sales': 8, 'Image Generation & Editing': 5,
    'Video Generation & Avatars': 4, 'Translation & Dubbing': 4,
  },
  founder: {
    'Marketing, SEO & Sales': 8, 'Customer Support & Voice Agents': 7, 'Productivity & Meetings': 6,
    'Finance & Accounting': 5, 'HR, Recruiting & Careers': 4,
  },
  manager: {
    'Productivity & Meetings': 10, 'HR, Recruiting & Careers': 6,
    'Customer Support & Voice Agents': 5, 'Data & Analytics': 4,
  },
  analyst: {
    'Data & Analytics': 10, 'Search & Research': 8, 'Finance & Accounting': 5, 'Science & Biotech': 5,
  },
}

export function matchScore(tool, answers) {
  if (!answers || !answers.domain) return null

  // BASELINE 20, NOT 50.
  //
  // At 50 the score saturated: the bonuses total up to 78, so 50 + 78 = 128
  // clipped to the 99 ceiling and any decent match pinned there. Measured on
  // the live catalogue, an automation persona had 114 of its 133 in-domain
  // tools tied at exactly 99, with only 20 distinct scores across all 806 —
  // meaning the ordering among a user's best matches was the alphabetical
  // tiebreaker, not fit. It also silently swallowed the role signal, since
  // there was no headroom left for it to move anything.
  //
  // 20 + 78 = 98 fits under the ceiling, so every point of signal survives.
  let score = 20

  if (tool.category === answers.domain) score += 28
  else if ((ADJACENT[answers.domain] || []).includes(tool.category)) score += 10

  if (tool.sourceCategory === PRIMARY_SOURCE[answers.domain]) score += 9

  score += BUDGET_PRICE_BONUS[answers.budget]?.[tool.price] ?? 0
  score += EXPERIENCE_LEVEL_BONUS[answers.experience]?.[tool.level] ?? 0

  // Learners get a nudge toward learning tools regardless of domain.
  if (answers.goal === 'job' && tool.category === 'learning') score += 6

  score += ROLE_SOURCE_AFFINITY[answers.role]?.[tool.sourceCategory] ?? 0

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
// Cuts chosen from the measured distribution, not by eye. Across four personas
// over the whole catalogue these put ~3% in Strong, ~10% in Good and ~19% in
// Possible, leaving two thirds with no badge at all. The old 85/70/55 cuts sat
// above the new ceiling and would have made Strong a 0.2% event — and before
// the baseline fix they made it universal, which is how every card ended up
// reading "Strong fit".
const FIT_BANDS = [
  { min: 75, key: 'strong', label: 'Strong fit' },
  { min: 60, key: 'good', label: 'Good fit' },
  { min: 45, key: 'possible', label: 'Possible fit' },
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

  // Role earns a line only when it actually moved the score. A reason that
  // appears whatever the answer teaches the reader to ignore reasons.
  const roleBonus = ROLE_SOURCE_AFFINITY[answers.role]?.[tool.sourceCategory] ?? 0
  if (roleBonus >= 6) reasons.push('Commonly part of the toolkit for your role.')

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
