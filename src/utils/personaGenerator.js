import { TOOLS, CATEGORY_META } from './toolsCatalog'

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

// Recognisable flagship tools per domain. The source data has no popularity
// signal, so this small curated list keeps a fresh user's starter stack full
// of names they'll actually recognise, with accessibility scoring as tiebreak.
const FLAGSHIP = {
  code: ['Claude Code', 'Cursor', 'GitHub Copilot', 'Windsurf', 'Replit'],
  design: ['Midjourney', 'Canva', 'Figma', 'Adobe Firefly', 'Runway'],
  writing: ['ChatGPT', 'Claude', 'Grammarly', 'Notion AI', 'Jasper'],
  data: ['Perplexity', 'Julius', 'ChatGPT', 'Hex', 'Tableau'],
  automation: ['Zapier', 'n8n', 'Make', 'Gumloop', 'Lindy'],
  learning: ['NotebookLM', 'Khanmigo', 'Duolingo', 'Quizlet', 'Gamma'],
}

// Rank a domain's tools so the starter stack leads with recognisable flagships,
// then favours approachable, active, low-cost picks for a fresh user.
function starterScore(t, flagships) {
  let s = 0
  const rank = flagships.indexOf(t.name)
  if (rank !== -1) s += 20 - rank // flagship order wins decisively
  if (t.price === 'freemium') s += 3
  else if (t.price === 'free') s += 2
  if (t.level === 'beginner') s += 2
  else if (t.level === 'intermediate') s += 1
  if (t.status === 'Active') s += 1
  if (t.year) s += Math.max(0, t.year - 2021) * 0.3 // gentle recency nudge
  return s
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
  const stack = TOOLS
    .filter((t) => t.category === domain)
    .sort((a, b) => starterScore(b, flagships) - starterScore(a, flagships) || a.name.localeCompare(b.name))
    .slice(0, 3)

  const stage = answers?.career_stage
  const seniorish = stage === 'senior' || stage === 'founder' || answers?.role === 'founder' || answers?.role === 'manager'

  return {
    name: `${adj} ${noun}`,
    tagline: GOAL_TAGLINE[answers?.goal] || 'You are mapping your own path through AI.',
    subline: BLOCKER_SUBLINE[answers?.blocker] || null,
    career, // e.g. "Mid-level Developer" — null if role/stage unanswered
    category: { id: domain, name: meta.name, color: meta.color },
    stack,
    suggestedPlan:
      answers?.budget === 'free' || answers?.budget === 'low'
        ? 'Student'
        : answers?.goal === 'lead' || seniorish
          ? 'Team'
          : 'Pro',
  }
}
