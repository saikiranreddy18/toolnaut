import { QUESTIONS } from './quizLogic'

// The conversational layer over the intake questions.
//
// The nine question ids and their option keys are NOT redefined here — they are
// imported from quizLogic, which stays the single source of truth. personaGenerator
// and roadmapGenerator read those exact keys, so the chat is a new way of ASKING
// and deliberately not a new data contract. Change a key in quizLogic and this
// follows automatically.
//
// What this file adds: how each question sounds when a person asks it, what to
// say back once it is answered, and how to turn a free-text reply into one of
// the keys when the offered chips do not fit.

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

// Free-text matching is deterministic keyword scoring, not a model call. The app
// has no backend and ships no key to the browser, so an LLM here would mean
// either exposing a secret or inventing a server. Keywords are honest about what
// they are: when they do not match, the bot asks rather than guessing.
const MATCHERS = {
  domain: {
    code: ['code', 'coding', 'dev', 'developer', 'engineer', 'programming', 'software', 'app', 'backend', 'frontend', 'fullstack', 'web'],
    design: ['design', 'designer', 'ui', 'ux', 'figma', 'graphic', 'video', 'photo', 'image', 'art', 'creative', 'brand', 'motion'],
    writing: ['writ', 'content', 'copy', 'blog', 'marketing', 'seo', 'social', 'newsletter', 'editor', 'journalis'],
    data: ['data', 'analytic', 'analysis', 'sql', 'research', 'insight', 'dashboard', 'report', 'statistic', 'science'],
    automation: ['automat', 'workflow', 'ops', 'zapier', 'agent', 'integrat', 'process', 'productivity', 'admin'],
    learning: ['learn', 'teach', 'study', 'student', 'course', 'training', 'education', 'tutor', 'school', 'college'],
  },
  role: {
    student: ['student', 'learner', 'studying', 'college', 'university', 'fresher', 'graduate', 'intern'],
    developer: ['dev', 'developer', 'engineer', 'programmer', 'coder', 'sde', 'swe', 'backend', 'frontend'],
    designer: ['design', 'ui', 'ux', 'creative', 'artist', 'illustrat', 'brand'],
    creator: ['writer', 'content', 'creator', 'marketer', 'marketing', 'copywriter', 'blogger', 'youtub', 'influencer'],
    founder: ['founder', 'entrepreneur', 'startup', 'owner', 'ceo', 'building my own', 'solo'],
    manager: ['manager', 'product', 'pm', 'lead', 'director', 'head of', 'scrum'],
    analyst: ['analyst', 'research', 'scientist', 'consultant', 'strategist'],
  },
  career_stage: {
    exploring: ['explor', 'switch', 'transition', 'chang', 'pivot', 'new to', 'figuring'],
    early: ['early', 'junior', 'fresher', 'just start', '0-2', '1 year', '2 year', 'first job'],
    mid: ['mid', '3 year', '4 year', '5 year', '6 year', 'few years', 'intermediate'],
    senior: ['senior', 'lead', 'principal', 'staff', 'experienced', '10 year', 'veteran'],
    founder: ['own thing', 'my own', 'founder', 'freelanc', 'self employ', 'consultant', 'business'],
  },
  experience: {
    beginner: ['beginner', 'none', 'never', 'nothing', 'zero', 'brand new', 'no experience', 'just starting'],
    dabbler: ['chatgpt', 'gpt', 'tried', 'dabbl', 'a little', 'sometimes', 'occasionally', 'basic'],
    regular: ['regular', 'daily', 'few tools', 'couple', '2-3', 'comfortable', 'often', 'weekly'],
    builder: ['build', 'building', 'api', 'develop', 'integrat', 'advanced', 'ship', 'production'],
    teacher: ['teach', 'train', 'mentor', 'expert', 'consult', 'coach', 'lead others'],
  },
  goal: {
    ship: ['ship', 'build', 'side project', 'launch', 'product', 'portfolio', 'make something', 'app'],
    job: ['job', 'hire', 'hired', 'career', 'switch', 'interview', 'salary', 'employ', 'placed', 'placement', 'campus', 'recruit', 'resume', 'cv', 'good company'],
    time: ['time', 'faster', 'save', 'efficien', 'productiv', 'automat', 'workload', 'busy'],
    freelance: ['freelanc', 'client', 'income', 'side income', 'consult', 'gig', 'money', 'earn'],
    lead: ['lead', 'team', 'manage', 'promot', 'senior', 'grow into', 'leadership'],
  },
  budget: {
    free: ['free', '0', 'zero', 'nothing', 'no money', 'no budget', 'cant pay', "can't pay", 'student budget'],
    low: ['10', 'cheap', 'small', 'minimal', 'under 10', '1-10', 'few dollars', 'low'],
    mid: ['50', '20', '30', 'moderate', '10-50', 'reasonable', 'mid'],
    high: ['100', '50+', 'whatever', 'no limit', 'plenty', 'high', 'generous'],
    company: ['company', 'employer', 'work pays', 'office', 'business pays', 'expense', 'reimburse'],
  },
  pace: {
    micro: ['barely', 'no time', 'under 1', 'less than an hour', '30 min', 'minimal', 'very busy'],
    light: ['1-2', 'an hour or two', 'hour or two', 'an hour', 'couple of hours', 'couple hours', 'one hour', 'two hours', 'light'],
    steady: ['3-5', 'three', 'four', 'five hours', 'few hours', 'steady', 'evenings'],
    deep: ['5+', 'lots of time', 'plenty', 'full time', 'all in', 'many hours', 'most evenings', 'every day', 'serious'],
  },
  learning_style: {
    search: ['google', 'search', 'stack overflow', 'read', 'docs', 'documentation', 'article'],
    tutorial: ['video', 'youtube', 'tutorial', 'watch', 'follow along', 'demo'],
    ask: ['ask', 'friend', 'colleague', 'community', 'discord', 'someone', 'mentor', 'reddit'],
    tinker: ['tinker', 'break', 'try', 'experiment', 'hands on', 'trial', 'myself', 'play'],
    course: ['course', 'structured', 'class', 'curriculum', 'udemy', 'coursera', 'certificate'],
  },
  blocker: {
    notime: ['time', 'busy', 'schedule', 'hours', 'no time', 'work load'],
    toomany: ['too many', 'choice', 'options', 'overwhelm', 'confus', 'which one', 'noise', 'paralysis'],
    skills: ['skill', 'know how', 'dont know', "don't know", 'learn', 'gap', 'technical', 'hard'],
    cost: ['cost', 'money', 'expensive', 'afford', 'price', 'budget', 'paywall'],
    noplan: ['plan', 'direction', 'where to start', 'roadmap', 'structure', 'lost', 'random'],
  },
}

