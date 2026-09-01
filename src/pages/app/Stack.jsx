import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loadQuiz } from '../../state/quizStore'
import { generatePersona } from '../../utils/personaGenerator'
import { getTool, TOOLS, CATEGORY_META } from '../../utils/toolsCatalog'
import { matchScore, matchReasonShort, fitBand } from '../../utils/matchScore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { haptic } from '../../utils/haptics'
import { encodeStackSlugs } from '../../utils/shareStack'
import { recognisableStarters } from '../../utils/prominence'
import { recordVisit, weekDots } from '../../state/streakStore'
import { generateRoadmap } from '../../utils/roadmapGenerator'
import { loadRoadmapProgress, milestoneComplete } from '../../state/roadmapStore'
import { loadProgress, cycleProgress, STATUSES } from '../../state/progressStore'
import SkillGraph from '../../components/app/SkillGraph'
import ToolCard from '../../components/app/ToolCard'
import { useAnalytics } from '../../hooks/useAnalytics'
import { markStackSeen } from '../../utils/funnel'

// Deterministic daily pick: same tool all day, a new one tomorrow — so every
// open of the app has something unexplored in it.
function toolOfTheDay(answers, excludeNames, excludeSlugs) {
  const candidates = TOOLS
    // Budget is a hard constraint here too. The starter stack already honours
    // it (personaGenerator partitions before prominence), but this path ranked
    // the whole catalogue on matchScore alone — so a "$0 - free only" visitor
    // could be handed a paid tool as their pick of the day, in the one slot on
    // the page that exists to be acted on.
    .filter((t) => passesHardConstraints(t, answers))
    .filter((t) => !excludeNames.has(t.name) && !excludeSlugs.includes(t.slug))
    .map((t) => ({ ...t, score: matchScore(t, answers) ?? 50 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12) // rotate within the user's top matches
  if (candidates.length === 0) return null
  const day = Math.floor(Date.now() / 86400000)
  return candidates[day % candidates.length]
}

const cardIn = (i) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] },
})

const GREETINGS = {
  night: ['burning the midnight fuel', 'you\'re an owl 🦉', 'nocturnal grind energy'],
  morning: ['rise and shine', 'coffee in hand?', 'morning explorer energy'],
  afternoon: ['mid-day momentum', 'keep cooking', 'afternoon architect'],
  evening: ['golden hour glow', 'evening expedition', 'dusk explorer'],
}

function ProgressRing({ value }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="19" cy="19" r={r} fill="none"
        stroke="#06b6d4" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        transform="rotate(-90 19 19)"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  )
}

