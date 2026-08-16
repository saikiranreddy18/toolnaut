import { generatePersona } from './personaGenerator'
import { findToolByName, getTool, CATEGORY_META } from './toolsCatalog'
import { loadStack } from '../state/stackStore'

// Builds a 4-week learning roadmap from the persona's starter stack plus any
// tools the user added in Discover. Each week focuses on one tool and carries
// 3 concrete steps — each backed by a short lesson — plus a checkpoint quiz the
// learner must pass to clear the week. Deterministic: the same profile always
// yields the same roadmap, lessons, and quiz (a backend can replace this later,
// e.g. the radar pipeline's richer LLM-generated course content).

const GOAL_CAPSTONE = {
  ship: 'Ship a small real project that uses your top two tools together.',
  job: 'Add your new stack to your resume and portfolio with one demo piece.',
  time: 'Automate one recurring task at work end-to-end.',
  freelance: 'Package your workflow into a service you could sell.',
  lead: 'Write a one-page playbook so your team can adopt your stack.',
}

// Small stable hash so option order / answer position are fixed per tool
// (no Math.random — same tool always renders the same quiz).
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

// Deterministically place `answer` among `distractors` and return options.
function shuffleWithAnswer(answer, distractors, seed) {
  const opts = [answer, ...distractors]
  const pos = seed % opts.length
  // move answer from index 0 to index `pos`
  const [ans] = opts.splice(0, 1)
  opts.splice(pos, 0, ans)
  return { options: opts, answerIndex: pos }
}

// Lowercase the first letter so a blurb reads mid-sentence — but leave leading
// acronyms alone ("AI-first…" must not become "aI-first…").
const lower = (s) => {
  if (!s) return s
  if (s.length > 1 && s[0] === s[0].toUpperCase() && s[1] === s[1].toUpperCase()) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}
const PRICE_LABEL = { free: 'Free', freemium: 'Freemium', paid: 'Paid' }
const PROMPTABLE = new Set(['writing', 'code', 'learning'])

// How many steps a week carries, scaled to the time the user has. Fewer steps
// for a busy week keeps the plan honest; a heavy week earns a stretch step.
const PACE_STEPS = { micro: 2, light: 3, steady: 3, deep: 4 }

// A per-week study tip matched to how the user says they learn. Wires the
// previously-unused learning_style answer into something visible.
const STYLE_TIP = {
  search: 'You Google your way out — bookmark each tool’s official docs first.',
  tutorial: 'You learn by watching — queue one short walkthrough before you start.',
  ask: 'You learn best with people — post your progress in SQUAD and ask.',
  tinker: 'You learn by doing — skip the manual and just start clicking.',
  course: 'You like structure — treat each week like a mini-course, in order.',
}

function stepsFor(tool, level, pace) {
  const beginnerish = level === 'beginner' || level === 'dabbler'
  const all = [
    beginnerish
      ? `Set up ${tool.name} and complete the official "getting started" flow.`
      : `Configure ${tool.name} for your real workflow, not the demo one.`,
    `Use ${tool.name} on one small task and note where it saves you time.`,
    beginnerish
      ? `Find one keyboard shortcut or feature that makes it click.`
      : `Push ${tool.name} to an edge case and learn where it breaks.`,
    `Write three lines on when to reach for ${tool.name} — and when not to.`,
  ]
  return all.slice(0, PACE_STEPS[pace] || 3)
}

// One lesson per step: a couple sentences of "why", a concrete action, and —
// for prompt-driven tools — a copy-paste starter. Sliced by pace so it stays
// parallel to stepsFor().
function lessonsFor(tool, level, pace) {
  const beginnerish = level === 'beginner' || level === 'dabbler'
  const site = tool.website ? tool.website : 'the official site'
  const prompt = PROMPTABLE.has(tool.category)
    ? `You are helping me with ${lower(tool.blurb)}. Here's what I'm working on today: [paste your real task]. Walk me through it step by step and point out anything I'd otherwise miss.`
    : null

  const all = [
    {
      body: `${tool.name} is ${lower(tool.blurb)}. Before it can save you any time, get past the demo — point it at something you already work on. The sample project teaches you the buttons; your own work teaches you the tool.`,
      action: beginnerish
        ? `Sign up at ${site}, run the getting-started flow, then immediately redo it against one real thing from this week.`
        : `Skip the tutorial. Wire ${tool.name} into one workflow you actually run, config and all.`,
      prompt,
    },
    {
      body: `The goal isn't to explore every feature — it's to feel the one moment ${tool.name} beats your old way of doing this. That moment is what makes it stick.`,
      action: `Run one real task end-to-end through ${tool.name} and write down the minutes saved versus doing it by hand.`,
      prompt: null,
    },
    {
      body: beginnerish
        ? `Mastery hides in the small stuff — a single shortcut or setting that removes friction you stopped noticing. Find one and it changes how the whole tool feels.`
        : `You learn a tool's real shape at its edges. Push ${tool.name} until it breaks and you'll know exactly when to reach for it and when not to.`,
      action: beginnerish
        ? `Find one shortcut or hidden setting in ${tool.name} and use it three times today.`
        : `Throw an edge case at ${tool.name}, note where it fails, and decide your fallback.`,
      prompt: null,
    },
    {
      body: `You truly know a tool when you can say where it stops being the right call. Naming that boundary is what turns ${tool.name} from a toy into judgement.`,
      action: `Write three lines: two jobs ${tool.name} is perfect for, and one where you'd reach for something else.`,
      prompt: null,
    },
  ]
  return all.slice(0, PACE_STEPS[pace] || 3)
}