// What the bot says when it asks. Written to sound like someone who is actually
// listening — the point of replacing a form with a conversation is that it can
// admit why it is asking, and a person answers a question they understand better.
const SCRIPT = {
  domain: {
    ask: "Let's start with the work itself. Where do you spend most of your day?",
    hint: 'Pick whichever is closest — or just tell me in your own words.',
    ack: {
      code: "Code it is. There's a lot of noise in that space — I'll cut it down.",
      design: 'Design and media. That corner of the catalogue moves faster than any other.',
      writing: 'Words and content. Good — the useful tools there are not the loudest ones.',
      data: 'Data and insights. Fewer toys, more genuinely useful things.',
      automation: 'Automation and workflows. This is where the biggest time wins usually hide.',
      learning: 'Learning and teaching. Noted — I will bias toward tools that explain themselves.',
    },
  },
  role: {
    ask: 'And what do people call you when they introduce you?',
    hint: 'Your actual title, or the closest thing to it.',
    ack: {
      student: 'A student — then budget and free tiers matter more than anything else here.',
      developer: 'A developer. Good, I can be specific rather than general.',
      designer: 'A designer. I will keep the recommendations visual-first.',
      creator: 'A writer or marketer — the output is the product, so quality beats novelty.',
      founder: 'A founder. Then your scarcest resource is attention, not tools.',
      manager: 'Product or management. Leverage matters more than hands-on depth.',
      analyst: 'An analyst. Rigour first — I will skip the toys.',
    },
  },
  career_stage: {
    ask: 'How far along are you?',
    hint: 'Roughly is fine.',
    ack: {
      exploring: 'Exploring or switching. That is the hardest place to be and the best time for this.',
      early: 'Early career. The compounding on getting this right now is enormous.',
      mid: 'Mid-career. You already know your craft — this is about multiplying it.',
      senior: 'Senior. You are past tutorials; I will aim higher.',
      founder: 'Running your own thing. Every hour has a price tag, so I will respect that.',
    },
  },
  experience: {
    ask: 'How much AI have you actually used so far?',
    hint: 'Be honest — this changes everything I recommend. Overstating it gets you a worse stack.',
    ack: {
      beginner: 'A total beginner. Good — starting clean is easier than unlearning bad habits.',
      dabbler: "You've tried ChatGPT. That is where most people stop, and where it gets interesting.",
      regular: 'A few tools regularly. So you know the shape of it — we can go deeper.',
      builder: 'You build with it. I will skip the introductions entirely.',
      teacher: 'You teach it. Then I will look for the things you might not have seen yet.',
    },
  },
  goal: {
    ask: 'Three months from now — what would make this feel like it was worth it?',
    hint: 'One thing. The one that would actually matter.',
    ack: {
      ship: 'Ship something real. That is the goal that teaches the most.',
      job: 'A better job. Then the stack needs to be provable, not just useful.',
      time: 'Get your time back. The most underrated goal on this list.',
      freelance: 'Start freelancing. Your stack becomes part of what you sell.',
      lead: 'Lead a team. Then you need tools that scale past you.',
    },
  },
  budget: {
    ask: 'What can you realistically spend on tools each month?',
    hint: 'A free-only stack is a perfectly good stack. Say zero if it is zero.',
    ack: {
      free: 'Free only. I will not put a single thing behind a paywall in your stack.',
      low: 'Up to about ten a month. That buys more than people expect.',
      mid: 'Ten to fifty. Comfortable range — you can afford the one or two that matter.',
      high: 'Fifty plus. Then cost will never be the reason I leave something out.',
      company: 'Your company pays. Then pick on merit and expense it.',
    },
  },
  pace: {
    ask: 'How many hours a week can you genuinely give this?',
    hint: 'Real hours, not aspirational ones. Your roadmap is built from this number.',
    ack: {
      micro: 'Under an hour. Fine — I will keep every step small enough to finish.',
      light: 'One to two hours. Enough for steady progress without burning out.',
      steady: 'Three to five. That is a comfortable pace to actually build something.',
      deep: 'Five or more. Then we can be ambitious about the roadmap.',
    },
  },
  learning_style: {
    ask: 'When you get properly stuck, what do you do first?',
    hint: 'Whatever you actually do — not what you think you should do.',
    ack: {
      search: 'Search first. I will point you at tools with good docs.',
      tutorial: 'Watch someone do it. I will favour tools with real walkthroughs.',
      ask: 'Ask a person. Community strength will factor into what I pick.',
      tinker: 'Break it and find out. The fastest way to learn, and the most fun.',
      course: 'Structured learning. Your roadmap will lean that way.',
    },
  },
  blocker: {
    ask: "Last one, and it's the one that matters most. What's actually getting in your way?",
    hint: 'The real reason, not the polite one.',
    ack: {
      notime: 'Time. Then every recommendation has to earn its hour.',
      toomany: 'Too many options. That is precisely the problem this was built to solve.',
      skills: 'A skills gap. Fixable, and the roadmap is the fix.',
      cost: 'Cost. I will weight free and freemium heavily.',
      noplan: 'No clear plan. Then the roadmap matters more than the tools.',
    },
  },
}