export default function Stack() {
  const track = useAnalytics()
  const quiz = loadQuiz()
  const persona = quiz.completed ? generatePersona(quiz.answers) : null

  // The activation milestone the review cares about: a personalised stack
  // was actually SEEN. Latched inside markStackSeen, so re-renders and
  // revisits cannot re-fire it and inflate the rate past 100%.
  useEffect(() => {
    if (persona) markStackSeen(track, { role: quiz.answers?.role, goal: quiz.answers?.goal })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(persona)])
  const [progress, setProgress] = useState(loadProgress)
  const [addedSlugs, setAddedSlugs] = useState(loadStack)
  const [copied, setCopied] = useState(false)

  const hour = new Date().getHours()
  const period = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  // Stable per period — was re-rolling on every re-render before (e.g. every
  // stack edit), making the greeting flicker mid-session.
  const greeting = useMemo(() => {
    const options = GREETINGS[period]
    return options[Math.floor(Math.random() * options.length)]
  }, [period])

  // Recorded once per mount. recordVisit is idempotent within a calendar day,
  // so this both persists today's visit and returns the streak to render —
  // no separate write-back effect, and the dots below reflect real visits only.
  const [visit] = useState(() => recordVisit())
  const streak = visit.count
  const dots = weekDots(visit.days)

  // Tools added from Discover, minus any that duplicate the starter stack.
  const starterNames = new Set((persona?.stack || []).map((t) => t.name))
  const addedTools = addedSlugs
    .map(getTool)
    .filter((t) => t && !starterNames.has(t.name))

  // Where LEARN currently stands, read from the same store that page writes.
  // Stack is the app's home screen, so it is the right place to say what the
  // next move is — otherwise the two pages never reference each other and the
  // product reads as a set of unrelated tabs.
  const nextLearningStep = useMemo(() => {
    const roadmap = generateRoadmap()
    const done = loadRoadmapProgress()
    const next = (roadmap?.milestones || []).find((m) => !milestoneComplete(done, m))
    return next ? { week: next.week, title: next.title } : null
  }, [])

  function cycle(toolName) {
    setProgress({ ...cycleProgress(progress, toolName) })
  }

  async function copyShareLink() {
    haptic.tap()
    const slugs = [...(persona?.stack || []).map((t) => t.slug), ...addedSlugs]
    const url = `${window.location.origin}/s/${encodeStackSlugs(slugs)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard blocked */ }
  }

  // First run: signed in, no quiz yet. This is the app's front door and the
  // single most-seen screen, so it has to do more than point at the quiz —
  // it explains what a stack IS, offers a route for people who won't answer
  // nine questions, and puts real, addable tools on the page so the screen is
  // productive instead of a 70dvh void. Tools are ranked by prominence only
  // (no persona to score against yet), never invented.
  if (!persona) {
    const picks = recognisableStarters(TOOLS, 3)
    // This screen gates on PERSONA, but it was claiming the STACK was empty —
    // two different things. Add tools as a guest, skip the quiz, and the page
    // said "YOUR STACK IS EMPTY" above the tools you had just added. Worse
    // after guest-import, where someone brings a stack to a new account and is
    // told they have nothing. Say what is actually missing.
    const started = addedSlugs.length > 0

    return (
      <div className="mx-auto max-w-4xl px-5 xl:max-w-6xl py-6 lg:py-10">
        <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ STACK</p>
        <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
          {started ? <>{addedSlugs.length} TOOL{addedSlugs.length === 1 ? '' : 'S'},<br />NO PROFILE YET</> : <>YOUR STACK<br />IS EMPTY</>}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300">
          {started ? (
            <>
              Your tools are saved. What is missing is the profile that ranks
              them — nine questions about how you work, scored against all{' '}
              {TOOLS.length} tools in the catalog.
            </>
          ) : (
            <>
              A stack is the short list of AI tools you actually use. Toolnaut builds
              yours from nine questions about how you work, then scores all{' '}
              {TOOLS.length} tools in the catalog against that profile.
            </>
          )}
        </p>

        {started && (
          <div className="sticker mt-6 p-4" style={{ transform: 'rotate(0)' }}>
            <p className="font-display text-[10px] font-black uppercase tracking-widest text-slate-400">In your stack</p>
            <p className="mt-2 text-sm font-bold text-white">
              {addedSlugs.map((s) => getTool(s)?.name).filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/goal" className="nb-btn px-6 py-3 text-sm">⚡ BUILD MY STACK — 60 SECONDS</Link>
          <Link to="/app/discover" className="nb-btn dark px-5 py-3 text-sm">BROWSE ALL TOOLS →</Link>
        </div>

        <div className="sticker mt-8 p-5" style={{ transform: 'rotate(0)' }}>
          <span className="tape-label text-xs">◆ what the quiz unlocks</span>
          <ul className="mt-4 space-y-2.5">
            {[
              ['A starter kit', 'three tools picked for your role, not a generic top-ten'],
              ['A match score', `every one of the ${TOOLS.length} tools ranked against how you work`],
              ['A 4-week path', 'a roadmap through the tools you end up with'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                <span className="mt-0.5 shrink-0 font-black" style={{ color: 'var(--lime)' }} aria-hidden="true">◆</span>
                <span><span className="font-bold text-white">{title}</span> — {body}</span>
              </li>
            ))}
          </ul>
        </div>

        {picks.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="tape-label text-xs">⚡ start with a name you know</span>
              <span className="font-display text-xs font-bold uppercase tracking-widest text-slate-500">
                add now — these carry into your stack
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {picks.map((tool, i) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  index={i}
                  inStack={addedSlugs.includes(tool.slug)}
                  onToggleStack={() => {
                    if (addedSlugs.includes(tool.slug)) setAddedSlugs(removeFromStack(tool.slug))
                    else { haptic.select(); setAddedSlugs(addToStack(tool.slug)) }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const daily = toolOfTheDay(quiz.answers, starterNames, addedSlugs)
  const dailyMeta = daily ? CATEGORY_META[daily.category] || { name: daily.category, color: 'var(--cyan)' } : null
  const dailyReason = daily ? matchReasonShort(daily, quiz.answers) : null

  // One list, one card language. `starter` marks the persona-chosen three,
  // which have no slug-backed removal because they are derived, not stored.
  const allStackTools = [
    ...persona.stack.map((t) => ({ ...t, starter: true })),
    ...addedTools,
  ]
  const untouchedCount = allStackTools.filter((t) => !progress[t.name]).length

  // Persona → arcade level nametag (mirrors QuizResult)
  const experienceLevels = {
    beginner: 'COSMIC ROOKIE',
    dabbler: 'STAR CADET',
    regular: 'GALAXY EXPLORER',
    builder: 'STAR CAPTAIN',
    teacher: 'COSMIC LEGEND',
  }
  const level = experienceLevels[quiz.answers?.experience] || 'STAR CADET'

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-6 lg:py-10 xl:max-w-6xl">
      <motion.div {...cardIn(0)} className="relative">
        <p className="font-display text-xs uppercase tracking-[0.2em] font-black capitalize" style={{ color: 'var(--lime)' }}>
          ▸ {greeting}
        </p>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="level-badge inline-flex items-center gap-2 px-3 py-1.5">
              <span className="text-sm">⭐</span>
              <span className="font-display text-xs font-black tracking-wider">{level}</span>
            </div>
            <h1 className="arcade-heading mt-4 text-4xl sm:text-5xl">{persona.name.toUpperCase()}</h1>
            <p className="mt-3 font-display text-sm font-bold italic text-white">{persona.tagline}</p>
          </div>
          <button
            onClick={copyShareLink}
            className="nb-btn dark min-h-11 shrink-0 px-4 py-2 text-xs"
          >
            {copied ? '✓ Copied' : '🔗 Share'}
          </button>
        </div>

        {/* Day streak — 7 dots M T W T F S S */}
        <div className="mt-6 sticker p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-black uppercase tracking-widest text-white">
              🔥 {streak}-day streak
            </h2>
            <span className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--lime)' }}>
              keep it lit
            </span>
          </div>
          <div className="flex justify-between gap-1">
            {dots.map((d) => (
              <div
                key={d.key}
                className={`day-dot ${d.isToday ? 'today' : d.visited ? 'done' : ''} ${d.isFuture ? 'opacity-40' : ''}`}
                title={d.isFuture ? 'Not here yet' : d.visited ? `Opened Toolnaut on ${d.key}` : `No visit on ${d.key}`}
              >
                {d.letter}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {dots.filter((d) => d.visited).length} of 7 days this week
          </p>
        </div>
      </motion.div>

      {/* Skills graph — coverage across the 6 galaxy domains */}
      <motion.div {...cardIn(0.5)} className="mt-6">
        <SkillGraph tools={[...persona.stack, ...addedTools]} progress={progress} />
      </motion.div>

      {/* THE STACK ITSELF.
          Moved above "today's drop" deliberately. The page reads
          who am I -> what am I good at -> WHAT DO I USE -> what next, and the
          tools are the answer to the question the product exists to answer.
          They used to sit fourth, under a decorative daily pick.

          Starter picks and self-added tools are one grid now. They were two
          sections in two different card languages (sticker vs glass), which
          read as two unrelated features rather than one stack. */}
      <section className="relative mt-10">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h2 className="tape-label text-xs">⚡ your kit</h2>
          <span className="font-display text-xs font-bold uppercase tracking-widest text-slate-500">
            {allStackTools.length} tool{allStackTools.length === 1 ? '' : 's'} locked in
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allStackTools.map((tool, i) => {
            const statusIdx = progress[tool.name] || 0
            const stickerColor = i % 3 === 0 ? '' : i % 3 === 1 ? 'pink' : 'cyan'
            return (
              <motion.article key={tool.name} {...cardIn(2 + Math.min(i, 6))} className={`sticker ${stickerColor} relative flex flex-col p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="arcade-heading lime compact text-base sm:text-lg">
                      {tool.slug ? (
                        <Link to={`/app/tools/${tool.slug}`} className="after:absolute after:inset-0 after:content-['']">
                          {tool.name.toUpperCase()}
                        </Link>
                      ) : tool.name.toUpperCase()}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                  </div>
                  <div className="shrink-0 text-center">
                    <ProgressRing value={statusIdx / (STATUSES.length - 1)} />
                  </div>
                </div>
                <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => cycle(tool.name)}
                    aria-label={`${tool.name} progress: ${STATUSES[statusIdx]}. Change`}
                    className="nb-btn dark min-h-11 px-4 py-2 text-xs"
                  >
                    {STATUSES[statusIdx]}
                  </button>
                  {tool.starter ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">From your persona</span>
                  ) : (
                    <button
                      onClick={() => setAddedSlugs(removeFromStack(tool.slug))}
                      className="press min-h-11 px-2 font-display text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[var(--hot-pink)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </motion.article>
            )
          })}
        </div>
      </section>

      {/* Today's drop — one unexplored, high-scoring pick per day */}
      {daily && (
        <motion.section
          {...cardIn(1)}
          className="sticker pink relative mt-10 overflow-hidden p-5"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-30 blur-3xl"
            style={{ background: dailyMeta.color }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="tape-label text-xs" style={{ transform: 'rotate(-4deg)' }}>
              ✦ today's drop
            </span>
            {/* Band, not a percentage — see fitBand in matchScore.js. */}
            <span className="font-display text-sm font-black uppercase tracking-wide" style={{ color: 'var(--lime)', textShadow: '2px 2px 0 #000' }}>
              {fitBand(daily.score)?.label || ''}
            </span>
          </div>
          <div className="mt-5">
            <h2 className="arcade-heading lime text-2xl">{daily.name.toUpperCase()}</h2>
            {dailyReason && (
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--lime)' }}>
                ◆ {dailyReason} · not in your stack yet
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{daily.blurb}</p>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => { haptic.select(); setAddedSlugs(addToStack(daily.slug)) }}
              className="nb-btn min-h-11 flex-1 py-3 text-sm"
            >
              ⚡ grab it
            </button>
            <Link
              to={`/app/tools/${daily.slug}`}
              className="nb-btn dark min-h-11 px-5 py-3 text-sm"
            >
              peek
            </Link>
          </div>
        </motion.section>
      )}

      {/* Next up — the one place that says what to do after this screen */}
      <section className="sticker cyan mt-8 p-5">
        <h2 className="arcade-heading lime compact text-lg">◆ NEXT UP</h2>
        <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
          {addedTools.length === 0 && (
            <li>
              <Link to="/app/discover" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
                Add a tool in FIND
              </Link>{' '}
              — all {TOOLS.length} are scored against your persona.
            </li>
          )}
          {nextLearningStep ? (
            <li>
              <Link to="/app/learning" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
                Continue week {nextLearningStep.week}
              </Link>{' '}
              — {nextLearningStep.title}.
            </li>
          ) : (
            <li>
              <Link to="/app/learning" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
                Start your 4-week path
              </Link>{' '}
              — charted from the stack above.
            </li>
          )}
          {untouchedCount > 0 && (
            <li>
              Mark progress on {untouchedCount} tool{untouchedCount === 1 ? '' : 's'} you have not
              opened yet — it moves your skills graph.
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