// A 3-question checkpoint built from the tool's own facts. `siblings` are the
// other tools in the roadmap — their blurbs make the sharpest distractors.
function quizFor(tool, siblings) {
  const seed = hash(tool.slug)
  const catName = CATEGORY_META[tool.category]?.name || tool.category
  const otherCats = Object.keys(CATEGORY_META)
    .filter((c) => c !== tool.category)
    .map((c) => CATEGORY_META[c].name)
  const catDistractors = [
    otherCats[seed % otherCats.length],
    otherCats[(seed + 1) % otherCats.length],
    otherCats[(seed + 2) % otherCats.length],
  ]

  const priceAnswer = PRICE_LABEL[tool.price] || 'Freemium'
  const priceDistractors = ['Free', 'Freemium', 'Paid'].filter((p) => p !== priceAnswer)

  const blurbDistractors = siblings
    .map((s) => s.blurb)
    .filter((b) => b && b !== tool.blurb)
    .slice(0, 3)
  while (blurbDistractors.length < 3) {
    blurbDistractors.push(
      ['A no-code website builder', 'A team chat and messaging app', 'A cloud file-storage service'][blurbDistractors.length],
    )
  }

  const q1 = shuffleWithAnswer(catName, catDistractors, seed)
  const q2 = shuffleWithAnswer(priceAnswer, priceDistractors, seed + 7)
  const q3 = shuffleWithAnswer(tool.blurb, blurbDistractors.slice(0, 3), seed + 13)

  return [
    { q: `What kind of tool is ${tool.name}?`, options: q1.options, answer: q1.answerIndex },
    { q: `How is ${tool.name} priced?`, options: q2.options, answer: q2.answerIndex },
    { q: `In one line, what is ${tool.name} for?`, options: q3.options, answer: q3.answerIndex },
  ]
}

export function generateRoadmap() {
  const quiz = JSON.parse(localStorage.getItem('exus_quiz_v1') || 'null')
  if (!quiz?.completed) return null

  const persona = generatePersona(quiz.answers)
  const level = quiz.answers.experience
  const pace = quiz.answers.pace
  const styleTip = STYLE_TIP[quiz.answers.learning_style] || null

  // Order tools: starter stack first (already catalog entries), then added.
  const starter = persona.stack
    .map((s) => (s.slug ? getTool(s.slug) : findToolByName(s.name)))
    .filter(Boolean)
  const added = loadStack().map(getTool).filter(Boolean)

  const ordered = []
  const seen = new Set()
  for (const tool of [...starter, ...added]) {
    if (!seen.has(tool.slug)) { seen.add(tool.slug); ordered.push(tool) }
  }
  while (ordered.length < 3 && starter.length) ordered.push(starter[ordered.length % starter.length])

  const pickedTools = ordered.slice(0, 3)
  const toolWeeks = pickedTools.map((tool, i) => ({
    id: `w${i + 1}`,
    week: i + 1,
    title: `Master ${tool.name}`,
    tool,
    focus: tool.blurb,
    styleTip,
    steps: stepsFor(tool, level, pace),
    lessons: lessonsFor(tool, level, pace),
    quiz: quizFor(tool, pickedTools.filter((t) => t.slug !== tool.slug)),
  }))

  const capstone = {
    id: 'w4',
    week: 4,
    title: 'Put it together',
    tool: null,
    focus: GOAL_CAPSTONE[quiz.answers.goal] || 'Combine your tools into one real workflow.',
    steps: [
      'Pick a real outcome you care about this month.',
      `Route it through ${toolWeeks.map((w) => w.tool.name).slice(0, 2).join(' + ')}.`,
      'Share what you built — a post, a demo, or a teammate walkthrough.',
    ],
    lessons: [
      {
        body: 'Learning sticks when it ships. Pick something small but real — a task you actually need done this month, not a practice exercise. Constraints beat blank pages.',
        action: 'Write one sentence: "By the end of this week I will have ___." Make it specific enough to be done or not done.',
        prompt: null,
      },
      {
        body: `Your tools are strongest in combination. Hand the output of one to the next — that hand-off is where a stack stops being a list and becomes a workflow.`,
        action: `Do the outcome for real, routing it through ${toolWeeks.map((w) => w.tool.name).slice(0, 2).join(' → ')}.`,
        prompt: null,
      },
      {
        body: 'Sharing what you built is the fastest way to lock it in and the cheapest way to get better. A rough demo beats a polished draft nobody sees.',
        action: 'Post it, demo it, or walk one person through it. Note the first question they ask — that\'s your next thing to learn.',
        prompt: null,
      },
    ],
    quiz: null, // the capstone is proof-of-work; no knowledge check
  }

  return { persona, milestones: [...toolWeeks, capstone] }
}
