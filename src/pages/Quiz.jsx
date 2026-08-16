import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QUESTIONS } from '../utils/quizLogic'
import { loadQuiz, saveAnswer, completeQuiz } from '../state/quizStore'
import { useAnalytics } from '../hooks/useAnalytics'
import { EVENTS } from '../utils/analyticsEvents'
import { haptic } from '../utils/haptics'

const TOTAL = QUESTIONS.length

// Routed onboarding quiz. The current step lives in the URL (?step=n) so
// refresh and the back button restore position; answers persist to
// localStorage after every tap (guests have no server yet).
export default function Quiz() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const track = useAnalytics()

  const [answers, setAnswers] = useState(() => loadQuiz().answers)
  const [burst, setBurst] = useState(false)
  const startedRef = useRef(false)

  const rawStep = parseInt(searchParams.get('step') || '1', 10)
  const step = Number.isNaN(rawStep) ? 1 : Math.min(Math.max(rawStep, 1), TOTAL)

  // Furthest step the user may visit: first unanswered question (+1 for 1-based).
  const firstUnanswered = QUESTIONS.findIndex((q) => !(q.id in answers))
  const allowedMax = firstUnanswered === -1 ? TOTAL : firstUnanswered + 1

  useEffect(() => {
    if (step > allowedMax) {
      setSearchParams({ step: String(allowedMax) }, { replace: true })
    }
  }, [step, allowedMax, setSearchParams])

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      track(EVENTS.QUIZ_START, { resumed: Object.keys(answers).length > 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const index = Math.min(step, allowedMax) - 1
  const question = QUESTIONS[index]

  function answer(q, opt) {
    if (burst) return
    haptic.tap()
    track(EVENTS.QUIZ_ANSWER, { question: q.id, answer: opt.key })
    const next = saveAnswer(q.id, opt.key)
    setAnswers(next.answers)
    setBurst(true)
    setTimeout(() => {
      setBurst(false)
      if (index + 1 >= TOTAL) {
        haptic.success()
        completeQuiz()
        track(EVENTS.QUIZ_COMPLETE, next.answers)
        navigate('/quiz/result')
      } else {
        setSearchParams({ step: String(index + 2) })
      }
    }, 450)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <button
        onClick={() => navigate('/')}
        aria-label="Exit quiz"
        className="absolute right-6 top-6 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* insight spark burst between questions */}
      <AnimatePresence>
        {burst && (
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-exus-cyan"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i / 14) * Math.PI * 2) * 130,
                  y: Math.sin((i / 14) * Math.PI * 2) * 130,
                  opacity: 0,
                }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full max-w-xl py-24">
        {/* Chunky lime progress bar */}
        <div className="mb-8 flex gap-2" aria-hidden="true">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className="h-2 flex-1 rounded-full border-2 border-black"
              style={{
                background: i < index ? 'var(--lime)' : i === index ? 'var(--hot-pink)' : 'rgba(255,255,255,0.08)',
                boxShadow: i <= index ? '2px 2px 0 #000' : 'none',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -26, scale: 0.98 }}
            transition={{ duration: 0.35 }}
          >
            <p className="mb-3 font-display text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'var(--lime)' }}>
              ▸ Q{index + 1} of {TOTAL}
            </p>
            <h1 className="arcade-heading mb-10 text-3xl md:text-4xl">
              {question.text.toUpperCase()}
            </h1>
            <div className="flex flex-col gap-4">
              {question.options.map((opt, i) => {
                const selected = answers[question.id] === opt.key
                const stickerColor = i % 3 === 0 ? '' : i % 3 === 1 ? 'pink' : 'cyan'
                return (
                  <motion.button
                    key={opt.key}
                    onClick={() => answer(question, opt)}
                    aria-pressed={selected}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0, rotate: i % 2 === 0 ? -0.8 : 0.8 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: 1.03, rotate: 0 }}
                    whileTap={{ scale: 0.97 }}
                    className={`sticker ${stickerColor} min-h-14 cursor-pointer px-5 py-4 text-left font-display text-base font-black uppercase text-white tracking-wide ${selected ? 'ring-4 ring-lime-400' : ''}`}
                  >
                    {opt.label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
