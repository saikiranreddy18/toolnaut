import { TOOLS } from './toolsCatalog'
import { matchScore } from './matchScore'

// Recommendation confidence = how complete and decision-relevant the signals
// are — NOT a claim that the system "knows" anyone. Two honest inputs:
//
//   1. SIGNAL COMPLETENESS — which of the intake's answers exist. Weighted by
//      how much each one actually moves matchScore: domain swings ±28, budget
//      and experience ±12 each, the rest colour the persona and roadmap more
//      than the ranking.
//
//   2. THE CANDIDATE POOL — how many real tools the scorer rates highly for
//      THIS profile. This replaces a hand-maintained conflict table: a
//      restrictive combination (free-only budget in a premium-heavy domain,
//      beginner level where everything is advanced) shows up as a thin pool
//      MEASURED against the live catalogue, which catches conflicts nobody
//      thought to enumerate and never fires on ones that turn out benign.
//
// Never surfaced as "82.4% accurate" — that implies statistical calibration
// this does not have. Callers get a BAND with an explanation and the single
// most valuable missing signal.

// Weights reflect matchScore's real sensitivities, normalised to 100.
const SIGNALS = [
  { id: 'domain', weight: 30, label: 'your field of work' },
  { id: 'experience', weight: 16, label: 'your experience level' },
  { id: 'budget', weight: 16, label: 'your budget' },
  { id: 'goal', weight: 12, label: 'what you want out of AI' },
  { id: 'role', weight: 8, label: 'your role' },
  { id: 'learning_style', weight: 6, label: 'how you like to learn' },
  { id: 'pace', weight: 4, label: 'your pace' },
  { id: 'career_stage', weight: 4, label: 'where you are in your career' },
  { id: 'blocker', weight: 4, label: 'what blocks you' },
]

const STRONG_MATCH = 78 // a score matchScore only awards on real alignment

export const BANDS = [
  { min: 85, key: 'tailored', label: 'Highly tailored' },
  { min: 65, key: 'strong', label: 'Strong fit' },
  { min: 40, key: 'good', label: 'Good start' },
  { min: 0, key: 'basic', label: 'Basic' },
]

export function recommendationConfidence(answers = {}) {
  let score = 0
  const missing = []
  for (const s of SIGNALS) {
    if (answers[s.id] != null && answers[s.id] !== '') score += s.weight
    else missing.push(s)
  }

  // The pool check. Only meaningful once there is a domain to score against.
  let pool = null
  let constrained = false
  if (answers.domain) {
    pool = TOOLS.reduce((n, t) => {
      const m = matchScore(t, answers)
      return m != null && m >= STRONG_MATCH ? n + 1 : n
    }, 0)
    if (pool < 3) {
      score = Math.max(0, score - 15)
      constrained = true
    }
  }

  const band = BANDS.find((b) => score >= b.min)

  return {
    score,
    band: band.key,
    label: band.label,
    constrained,
    pool,
    // The single highest-value follow-up — ask ONE question, not a survey.
    nextSignal: missing.length ? missing[0].label : null,
    // What the system genuinely has, for the "we know X, Y and Z" line.
    known: SIGNALS.filter((s) => answers[s.id] != null && answers[s.id] !== '').map((s) => s.label),
  }
}
