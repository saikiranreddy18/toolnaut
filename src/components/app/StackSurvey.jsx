import { useEffect, useRef, useState } from 'react'
import { read, write } from '../../state/scopedStorage'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// One question, after someone has seen their stack.
//
// WHY: the only "research" on what stops people was a simulated report. This
// asks real users the one question that decides what to build next, at the
// moment it matters — with their recommendations in front of them.
//
// FIXED CHOICES, NO FREE TEXT, ON PURPOSE. Answers go to Google Analytics as an
// event, and the privacy policy promises GA never receives anything a person
// types. A text box would break that promise.
//
// Asked once per account (scopedStorage), shown inline rather than as a popup,
// only once there is a stack to react to, and after a short delay so it never
// greets someone before they have looked at the page. "Not now" also ends it.
// Read the results in GA4 under the survey_answered event, by its answer.

const KEY = 'exus_survey_stack_v1'
const DELAY_MS = 8000

export const QUESTION_ID = 'stack_blocker'
export const OPTIONS = [
  { key: 'where_to_start', label: "I'm not sure which one to start with" },
  { key: 'cost', label: 'They cost too much' },
  { key: 'no_time', label: "I don't have time to learn them" },
  { key: 'not_a_fit', label: "They don't fit my work" },
  { key: 'trying', label: "Nothing — I'm trying them" },
]

export default function StackSurvey({ hasStack }) {
  const track = useAnalytics()
  const [visible, setVisible] = useState(false)
  const [answered, setAnswered] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    if (!hasStack) return
    const prior = read(KEY)
    if (prior?.answer || prior?.dismissed) return
    const id = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(id)
  }, [hasStack])

  useEffect(() => {
    if (visible && !shownRef.current) {
      shownRef.current = true
      track(EVENTS.SURVEY_SHOWN, { question: QUESTION_ID })
    }
  }, [visible, track])

  useEffect(() => {
    if (!answered) return
    const id = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(id)
  }, [answered])

  if (!visible) return null

  function answer(key) {
    write(KEY, { answer: key, at: Date.now() })
    track(EVENTS.SURVEY_ANSWERED, { question: QUESTION_ID, answer: key })
    setAnswered(true)
  }

  function dismiss() {
    write(KEY, { dismissed: true, at: Date.now() })
    track(EVENTS.SURVEY_DISMISSED, { question: QUESTION_ID })
    setVisible(false)
  }

  return (
    <section className="sticker pink mt-8 p-5" style={{ transform: 'rotate(0)' }} aria-labelledby="stack-survey-q">
      {answered ? (
        <p role="status" className="text-sm font-bold text-white">Thanks — that tells us what to fix first.</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <h2 id="stack-survey-q" className="arcade-heading compact text-base">
              ONE QUICK QUESTION: WHAT&apos;S MOST LIKELY TO STOP YOU TRYING THESE TOOLS?
            </h2>
            <button type="button" onClick={dismiss} className="shrink-0 text-xs font-bold text-zinc-400 underline underline-offset-2 hover:text-white">
              Not now
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-labelledby="stack-survey-q">
            {OPTIONS.map((o) => (
              <button key={o.key} type="button" onClick={() => answer(o.key)} className="arcade-chip press min-h-11 cursor-pointer">
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Anonymous. One tap, asked once.</p>
        </>
      )}
    </section>
  )
}
