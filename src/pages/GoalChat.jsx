import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CHAT_QUESTIONS, GREETING, acknowledge, matchFreeText, saveNote } from '../utils/goalChat'
import { loadQuiz, saveAnswer, completeQuiz } from '../state/quizStore'
import { useAnalytics } from '../hooks/useAnalytics'
import { EVENTS } from '../utils/analyticsEvents'
import { haptic } from '../utils/haptics'
import { BrandLogo } from '../components/ui/Mascot'

// Conversational intake. Replaces the one-question-per-screen quiz with a chat:
// the same nine answers, asked by something that talks back.
//
// Why a chat rather than a form: a form can only accept the five options it
// planned for. Someone switching from teaching into data analysis is not any of
// them, and picking the nearest chip throws the interesting part away. Here they
// can just say it — free text is matched to the closest key so scoring still
// works, and the raw sentence is kept alongside it.
//
// The nine answers are written through the SAME quizStore the old quiz used, so
// personaGenerator, roadmapGenerator and /quiz/result are untouched by this.

const TYPING_MS = 620

export default function GoalChat() {
  const navigate = useNavigate()
  const track = useAnalytics()

  const existing = useMemo(() => loadQuiz().answers, [])
  // Resume where they stopped: the first question with no answer yet.
  const startIndex = useMemo(() => {
    const i = CHAT_QUESTIONS.findIndex((q) => !(q.id in existing))
    return i === -1 ? CHAT_QUESTIONS.length : i
  }, [existing])

  const [index, setIndex] = useState(startIndex)
  const [messages, setMessages] = useState(() => {
    const out = [{ from: 'bot', text: GREETING }]
    // Replay prior answers so a returning visitor sees their own conversation
    // rather than an empty screen that has mysteriously skipped ahead.
    CHAT_QUESTIONS.slice(0, startIndex).forEach((q) => {
      const key = existing[q.id]
      const chosen = q.options.find((o) => o.key === key)
      out.push({ from: 'bot', text: q.ask })
      out.push({ from: 'user', text: chosen?.label ?? String(key) })
    })
    return out
  })
  const [typing, setTyping] = useState(true)
  const [draft, setDraft] = useState('')
  const [unmatched, setUnmatched] = useState(false)

  const done = index >= CHAT_QUESTIONS.length
  const question = done ? null : CHAT_QUESTIONS[index]

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const after = (ms, fn) => { timers.current.push(setTimeout(fn, ms)) }

  useEffect(() => {
    track(EVENTS.QUIZ_START, { resumed: startIndex > 0, surface: 'goal_chat' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ask the current question after a short beat, so it reads as a reply rather
  // than a wall of text appearing at once.
  useEffect(() => {
    if (done) return
    setTyping(true)
    after(TYPING_MS, () => {
      setTyping(false)
      setMessages((m) => (m.some((x) => x.text === question.ask) ? m : [...m, { from: 'bot', text: question.ask, hint: question.hint }]))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, done])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function answer(optionKey, spokenText) {
    if (done || typing) return
    haptic.tap()
    const q = CHAT_QUESTIONS[index]
    const chosen = q.options.find((o) => o.key === optionKey)

    setUnmatched(false)
    setMessages((m) => [...m, { from: 'user', text: spokenText || chosen?.label || optionKey }])
    saveAnswer(q.id, optionKey)
    if (spokenText) saveNote(q.id, spokenText)

    const ack = acknowledge(q.id, optionKey)
    const isLast = index === CHAT_QUESTIONS.length - 1

    setTyping(true)
    after(TYPING_MS, () => {
      setTyping(false)
      if (ack) setMessages((m) => [...m, { from: 'bot', text: ack }])

      if (isLast) {
        after(500, () => {
          setMessages((m) => [...m, { from: 'bot', text: "That's everything. Charting your stack now…" }])
          completeQuiz()
          track(EVENTS.QUIZ_COMPLETE, { ...loadQuiz().answers, surface: 'goal_chat' })
          haptic.success()
          after(900, () => navigate('/quiz/result'))
        })
        setIndex(CHAT_QUESTIONS.length)
      } else {
        setIndex((i) => i + 1)
      }
    })
  }

  function submitDraft(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || done || typing) return

    const key = matchFreeText(question.id, text)
    setDraft('')

    if (key) {
      answer(key, text)
      return
    }

    // Nothing matched. Say so and let them pick, rather than silently filing
    // them under whichever option happened to score highest.
    setMessages((m) => [...m, { from: 'user', text }])
    saveNote(question.id, text)
    setUnmatched(true)
    setTyping(true)
    after(TYPING_MS, () => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        { from: 'bot', text: "I've noted that. I couldn't map it to one of these on my own though — which is closest?" },
      ])
    })
  }

  return (
    <div className="flex min-h-screen flex-col px-4 pb-4 pt-5 sm:px-6">
      <header className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-between pb-4">
        <BrandLogo size={34} textClass="text-base" />
        <button
          onClick={() => navigate('/')}
          aria-label="Leave and go back to the home page"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-3xl border-[3px] border-black bg-[#12121c]/85" style={{ boxShadow: '6px 6px 0 #000' }}>
        {/* progress — chunky lime bars, same language as the rest of the app */}
        <div className="flex shrink-0 gap-1.5 border-b-[3px] border-black bg-[#0c0c14] px-4 py-3" aria-hidden="true">
          {CHAT_QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: i < index ? 'var(--lime)' : i === index ? 'var(--hot-pink)' : 'rgba(255,255,255,0.09)',
              }}
            />
          ))}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-5"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    m.from === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-md border-[3px] border-black px-4 py-2.5 text-sm font-bold text-black'
                      : 'max-w-[88%] rounded-2xl rounded-bl-md border-2 border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm leading-relaxed text-slate-200'
                  }
                  style={m.from === 'user' ? { background: 'var(--lime)', boxShadow: '3px 3px 0 #000' } : undefined}
                >
                  {m.text}
                  {m.hint && <span className="mt-1.5 block text-xs text-slate-400">{m.hint}</span>}
                </div>
              </motion.div>
            ))}

            <AnimatePresence>
              {typing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-1.5 rounded-2xl rounded-bl-md border-2 border-white/10 bg-white/[0.05] px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-slate-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* option chips for the current question */}
        {!done && !typing && question && (
          <div className="shrink-0 border-t-[3px] border-black bg-[#0c0c14] px-4 py-3">
            {unmatched && (
              <p className="mb-2 font-display text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--hot-pink)' }}>
                ▸ pick the closest one
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => answer(opt.key)}
                  className="cursor-pointer rounded-full border-2 border-black bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-[var(--lime)] hover:text-black"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submitDraft} className="shrink-0 border-t-2 border-white/10 bg-[#0c0c14] px-4 py-3">
          <label htmlFor="goal-reply" className="sr-only">Your answer</label>
          <div className="flex items-center gap-2">
            <input
              id="goal-reply"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={done}
              autoComplete="off"
              placeholder={done ? 'Charting your stack…' : 'Or just tell me in your own words…'}
              className="min-h-[44px] w-full rounded-full border-2 border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-slate-500 focus:border-[var(--lime)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={done || !draft.trim()}
              aria-label="Send answer"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-black text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
              style={{ background: 'var(--lime)', boxShadow: '2px 2px 0 #000' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-slate-500">
        No account needed. Your answers stay in this browser.
      </p>
    </div>
  )
}
