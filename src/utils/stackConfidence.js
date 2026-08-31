// How much Toolnaut actually knows about a visitor's Stack — and what to say
// about it.
//
// TWO RULES SHAPE EVERYTHING HERE.
//
// 1. UNKNOWN IS NOT A VALUE. A field nobody answered is `unknown`, never a
//    guess. "individual" means someone said they work alone; "unknown" means
//    we did not ask. Collapsing the second into the first invents a claim and
//    then recommends against it — the exact failure this module exists to stop.
//    The quiz has nine questions and none of them ask about team, so today
//    EVERY visitor's team context is unknown. That is not an edge case here.
//
// 2. NO PERCENTAGES IN THE UI. A calibrated number needs a calibrated model,
//    and we have neither. "72% confident" reads as precision we have not
//    earned, and it makes people either over-trust the Stack or dismiss it.
//    The score below is internal; what reaches the screen is a plain label and
//    one useful next action.
//
// The score is deliberately about the RECOMMENDATION, not about how many
// questions got answered: a fully-answered profile with two matching tools is
// less trustworthy than a half-answered one with twelve.

export const UNKNOWN = 'unknown'

// Weights follow the spec's C_base, mapped onto the questions that exist.
// career_stage, pace and learning_style are deliberately absent: they shape the
// roadmap, not which tools fit, so letting them raise tool confidence would
// measure the wrong thing.
const FIELD_WEIGHTS = {
  goal: 30,       // G — what they want to be true in three months
  role: 20,       // R — who they are
  experience: 20, // T — how technical the answer may be
  blocker: 15,    // P — the decision priority
  domain: 10,     // W — the workflow they live in
  budget: 5,      // B — cost/hosting constraint
}

// Missing-team weight before relevance is applied. The spec's range tops out
// around 15 for a team-operations buyer.
const MISSING_TEAM_WEIGHT = 15

export function profileCompleteness(answers = {}) {
  let have = 0
  let total = 0
  for (const [field, w] of Object.entries(FIELD_WEIGHTS)) {
    total += w
    if (answers[field]) have += w
  }
  return total ? Math.round((have / total) * 100) : 0
}

// Team context is read, never inferred. Absent means absent.
export function teamContext(answers = {}) {
  return answers.team_context || UNKNOWN
}

// How much would knowing the team change the tools we pick? 0 = not at all,
// 1 = the answer is different depending on it.
//
// The founder/freelancer split the spec asks for falls out of two fields
// rather than one: a founder shipping a side project alone is not the same
// buyer as a founder who picked "lead a team", even though `role` matches.
export function teamRelevance(answers = {}) {
  const { role, goal, career_stage: stage, budget } = answers

  // Explicit team intent — the answer changes seats, sharing and admin.
  if (goal === 'lead') return 1
  if (role === 'manager') return 0.9

  if (role === 'founder') {
    // Solo prototype vs buying for other people. "Running my own thing" plus
    // shipping a project reads as one person; anything else reads as a team.
    if (stage === 'founder' && goal === 'ship') return 0.35
    return 0.7
  }

  // Someone else pays => there is an organisation, even if small.
  if (budget === 'company') return 0.5

  // Client work: sharing and hand-off matter, the Stack mostly does not.
  if (goal === 'freelance') return 0.4

  // Learners are the clearest solo case in the catalogue.
  if (role === 'student') return 0.05

  return 0.2
}

// Points off for not knowing the team, scaled by whether it matters.
export function teamPenalty(answers = {}) {
  if (teamContext(answers) !== UNKNOWN) return 0
  return Math.round(MISSING_TEAM_WEIGHT * teamRelevance(answers))
}

// Ask only when the answer changes the Stack. Anything below this and the
// question is friction for its own sake.
export function needsTeamRefinement(answers = {}) {
  return teamContext(answers) === UNKNOWN && teamRelevance(answers) >= 0.7
}

// Conflicts worth naming, drawn from fields the quiz actually collects. Both
// are real trade-offs a person can act on, not scolding.
export function constraintConflicts(answers = {}) {
  const out = []
  if (answers.budget === 'free' && teamRelevance(answers) >= 0.7) {
    out.push('Team tooling on a $0 budget — shared workspaces and admin controls are almost always paid.')
  }
  if (answers.pace === 'micro' && answers.goal === 'ship' && answers.experience === 'beginner') {
    out.push('Shipping a project from a standing start, at under an hour a week.')
  }
  return out
}

