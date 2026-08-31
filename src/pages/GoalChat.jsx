import { useEffect, useMemo, useRef, useState } from 'react'
import useSmoothScroll from '../hooks/useSmoothScroll'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CHAT_QUESTIONS, GREETING, acknowledge, matchFreeText, saveNote, askServer } from '../utils/goalChat'
import Mascot, { BrandLogo, LOGO } from '../components/ui/Mascot'
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
  // The first question is HELD BACK. A fresh visitor sees only Naut's
  // one-line hello and a pretyped "Hi" in the input — the conversation
  // starts when THEY send it (or tap a chip, which answers Q1 directly).
  // A returning visitor with answers resumes exactly as before.
  const [started, setStarted] = useState(startIndex > 0)
  const [typing, setTyping] = useState(startIndex > 0)
  const [draft, setDraft] = useState(startIndex > 0 ? '' : 'Hi')
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
    if (done || !started) return
    setTyping(true)
    after(TYPING_MS, () => {
      setTyping(false)
      setMessages((m) => (m.some((x) => x.text === question.ask) ? m : [...m, { from: 'bot', text: question.ask, hint: question.hint }]))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, done, started])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function answer(optionKey, spokenText, botReply) {
    if (done || typing) return
    if (!started) setStarted(true)
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

    // The opener. Whatever they send first — the pretyped Hi or their own
    // words — echoes into the thread and wakes Naut's first question; it is
    // a greeting, not an answer, so it never goes near the classifier.
    if (!started) {
      setDraft('')
      setMessages((m) => [...m, { from: 'user', text }])
      setStarted(true)
      return
    }

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
      {/* Persistent — the user: "after conversation also, that all should
          be there. It will be scroll just." Only the thread scrolls. */}
      <div className="mx-auto flex w-full max-w-4xl shrink-0 flex-col items-center pb-5 text-center">
          {/* The mark leads, centred. It was pinned top-left by the shell,
              which is where a logo goes on a page you browse — but this is a
              single-purpose form with nothing else on screen, so the corner
              is the one place the eye never starts. The shell hides its own
              copy on this route so there is still only ever one. */}
          <Link to="/" aria-label="Toolnaut home" className="mb-6 inline-block">
            <BrandLogo size={92} textClass="text-4xl sm:text-5xl" />
          </Link>

        </div>


      {/* min-h-0 on both this and the transcript below. A flex item defaults to
          min-height:auto, which refuses to shrink below its content — so even
          inside a fixed-height parent the transcript would push the card taller
          than the frame and overflow-y-auto would still never fire. */}
      {/* Quieter than the rest of the app on purpose. The heavy black slab and
          6px offset shadow shout, which is right on the landing page and wrong
          around a form someone has to concentrate on. One hairline rule. */}
      {/* The progress bar is gone. Nine segments of chrome above a chat that
          already says "nine questions" in its first line told the reader
          nothing they had not just read, and it sat between the headline and
          the conversation — the one place nothing should. */}
      <div
        className="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl"
        style={{ background: '#0c0c13', border: '1px solid #23232f' }}
      >
        {/* The badge and headline live INSIDE the box, as its head — the
            user's sketch framed the pitch and the conversation as one object.
            They mount only atStart and step aside with the rest of the
            landing chrome once the first answer arrives. */}
<div className={`flex shrink-0 flex-col items-center px-5 text-center ${atStart ? 'pb-2 pt-7' : 'pb-1 pt-4'}`}>
              {/* The badge answers "what is this going to cost me" before the
                  headline asks for anything — nine questions, a minute, no
                  account — which is the objection someone raises at a form. */}
              <span
                className={`mx-auto inline-flex items-center gap-[7px] rounded-full font-medium leading-none ${atStart ? 'px-[13px] py-[7px] text-[11px]' : 'px-2.5 py-1 text-[9px]'}`}
                style={{
                  background: 'rgba(163,255,46,.10)',
                  border: '1px solid rgba(163,255,46,.32)',
                  color: 'var(--lime)',
                }}
              >
                <span aria-hidden="true">●</span>
                Nine questions · about a minute · no account
              </span>

              {/* Sized to the reference: one heavy statement, one grey payoff,
                  each a single stroke. The old 37px/700 with a wrapping second
                  line read as body copy standing up straight — this is the page's
                  entire pitch and it carries the weight of one. */}
              <h1 className={`max-w-3xl font-display font-black tracking-[-0.03em] text-white ${
            atStart
              ? 'mt-5 text-[clamp(1.8rem,4.6vw,2.7rem)] leading-[1.1]'
              : 'mt-2 text-xl leading-tight'
          }`}>
                Tell Naut what you do.
                <span className="block text-slate-500">
                  It builds it, plans it, grows it.
                </span>
              </h1>
          </div>


        {/* The conversation zone — thread, chips, input — sits on its own
            darker surface, framed off from the card head. The user's pink
            box drew exactly this: where the talking happens is one object,
            distinct from where the pitch stands. */}
        <div
          className="mx-2.5 mb-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl"
          style={{ background: '#07070d', border: '1px solid #1c1c28' }}
        >
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {/* mt-auto pins the thread to the input like every chat — but at the
              start, with the headline living in the box above two messages, it
              opened a hole between pitch and conversation. Until the first
              answer the thread hangs from the heading instead. */}
          <div className={`${atStart ? '' : 'mt-auto'} flex flex-col gap-3`}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={m.from === 'user' ? 'flex justify-end' : 'flex items-end gap-2'}
              >
                {m.from !== 'user' && (
                  <span className="shrink-0 pb-0.5" aria-hidden="true">
                    <Mascot mood="happy" size={26} />
                  </span>
                )}
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
                  className="flex items-end gap-2"
                >
                  <span className="shrink-0 pb-0.5" aria-hidden="true">
                    <Mascot mood="curious" size={26} />
                  </span>
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
        {/* Blank until the Hi: chips answer question one, and question one
            has not been asked yet — six category buttons under a greeting
            looked like a menu for a question nobody heard. */}
        {started && !done && !typing && question && (
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
      </div>

      <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-slate-500">
        No account needed. Your answers stay in this browser.
      </p>
    </div>
  )
}
