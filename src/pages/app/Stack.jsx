import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loadQuiz } from '../../state/quizStore'
import { generatePersona } from '../../utils/personaGenerator'
import { getTool, TOOLS, CATEGORY_META } from '../../utils/toolsCatalog'
import { matchScore } from '../../utils/matchScore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { haptic } from '../../utils/haptics'

// Deterministic daily pick: same tool all day, a new one tomorrow — so every
// open of the app has something unexplored in it.
function toolOfTheDay(answers, excludeNames, excludeSlugs) {
  const candidates = TOOLS
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

// Per-tool progress, stored locally until the backend owns it.
const PROGRESS_KEY = 'exus_progress_v1'
const STATUSES = ['Not started', 'Exploring', 'Using weekly', 'Mastered']

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {} } catch { return {} }
}

const GREETINGS = {
  night: ['burning the midnight fuel', 'you\'re an owl 🦉', 'nocturnal grind energy'],
  morning: ['rise and shine', 'coffee in hand?', 'morning explorer energy'],
  afternoon: ['mid-day momentum', 'keep cooking', 'afternoon architect'],
  evening: ['golden hour glow', 'evening expedition', 'dusk explorer'],
}

// Streak tracker (days since last reset).
const STREAK_KEY = 'exus_streak_v1'

function loadStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || {} } catch { return {} }
}