// Candidate coverage bands. Fewer than three viable tools is low confidence
// however complete the profile is — there is simply not a Stack to pick from.
export function coverageBand(candidateCount) {
  if (!Number.isFinite(candidateCount)) return 'unknown'
  if (candidateCount === 0) return 'none'
  if (candidateCount <= 2) return 'sparse'
  if (candidateCount <= 12) return 'good'
  return 'broad'
}

// How many tools actually survive the visitor's HARD constraints — the two the
// quiz collects that are pass/fail rather than preference. Budget is the real
// one: "free only" is not a leaning, it is a wall, and a Stack assembled past
// it is a Stack the person cannot buy.
//
// Takes the catalogue as an argument so this module stays pure and testable.
const BUDGET_ALLOWS = {
  free: new Set(['free']),
  low: new Set(['free', 'freemium']),
  mid: null, // no wall
  high: null,
  company: null,
}

export function hardFilterCount(tools = [], answers = {}) {
  const allowed = BUDGET_ALLOWS[answers.budget]
  return tools.filter((t) => {
    if (allowed && !allowed.has(t.price)) return false
    if (answers.domain && t.category !== answers.domain) return false
    return true
  }).length
}

// Gap between the top two matches. When everything scores the same, we should
// be offering a comparison, not asserting a winner.
export function rankingSeparation(scores = []) {
  const s = [...scores].sort((a, b) => b - a)
  if (s.length < 2) return null
  return s[0] - s[1]
}

const LABELS = {
  starter: {
    label: 'Starter recommendations',
    copy: 'These are based on your goal. Add one detail to make them more specific.',
    cta: 'Refine my Stack',
  },
  good: {
    label: 'Good starting fit',
    copy: 'We matched your goal, role and how you like to work.',
    cta: 'Add tools you already use',
  },
  tailored: {
    label: 'Tailored to your workflow',
    copy: 'Your Stack reflects your goal, technical level and priorities.',
    cta: 'See why these tools fit',
  },
  tradeoffs: {
    label: 'Trade-offs detected',
    copy: 'Some of your priorities pull against each other, so a few picks are compromises.',
    cta: 'Choose what matters most',
  },
  limited: {
    label: 'Limited matching options',
    copy: 'Few tools meet everything you asked for.',
    cta: 'Adjust requirements',
  },
  team: {
    label: 'Team details needed',
    copy: 'Team size changes collaboration, pricing and admin controls.',
    cta: 'Tell us about your team',
  },
}

// The one function the UI calls. Returns a label, the reason, and exactly one
// next action — never a percentage, and never a bare warning.
//
// Order matters: a hard shortage of candidates outranks a tidy profile, and a
// question that would change the answer outranks a score that cannot see it.
export function stackConfidence({ answers = {}, candidateCount = null, scores = [] } = {}) {
  const completeness = profileCompleteness(answers)
  const penalty = teamPenalty(answers)
  const score = Math.max(0, Math.min(100, completeness - penalty))
  const conflicts = constraintConflicts(answers)
  const coverage = coverageBand(candidateCount)
  const separation = rankingSeparation(scores)

  let key
  if (coverage === 'none' || coverage === 'sparse') key = 'limited'
  else if (needsTeamRefinement(answers)) key = 'team'
  else if (conflicts.length) key = 'tradeoffs'
  else if (score >= 65) key = 'tailored'
  else if (score >= 40) key = 'good'
  else key = 'starter'

  return {
    ...LABELS[key],
    key,
    // internal only — deliberately not rendered as a number
    score,
    completeness,
    teamPenalty: penalty,
    teamContext: teamContext(answers),
    teamRelevance: teamRelevance(answers),
    conflicts,
    coverage,
    separation,
    // what we still do not know, in the order it would help most
    missing: Object.keys(FIELD_WEIGHTS)
      .filter((f) => !answers[f])
      .sort((a, b) => FIELD_WEIGHTS[b] - FIELD_WEIGHTS[a]),
  }
}