export const CHAT_QUESTIONS = QUESTIONS.map((q) => ({
  id: q.id,
  options: q.options,
  ask: SCRIPT[q.id]?.ask ?? q.text,
  hint: SCRIPT[q.id]?.hint ?? '',
}))

// One line. The long version repeated the badge ("nine questions", "about a
// minute", "no account") word for word one inch above itself — the intro's
// job is to introduce, and everything else already has a place on screen.
export const GREETING =
  "Hey — I'm Naut. I'll chart an AI stack that actually fits you."

export function acknowledge(questionId, optionKey) {
  return SCRIPT[questionId]?.ack?.[optionKey] ?? ''
}

const normalise = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Returns the best-matching option key, or null when nothing scores. Null is a
// real answer here: the caller asks the person to pick a chip instead of
// assigning them a persona they never chose.
export function matchFreeText(questionId, text) {
  const table = MATCHERS[questionId]
  const question = byId[questionId]
  if (!table || !question) return null

  const said = normalise(text)
  if (said.length < 2) return null

  // An exact or near-exact hit on a visible option label wins outright — if
  // someone types the words that are on the button, they mean that button.
  for (const opt of question.options) {
    const label = normalise(opt.label)
    if (said === label || (label.length > 3 && said.includes(label))) return opt.key
  }

  let best = null
  let bestScore = 0
  for (const [key, words] of Object.entries(table)) {
    let score = 0
    for (const w of words) if (said.includes(w)) score += w.length
    if (score > bestScore) {
      bestScore = score
      best = key
    }
  }
  // Require a real signal. A stray "a" or "the" matching a keyword fragment
  // should not decide someone's stack.
  return bestScore >= 3 ? best : null
}

// Free text is kept even when it maps cleanly to a key, because the key is lossy:
// "switching from teaching into data" becomes `exploring` and the reason is gone.
// Stored separately so the quiz payload the rest of the app reads stays exactly
// the shape it already was.
const NOTES_KEY = 'exus_goal_notes_v1'

export function loadNotes() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES_KEY))
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export function saveNote(questionId, text) {
  try {
    const notes = { ...loadNotes(), [questionId]: String(text).slice(0, 400) }
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
    return notes
  } catch {
    return loadNotes()
  }
}

export function clearNotes() {
  try { localStorage.removeItem(NOTES_KEY) } catch { /* storage blocked */ }
}

// Ask the server to understand a typed reply. The key lives only in the Vercel
// function; this just posts the question and the sentence.
//
// Always resolves — never throws and never hangs the conversation. A missing
// endpoint (vite dev serves no /api), a cold function, a slow model or a
// mangled response all come back as { key: null }, and the caller falls through
// to matchFreeText, which is offline and instant. The model makes the chat
// smarter; it is never the thing standing between a visitor and their result.
export async function askServer({ questionId, question, options, text, answered }) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId, question, options, text, answered }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { key: null, reply: null, source: 'http_' + res.status }
    const data = await res.json()
    const valid = new Set(options.map((o) => o.key))
    return {
      key: valid.has(data?.key) ? data.key : null,
      reply: typeof data?.reply === 'string' ? data.reply : null,
      source: data?.source || 'llm',
    }
  } catch {
    return { key: null, reply: null, source: 'unreachable' }
  }
}
