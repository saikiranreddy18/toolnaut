import { useEffect, useMemo, useRef, useState } from 'react'
import useSmoothScroll from '../hooks/useSmoothScroll'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CHAT_QUESTIONS, GREETING, acknowledge, matchFreeText, saveNote, askServer } from '../utils/goalChat'
import { loadQuiz, saveAnswer, completeQuiz } from '../state/quizStore'
import { useAnalytics } from '../hooks/useAnalytics'
import { EVENTS } from '../utils/analyticsEvents'
import { markOnboarded } from '../utils/funnel'
import { haptic } from '../utils/haptics'

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

  // True until the first answer. The headline is a landing state, not chrome:
  // on a fixed-height chat box it costs the transcript ~170px, which is worth
  // paying to set expectations and not worth paying once the user is five
  // questions deep and reading.
  const atStart = index === 0 && !messages.some((m) => m.from === 'user')

  const done = index >= CHAT_QUESTIONS.length
  const question = done ? null : CHAT_QUESTIONS[index]

  const scrollRef = useRef(null)
  // The transcript is a fixed box the messages scroll inside, so the window
  // has nothing to smooth — the inner scroller is the one you feel.
  useSmoothScroll(true, scrollRef)
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

  function answer(optionKey, spokenText, botReply) {
    if (done || typing) return
    haptic.tap()
    const q = CHAT_QUESTIONS[index]
    const chosen = q.options.find((o) => o.key === optionKey)

    setUnmatched(false)
    setMessages((m) => [...m, { from: 'user', text: spokenText || chosen?.label || optionKey }])
    saveAnswer(q.id, optionKey)
    if (spokenText) saveNote(q.id, spokenText)

    // A sentence written for THIS person beats the canned one for this option.
    const ack = botReply || acknowledge(q.id, optionKey)
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
          markOnboarded(track)
          haptic.success()
          after(900, () => navigate('/quiz/result'))
        })
        setIndex(CHAT_QUESTIONS.length)
      } else {
        setIndex((i) => i + 1)
      }
    })
  }

  // Same as answer(), minus echoing the user's message — submitDraft shows it
  // before going to the server, so their words land immediately rather than
  // after a network round trip.
  function answerResolved(q, optionKey, botReply) {
    saveAnswer(q.id, optionKey)
    const ack = botReply || acknowledge(q.id, optionKey)
    const isLast = index === CHAT_QUESTIONS.length - 1
    setUnmatched(false)
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

  async function submitDraft(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || done || typing) return

    const q = question
    setDraft('')
    setMessages((m) => [...m, { from: 'user', text }])
    saveNote(q.id, text)
    setTyping(true)

    // The model reads the sentence; keywords are the safety net. The order
    // matters: a confident wrong answer is worse than asking, so anything
    // neither can place ends at the chips rather than at a guess.
    const fromServer = await askServer({
      questionId: q.id,
      question: q.ask,
      options: q.options,
      text,
      answered: loadQuiz().answers,
    })
    const key = fromServer.key || matchFreeText(q.id, text)

    setTyping(false)
    if (key) {
      answerResolved(q, key, fromServer.key ? fromServer.reply : null)
      return
    }

    // Neither the model nor the keywords could place it. Say so and let them
    // pick, rather than filing them under whichever option scored highest.
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
    // h-[100dvh], not min-h-screen. With a MINIMUM height the wrapper is free to
    // grow past the viewport, so `flex-1` on the transcript resolved to its own
    // content height, overflow-y-auto never had anything to clip, and the whole
    // PAGE scrolled instead — 477px past the fold by the fourth answer, with the
    // input pushed off-screen. A chat frame has to be a fixed box the transcript
    // scrolls inside, the way every other chat UI behaves. dvh (not vh) so
    // mobile browser chrome collapsing does not change the box height mid-answer.
    <div className="flex h-[100dvh] flex-col overflow-hidden px-4 pb-4 pt-5 sm:px-6">
      {/* OnboardingShell already renders the wordmark top-left; a second one
          here sat directly on top of it. Only the exit control belongs to this page. */}
      <header className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-end pb-2">
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

      {/* The opening. Direction A: the words carry it — a badge that answers
          "what is this going to cost me", then one headline in two tones. No
          decoration, because a nine-question form is a reading task and
          ornament competes with the question. */}
      {atStart && (
        <div className="mx-auto flex w-full max-w-2xl shrink-0 flex-col pb-5 text-center">
          {/* The badge from direction A. It answers "what is this going to
              cost me" before the headline asks for anything — nine questions,
              a minute, no account — which is the objection someone raises at
              a form, in the place they raise it. The wordmark that used to sit
              here is already top-left in OnboardingShell; two marks stacked
              read as a logo, not an opening. */}
          <span
            className="mx-auto inline-flex items-center gap-[7px] rounded-full px-[13px] py-[7px] text-[11px] font-medium leading-none"
            style={{
              background: 'rgba(163,255,46,.10)',
              border: '1px solid rgba(163,255,46,.32)',
              color: 'var(--lime)',
            }}
          >
            <span aria-hidden="true">●</span>
            Nine questions · about a minute · no account
          </span>

          <h1 className="mt-5 font-display text-[clamp(1.5rem,4.4vw,2.35rem)] font-bold leading-[1.13] tracking-[-0.025em] text-white">
            Tell Naut what you do.
            <span className="block text-slate-500">
              It maps your stack, your gaps, your next four weeks.
            </span>
          </h1>
        </div>
      )}

      {/* min-h-0 on both this and the transcript below. A flex item defaults to
          min-height:auto, which refuses to shrink below its content — so even
          inside a fixed-height parent the transcript would push the card taller
          than the frame and overflow-y-auto would still never fire. */}
      {/* Quieter than the rest of the app on purpose. The heavy black slab and
          6px offset shadow shout, which is right on the landing page and wrong
          around a form someone has to concentrate on. One hairline rule. */}
      <div
        className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col overflow-hidden rounded-2xl"
        style={{ background: '#0c0c13', border: '1px solid #23232f' }}
      >
        {/* progress — chunky lime bars, same language as the rest of the app */}
        <div className="flex shrink-0 gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid #23232f' }} aria-hidden="true">
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
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-5 sm:px-5"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          <div className="mt-auto flex flex-col gap-3">
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
          <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid #23232f' }}>
            {unmatched && (
              <p className="mb-2 font-display text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--hot-pink)' }}>
                ▸ pick the closest one
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt.key}
                  data-testid="goal-chip"
                  onClick={() => answer(opt.key)}
                  className="cursor-pointer rounded-full border border-[#2b2b3a] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[var(--lime)] hover:bg-[var(--lime)] hover:text-black"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submitDraft} className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid #23232f' }}>
          <label htmlFor="goal-reply" className="sr-only">Your answer</label>
          <div className="flex items-center gap-2">
            <input
              id="goal-reply"
              data-testid="goal-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={done}
              autoComplete="off"
              placeholder={done ? 'Charting your stack…' : 'Tell us what you do…'}
              className="min-h-[44px] w-full rounded-xl border border-[#2b2b3a] bg-[#0a0a10] px-4 text-base text-white placeholder:text-slate-500 focus:border-[var(--lime)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={done || !draft.trim()}
              aria-label="Send answer"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
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
