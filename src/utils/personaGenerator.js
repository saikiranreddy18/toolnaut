import { TOOLS, CATEGORY_META } from './toolsCatalog'
import { FLAGSHIP, starterScore } from './prominence'
import { partitionByEligibility } from './eligibility'

const DOMAIN_NOUN = {
  code: 'Builder',
  design: 'Design Engineer',
  writing: 'Storyteller',
  data: 'Analyst',
  automation: 'Systems Thinker',
  learning: 'Guide',
}

// Career role gives the persona noun priority over the domain — a persona should
// read as who the user IS, then what they're building.
const ROLE_NOUN = {
  student: 'Learner',
  developer: 'Engineer',
  designer: 'Designer',
  creator: 'Creator',
  founder: 'Founder',
  manager: 'Operator',
  analyst: 'Analyst',
}

const ROLE_LABEL = {
  student: 'Student',
  developer: 'Developer',
  designer: 'Designer',
  creator: 'Writer / Marketer',
  founder: 'Founder',
  manager: 'Product / Manager',
  analyst: 'Analyst',
}

const STAGE_LABEL = {
  exploring: 'Exploring',
  early: 'Early-career',
  mid: 'Mid-level',
  senior: 'Senior',
  founder: 'Founder',
}

const EXPERIENCE_ADJ = {
  beginner: 'Curious',
  dabbler: 'Emerging',
  regular: 'Practical',
  builder: 'Ambitious',
  teacher: 'Visionary',
}

const GOAL_TAGLINE = {
  ship: 'You turn ideas into shipped projects.',
  job: 'You are stacking skills that hiring managers notice.',
  time: 'You reclaim hours from repetitive work.',
  freelance: 'You are building an independent practice.',
  lead: 'You set the AI direction others follow.',
}

// What each blocker earns as reassurance — shown on the persona reveal so the
// user feels understood, not just categorised.
const BLOCKER_SUBLINE = {
  notime: 'We picked just 3 tools so you skip the endless search.',
  toomany: 'No more tab-hopping — this is your shortlist, not the whole 700.',
  skills: 'Each week builds the skill, not just the tool.',
  cost: 'Your path leans on free and freemium picks first.',
  noplan: 'Here it is: a 4-week plan, mapped step by step.',
}

// Readable "Mid-level Developer" style career line (dedupes "Founder Founder").
function careerLine(role, stage) {
  const r = ROLE_LABEL[role]
  const s = STAGE_LABEL[stage]
  if (!r && !s) return null
  if (r && s && r !== s) return `${s} ${r}`
  return r || s
}

// answers: { domain, role, career_stage, experience, goal, budget, pace,
//            learning_style, blocker }
export function generatePersona(answers) {
  const domain = answers?.domain && CATEGORY_META[answers.domain] ? answers.domain : 'code'
  const meta = CATEGORY_META[domain]
  const adj = EXPERIENCE_ADJ[answers?.experience] || 'Curious'
  // Career role names the persona when known; domain is the fallback.
  const noun = ROLE_NOUN[answers?.role] || DOMAIN_NOUN[domain] || 'Explorer'
  const career = careerLine(answers?.role, answers?.career_stage)

  const flagships = FLAGSHIP[domain] || []
  const byProminence = (a, b) =>
    starterScore(b, flagships) - starterScore(a, flagships) || a.name.localeCompare(b.name)

  // Budget is a HARD constraint, applied before prominence rather than as a
  // score penalty afterwards. This path never called matchScore, so a
  // "$0 - free only" answer was previously ignored outright here: three of six
  // domains put a paid tool in the starter three, with Midjourney the top pick
  // for design. The starter stack is the first thing a new visitor sees, so it
  // is the worst possible place to contradict what they just told us.
  const inDomain = TOOLS.filter((t) => t.category === domain)
  const { eligible, excluded } = partitionByEligibility(inDomain, answers)

  const stack = [...eligible].sort(byProminence).slice(0, 3)

  // Surfaced, not silently dropped: the caller can show these as clearly
  // labelled alternatives. Re-adding them to `stack` would defeat the filter,
  // and hiding them entirely would leave the person wondering where the
  // well-known tool went.
  const excludedByBudget = [...excluded].sort(byProminence).slice(0, 3)

  const stage = answers?.career_stage
  const seniorish = stage === 'senior' || stage === 'founder' || answers?.role === 'founder' || answers?.role === 'manager'

  return {
    name: `${adj} ${noun}`,
    tagline: GOAL_TAGLINE[answers?.goal] || 'You are mapping your own path through AI.',
    subline: BLOCKER_SUBLINE[answers?.blocker] || null,
    career, // e.g. "Mid-level Developer" — null if role/stage unanswered
    category: { id: domain, name: meta.name, color: meta.color },
    stack,
    excludedByBudget,
    // True when the filter actually bit, so the UI can explain the gap instead
    // of rendering an unexplained empty section.
    constrained: excludedByBudget.length > 0,
    suggestedPlan:
      answers?.budget === 'free' || answers?.budget === 'low'
        ? 'Student'
        : answers?.goal === 'lead' || seniorish
          ? 'Team'
          : 'Pro',
  }
}