// Calendar-day successor check (not a fixed 24h) so DST transitions don't
// desync the streak.
function isNextCalendarDay(prevDateStr, todayStr) {
  const prev = new Date(prevDateStr)
  prev.setDate(prev.getDate() + 1)
  return prev.toDateString() === todayStr
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
  const quiz = loadQuiz()
  const persona = quiz.completed ? generatePersona(quiz.answers) : null
  const [progress, setProgress] = useState(loadProgress)
  const [addedSlugs, setAddedSlugs] = useState(loadStack)

  const hour = new Date().getHours()
  const period = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  // Stable per period — was re-rolling on every re-render before (e.g. every
  // stack edit), making the greeting flicker mid-session.
  const greeting = useMemo(() => {
    const options = GREETINGS[period]
    return options[Math.floor(Math.random() * options.length)]
  }, [period])

  const today = new Date().toDateString()
  const [streak, setStreak] = useState(() => {
    const lastVisit = loadStreak()
    if (lastVisit.date === today) return lastVisit.count || 1
    if (lastVisit.date && isNextCalendarDay(lastVisit.date, today)) return (lastVisit.count || 0) + 1
    return 1
  })

  // Persist the day's streak once per mount instead of on every render.
  // No haptic here: this only fires on the day's first visit, which is a fresh
  // page load with no user activation yet — the browser blocks vibrate() there
  // and logs, so the buzz never actually reached the user.
  useEffect(() => {
    const lastVisit = loadStreak()
    if (lastVisit.date !== today) {
      try { localStorage.setItem(STREAK_KEY, JSON.stringify({ date: today, count: streak })) } catch { /* storage blocked */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tools added from Discover, minus any that duplicate the starter stack.
  const starterNames = new Set((persona?.stack || []).map((t) => t.name))
  const addedTools = addedSlugs
    .map(getTool)
    .filter((t) => t && !starterNames.has(t.name))

  function cycle(toolName) {
    const current = progress[toolName] || 0
    const next = { ...progress, [toolName]: (current + 1) % STATUSES.length }
    setProgress(next)
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
  }

  if (!persona) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Your stack starts with the quiz</h1>
        <p className="mt-3 max-w-md text-sm text-slate-400">
          Sixty seconds, five questions — and this dashboard fills itself with the
          tools that fit how you actually work.
        </p>
        <Link
          to="/quiz"
          className="glow-btn mt-8 rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
        >
          Find my stack
        </Link>
      </div>
    )
  }

  const daily = toolOfTheDay(quiz.answers, starterNames, addedSlugs)
  const dailyMeta = daily ? CATEGORY_META[daily.category] || { name: daily.category, color: 'var(--cyan)' } : null

  // Persona → arcade level nametag (mirrors QuizResult)
  const experienceLevels = {
    beginner: 'COSMIC ROOKIE',
    dabbler: 'STAR CADET',
    regular: 'GALAXY EXPLORER',
    builder: 'STAR CAPTAIN',
    teacher: 'COSMIC LEGEND',
  }
  const level = experienceLevels[quiz.answers?.experience] || 'STAR CADET'

  // 5-day streak dots — Sun→Sat, current day highlighted
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const dowToday = new Date().getDay()

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-6 lg:py-10">
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
        </div>

        {/* Day streak — 7 dots M T W T F S S */}
        <div className="mt-6 sticker p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-xs font-black uppercase tracking-widest text-white">
              🔥 {streak}-day streak
            </span>
            <span className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--lime)' }}>
              keep it lit
            </span>
          </div>
          <div className="flex justify-between gap-1">
            {dayLetters.map((letter, i) => {
              const isDone = i < dowToday
              const isToday = i === dowToday
              return (
                <div key={i} className={`day-dot ${isToday ? 'today' : isDone ? 'done' : ''}`}>
                  {letter}
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Today's drop — sticker card, chunky lime CTA */}
      {daily && (
        <motion.div
          {...cardIn(1)}
          className="sticker pink relative mt-8 overflow-hidden p-5"
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
            <span className="font-display text-lg font-black" style={{ color: 'var(--lime)', textShadow: '2px 2px 0 #000' }}>
              {daily.score}%
            </span>
          </div>
          <div className="mt-5">
            <p className="arcade-heading lime text-2xl">{daily.name.toUpperCase()}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{daily.blurb}</p>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => { haptic.select(); setAddedSlugs(addToStack(daily.slug)) }}
              className="nb-btn flex-1 py-3 text-sm"
            >
              ⚡ grab it
            </button>
            <Link
              to={`/app/tools/${daily.slug}`}
              className="nb-btn dark px-5 py-3 text-sm"
            >
              peek
            </Link>
          </div>
        </motion.div>
      )}

      {/* Starter stack — sticker cards on alternating tilt */}
      <div className="relative mt-10">
        <div className="mb-5 flex items-center gap-3">
          <span className="tape-label text-xs">⚡ your kit</span>
          <span className="font-display text-xs font-bold uppercase tracking-widest text-slate-500">
            {persona.stack.length} tools locked in
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {persona.stack.map((tool, i) => {
            const statusIdx = progress[tool.name] || 0
            const stickerColor = i === 0 ? '' : i === 1 ? 'pink' : 'cyan'
            return (
              <motion.div key={tool.name} {...cardIn(2 + i)} className={`sticker ${stickerColor} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="arcade-heading lime text-base sm:text-lg">{tool.name.toUpperCase()}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                  </div>
                  <ProgressRing value={statusIdx / (STATUSES.length - 1)} />
                </div>
                <button
                  onClick={() => cycle(tool.name)}
                  className="nb-btn dark mt-4 px-4 py-2 text-xs"
                >
                  {STATUSES[statusIdx]}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {addedTools.length > 0 && (
        <>
          <p className="mt-10 font-display text-sm font-semibold text-white">Added from Discover</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addedTools.map((tool) => {
              const statusIdx = progress[tool.name] || 0
              return (
                <div key={tool.slug} className="glass rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/app/tools/${tool.slug}`}
                        className="font-display text-base font-semibold text-white hover:text-cyan-200"
                      >
                        {tool.name}
                      </Link>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{tool.blurb}</p>
                    </div>
                    <ProgressRing value={statusIdx / (STATUSES.length - 1)} />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => cycle(tool.name)}
                      className="cursor-pointer rounded-full border border-white/15 px-3.5 py-1.5 font-display text-xs text-slate-300 transition-colors hover:border-exus-cyan/60 hover:text-white"
                    >
                      {STATUSES[statusIdx]} — tap to update
                    </button>
                    <button
                      onClick={() => setAddedSlugs(removeFromStack(tool.slug))}
                      aria-label={`Remove ${tool.name} from stack`}
                      className="cursor-pointer rounded-full border border-white/10 px-3.5 py-1.5 font-display text-xs text-slate-500 transition-colors hover:border-exus-peach/50 hover:text-exus-peach"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="glass mt-8 rounded-2xl p-5">
        <p className="font-display text-sm font-semibold text-white">Next up</p>
        <p className="mt-1 text-sm text-slate-400">
          {addedTools.length === 0 && (
            <>
              Grow your stack in{' '}
              <Link to="/app/discover" className="text-cyan-300 underline underline-offset-2 hover:text-white">
                Discover
              </Link>
              {' — '}every tool is ranked against your persona.{' '}
            </>
          )}
          Your{' '}
          <Link to="/app/learning" className="text-cyan-300 underline underline-offset-2 hover:text-white">
            4-week learning path
          </Link>{' '}
          is charted from this stack. Suggested plan for your profile:{' '}
          <span className="font-semibold text-exus-cyan">{persona.suggestedPlan}</span>.
        </p>
      </div>
    </div>
  )
}
