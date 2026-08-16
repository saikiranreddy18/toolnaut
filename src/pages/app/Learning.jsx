import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { generateRoadmap } from '../../utils/roadmapGenerator'
import { CATEGORY_META } from '../../utils/toolsCatalog'
import { track, EVENTS } from '../../utils/analyticsEvents'
import {
  loadRoadmapProgress,
  toggleStep,
  isStepDone,
  allStepsDone,
  milestoneComplete,
  setQuizPassed,
  isQuizPassed,
} from '../../state/roadmapStore'
import { haptic } from '../../utils/haptics'

function CopyPrompt({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    haptic.tap()
    try {
      navigator.clipboard?.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard blocked */ }
  }
  return (
    <div className="mt-3 rounded-lg border-2 border-black bg-black/40 p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-[10px] font-black uppercase tracking-widest text-slate-400">
          Prompt to try
        </span>
        <button onClick={copy} className="press font-display text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--lime)' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{text}</p>
    </div>
  )
}

function LessonStep({ done, step, lesson, onToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/5 py-1 last:border-0">
      <div className="flex w-full items-start gap-3">
        <button onClick={onToggle} className="press flex flex-1 items-start gap-3 py-2 text-left" aria-pressed={done}>
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{
              border: '2px solid #000',
              background: done ? 'var(--lime)' : 'rgba(255,255,255,0.05)',
              boxShadow: done ? '0 0 8px var(--lime)' : 'none',
              color: '#000',
            }}
            aria-hidden="true"
          >
            {done && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
          <span className={`text-sm leading-relaxed font-medium ${done ? 'text-slate-500 line-through' : 'text-white'}`}>
            {step}
          </span>
        </button>
        {lesson && (
          <button
            onClick={() => { haptic.tap(); setOpen((v) => !v) }}
            className="press mt-1.5 shrink-0 font-display text-[10px] font-black uppercase tracking-widest"
            style={{ color: open ? 'var(--hot-pink)' : '#6b6690' }}
            aria-expanded={open}
          >
            {open ? 'Hide ▴' : 'How ▾'}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && lesson && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-8 mb-2 rounded-lg border-l-2 pl-3" style={{ borderColor: 'rgba(163,255,46,0.4)' }}>
              <p className="text-xs leading-relaxed text-slate-300">{lesson.body}</p>
              {lesson.action && (
                <p className="mt-2 text-xs leading-relaxed font-semibold" style={{ color: 'var(--lime)' }}>
                  ▸ {lesson.action}
                </p>
              )}
              {lesson.prompt && <CopyPrompt text={lesson.prompt} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Checkpoint({ quiz, passed, onPass }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (passed) {
    return (
      <div className="mt-3 rounded-lg border-2 border-black p-3" style={{ background: 'rgba(163,255,46,0.1)' }}>
        <p className="font-display text-xs font-black uppercase tracking-widest" style={{ color: 'var(--lime)' }}>
          ✓ Checkpoint cleared
        </p>
      </div>
    )
  }

  const allAnswered = quiz.every((_, i) => answers[i] != null)
  const correctCount = quiz.filter((q, i) => answers[i] === q.answer).length
  const passedNow = submitted && correctCount === quiz.length

  function submit() {
    haptic.tap()
    setSubmitted(true)
    if (quiz.every((q, i) => answers[i] === q.answer)) {
      haptic.success()
      onPass()
    }
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-black p-4" style={{ background: 'rgba(255,46,163,0.06)' }}>
      <p className="font-display text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hot-pink)' }}>
        ▸ Checkpoint · pass to clear the week
      </p>
      <div className="mt-3 space-y-4">
        {quiz.map((q, qi) => {
          const chosen = answers[qi]
          const wrong = submitted && chosen != null && chosen !== q.answer
          return (
            <div key={qi}>
              <p className="text-sm font-semibold leading-snug text-white">{qi + 1}. {q.q}</p>
              <div className="mt-2 space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi
                  const showCorrect = submitted && oi === q.answer
                  const showWrong = submitted && isChosen && oi !== q.answer
                  return (
                    <button
                      key={oi}
                      onClick={() => { if (!submitted || wrong) { haptic.tap(); setAnswers((a) => ({ ...a, [qi]: oi })); if (submitted) setSubmitted(false) } }}
                      className="press flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-xs font-medium"
                      style={{
                        borderColor: showCorrect ? 'var(--lime)' : showWrong ? 'var(--hot-pink)' : isChosen ? '#fff' : '#2a2740',
                        background: showCorrect ? 'rgba(163,255,46,0.15)' : showWrong ? 'rgba(255,46,163,0.12)' : isChosen ? 'rgba(255,255,255,0.06)' : 'transparent',
                        color: showCorrect ? 'var(--lime)' : '#fff',
                      }}
                    >
                      <span className="shrink-0 font-black">{showCorrect ? '✓' : showWrong ? '✕' : String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {submitted && !passedNow && (
        <p className="mt-3 text-xs font-bold" style={{ color: 'var(--hot-pink)' }}>
          {correctCount}/{quiz.length} correct — fix the pink ones and try again.
        </p>
      )}
      <button
        onClick={submit}
        disabled={!allAnswered}
        className="nb-btn mt-4 w-full px-4 py-3 text-sm disabled:opacity-40"
      >
        {submitted && !passedNow ? 'RETRY CHECK' : 'CHECK ANSWERS'}
      </button>
    </div>
  )
}

export default function Learning() {
  const roadmap = useMemo(generateRoadmap, [])
  const [progress, setProgress] = useState(loadRoadmapProgress)
  const [shared, setShared] = useState(false)
  const firedComplete = useRef(false)

  const milestones = roadmap?.milestones || []
  const totalSteps = milestones.reduce((n, m) => n + m.steps.length, 0)
  const doneSteps = Object.keys(progress).filter((k) =>
    milestones.some((m) => m.steps.some((_, i) => `${m.id}:${i}` === k)),
  ).length
  const allCleared = milestones.length > 0 && milestones.every((m) => milestoneComplete(progress, m))

  // Fire once when the full roadmap first clears, not on every render.
  useEffect(() => {
    if (allCleared && !firedComplete.current) {
      firedComplete.current = true
      track(EVENTS.ROADMAP_COMPLETE, { milestoneCount: milestones.length })
    }
  }, [allCleared, milestones.length])

  if (!roadmap) {
    return (
      <div className="relative z-10 flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
        <h1 className="arcade-heading text-2xl">ROADMAP NEEDS A PERSONA</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
          Take the 60-second quiz and we'll chart a 4-week path through the exact
          tools that fit how you work.
        </p>
        <Link to="/quiz" className="nb-btn mt-8 px-8 py-4 text-base">
          ⚡ FIND MY PATH
        </Link>
      </div>
    )
  }

  const pct = Math.round((doneSteps / totalSteps) * 100)

  const firstIncomplete = milestones.findIndex((m) => !milestoneComplete(progress, m))
  const unlockedThrough = firstIncomplete === -1 ? milestones.length : firstIncomplete

  function onToggle(m, i) {
    haptic.tap()
    const next = toggleStep(m.id, i)
    setProgress({ ...next })
    if (isStepDone(next, m.id, i)) {
      track(EVENTS.ROADMAP_STEP_COMPLETE, { milestoneId: m.id, week: m.week, stepIndex: i })
    }
    if (milestoneComplete(next, m)) haptic.success()
  }

  function onQuizPass(m) {
    const next = setQuizPassed(m.id)
    setProgress({ ...next })
    track(EVENTS.ROADMAP_CHECKPOINT_PASS, { milestoneId: m.id, week: m.week })
  }

  async function share() {
    haptic.success()
    const text = `I just cleared my 4-week AI-tool orbit on Toolnaut 🏆 — mastered my starter stack.`
    try {
      if (navigator.share) await navigator.share({ title: 'Orbit Cleared', text, url: window.location.origin })
      else { await navigator.clipboard?.writeText(`${text} ${window.location.origin}`); setShared(true); setTimeout(() => setShared(false), 2000) }
    } catch { /* user dismissed */ }
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-5 py-6 lg:py-10">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ LEARN</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">YOUR 4-WEEK<br/>ORBIT</h1>

        {/* overall progress — chunky arcade bar */}
        <div className="sticker mt-6 p-4 backdrop-blur-sm bg-black/20" style={{ transform: 'rotate(0)' }}>
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-black uppercase tracking-widest text-white">
              {doneSteps} OF {totalSteps} STEPS
            </span>
            <span className="font-display text-sm font-black" style={{ color: 'var(--lime)' }}>
              {pct}%
            </span>
          </div>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full"
            style={{ border: '2px solid #000', background: 'rgba(255,255,255,0.06)', boxShadow: '2px 2px 0 #000' }}
          >
            <motion.div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, var(--lime), var(--hot-pink))' }}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* timeline */}
        <div className="relative mt-8 pl-8">
          <div className="absolute bottom-2 left-[11px] top-2 w-0.5" style={{ background: '#2a2740' }} aria-hidden="true" />
          {milestones.map((m, mi) => {
            const locked = mi > unlockedThrough
            const complete = milestoneComplete(progress, m)
            const meta = m.tool ? CATEGORY_META[m.tool.category] : null
            const statusLabel = complete ? 'CLEARED' : locked ? 'LOCKED' : 'IN PLAY'
            const statusColor = complete ? 'var(--lime)' : locked ? '#6b6690' : 'var(--hot-pink)'
            const stepsDone = allStepsDone(progress, m)
            const quizPassed = isQuizPassed(progress, m.id)

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: mi * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-6"
              >
                {/* node with glow effect */}
                <span
                  className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{
                    border: '2px solid #000',
                    background: complete ? 'var(--lime)' : locked ? '#0a0a0f' : 'var(--hot-pink)',
                    boxShadow: complete
                      ? '0 0 10px var(--lime), 2px 2px 0 #000'
                      : locked
                        ? '2px 2px 0 #2a2740'
                        : '0 0 10px var(--hot-pink), 2px 2px 0 #000',
                    color: '#000',
                  }}
                  aria-hidden="true"
                >
                  {complete ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : locked ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--lime)' }} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  ) : null}
                </span>

                {/* milestone card with backdrop blur */}
                <div className={`sticker p-5 backdrop-blur-sm bg-black/20 ${locked ? 'opacity-50' : ''}`} style={{ transform: 'rotate(0)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-xs font-black uppercase tracking-widest" style={{ color: statusColor }}>
                      WEEK {m.week} · {statusLabel}
                    </span>
                    {meta && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                        {meta.name}
                      </span>
                    )}
                  </div>
                  <h2 className="arcade-heading lime mt-2 text-lg">{m.title.toUpperCase()}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{m.focus}</p>

                  {locked ? (
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      🔒 Finish week {m.week - 1} to unlock.
                    </p>
                  ) : (
                    <div className="mt-3 border-t-2 pt-3" style={{ borderColor: 'rgba(163,255,46,0.15)' }}>
                      {m.styleTip && (
                        <p className="mb-3 text-xs italic leading-relaxed text-slate-400">
                          💡 {m.styleTip}
                        </p>
                      )}
                      {m.steps.map((step, i) => (
                        <LessonStep
                          key={i}
                          done={isStepDone(progress, m.id, i)}
                          step={step}
                          lesson={m.lessons?.[i]}
                          onToggle={() => onToggle(m, i)}
                        />
                      ))}

                      {m.quiz && m.quiz.length > 0 && (
                        stepsDone ? (
                          <Checkpoint quiz={m.quiz} passed={quizPassed} onPass={() => onQuizPass(m)} />
                        ) : (
                          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            ▸ Check off the steps to unlock the checkpoint.
                          </p>
                        )
                      )}

                      {m.tool && (
                        <Link
                          to={`/app/tools/${m.tool.slug}`}
                          className="press mt-3 inline-block font-display text-xs font-black uppercase tracking-wider underline underline-offset-4"
                          style={{ color: 'var(--lime)' }}
                        >
                          OPEN {m.tool.name.toUpperCase()} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {allCleared && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sticker mt-2 p-5 text-center backdrop-blur-sm bg-black/20"
            style={{ transform: 'rotate(-1deg)' }}
          >
            <p className="arcade-heading lime text-lg">🏆 ORBIT CLEARED</p>
            <p className="mt-2 text-sm text-slate-300">
              You've mastered your starter stack — steps done and every checkpoint passed.
            </p>
            <button onClick={share} className="nb-btn mt-4 px-6 py-3 text-sm">
              {shared ? '✓ COPIED — GO SHARE IT' : '🎓 SHARE MY BADGE'}
            </button>
            <p className="mt-4 text-sm text-slate-300">
              Add more in{' '}
              <Link to="/app/discover" className="font-black underline underline-offset-2" style={{ color: 'var(--lime)' }}>
                FIND
              </Link>{' '}
              to chart a new path.
            </p>
          </motion.div>
        )}
    </div>
  )
}
