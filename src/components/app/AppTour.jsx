import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { read, write } from '../../state/scopedStorage'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'

// The first-run tour of /app.
//
// WHY A SPOTLIGHT AND NOT A SLIDESHOW
// A carousel of screenshots teaches nothing, because the thing being described
// is not on screen while you read about it. This dims the real app and cuts a
// hole around the real control, so the sentence and the button a person is
// about to press are in front of them at the same time.
//
// IT POINTS AT WHAT IS ACTUALLY THERE
// Steps are matched to live elements by data-tour attributes. A step whose
// element is missing — the chat launcher while chat is open, a rail that only
// exists on desktop — is skipped rather than pointing at empty space. So the
// same tour works on a phone and on a wide screen without two sets of copy.
//
// ONCE PER ACCOUNT, AND ALWAYS ESCAPABLE
// The flag is written through scopedStorage, so it is per account rather than
// per browser: a second person signing in on the same laptop gets their own
// first run. Escape, the X, the backdrop and Skip all end it, and it is
// replayable from Settings for anyone who wants it again.
const KEY = 'exus_tour_v1'
const PAD = 10           // breathing room around the highlighted element
const CARD_W = 320
const GAP = 14           // between the hole and the card

// Written against what the shell actually renders. `anchor` is the data-tour
// value; null means a centred card with no spotlight.
const STEPS = [
  {
    anchor: null,
    title: 'This is your command center',
    body: 'Everything Toolnaut found for you lives here. Ninety seconds and you will know your way around.',
  },
  {
    anchor: '/app/stack',
    title: 'Your stack',
    body: 'The tools picked for your role, level and budget — plus one pick to try today.',
  },
  {
    anchor: '/app/discover',
    title: 'Find more',
    body: 'Search the whole catalogue, filtered to what fits you. New tools land here every day.',
  },
  {
    anchor: '/app/favorites',
    title: 'Saved',
    body: 'Anything you save is kept here, and syncs to your account when you are signed in.',
  },
  {
    anchor: '/app/learning',
    title: 'Your 4-week plan',
    body: 'A step at a time, with checkpoints — so the tools you picked actually get learned.',
  },
  {
    anchor: 'chat',
    title: 'Ask about anything',
    body: 'The assistant knows the catalogue. Ask which tool fits a job, or how two compare.',
  },
  {
    anchor: '/app/settings',
    title: 'You, and your settings',
    body: 'Email alerts for new tools, your plan and billing, and your account live here.',
  },
]

export function tourSeen() {
  return Boolean(read(KEY)?.done)
}

export function markTourSeen() {
  write(KEY, { done: true, at: Date.now() })
}

// Fired by replayTour(). AppShell listens for it.
export const TOUR_REPLAY_EVENT = 'toolnaut:tour-replay'

// Clears the flag AND asks the open shell to show the tour now. The flag alone
// was not enough: Settings lives inside AppShell, so going back to /app/stack
// never remounts the shell, and the mount-time check that starts the tour
// never ran again. The button looked like it did nothing until a reload.
export function replayTour() {
  write(KEY, { done: false, at: Date.now() })
  window.dispatchEvent(new Event(TOUR_REPLAY_EVENT))
}

function rectOf(anchor) {
  if (!anchor) return null
  const el = document.querySelector(`[data-tour="${CSS.escape(anchor)}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  // An element scrolled out of view, or collapsed to nothing, is not something
  // to point at.
  if (r.width < 4 || r.height < 4) return null
  if (r.bottom < 0 || r.top > window.innerHeight) return null
  return r
}

export default function AppTour({ open, onClose }) {
  const track = useAnalytics()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const cardRef = useRef(null)
  const startedRef = useRef(false)

  // Steps whose element exists right now. Recomputed on open so a phone and a
  // desktop each get the steps that make sense for them.
  const steps = open ? STEPS.filter((s) => !s.anchor || rectOf(s.anchor)) : []
  const step = steps[i]

  const finish = useCallback((reason) => {
    markTourSeen()
    track(reason === 'done' ? EVENTS.TOUR_COMPLETED : EVENTS.TOUR_SKIPPED, { step: i + 1, of: steps.length })
    onClose?.()
  }, [i, steps.length, track, onClose])

  // Every opening starts from step 1. The component stays mounted between
  // runs, so without this a replay reopened on the step the last run ended on
  // — the final one — and "replay" showed a single card.
  useEffect(() => {
    if (!open) { startedRef.current = false; return }
    if (startedRef.current) return
    startedRef.current = true
    setI(0)
    track(EVENTS.TOUR_STARTED, { steps: STEPS.length })
  }, [open, track])

  // Measure before paint, so the spotlight never appears in the wrong place for
  // a frame and then jumps.
  useLayoutEffect(() => {
    if (!open || !step) return
    const measure = () => setRect(rectOf(step.anchor))
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, step])

  useEffect(() => {
    if (open) cardRef.current?.focus()
  }, [open, i])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish('skip') }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function next() {
    haptic.tap()
    if (i >= steps.length - 1) return finish('done')
    track(EVENTS.TOUR_STEP, { step: i + 2 })
    setI((n) => n + 1)
  }
  function back() {
    if (i === 0) return
    haptic.tap()
    setI((n) => n - 1)
  }

  if (!open || !step) return null

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Card placement: above the hole when there is room above, below otherwise,
  // centred when the step has no anchor. Clamped so it never leaves the screen
  // on a narrow phone.
  let cardTop = vh / 2 - 120
  let cardLeft = vw / 2 - CARD_W / 2
  if (rect) {
    const below = rect.bottom + GAP
    const above = rect.top - GAP
    const putAbove = above > 260 || below > vh - 240
    cardTop = putAbove ? Math.max(16, above - 240) : Math.min(vh - 240, below)
    cardLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12)
  }

  const hole = rect
    ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 }
    : null

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* The dim layer is one SVG with a hole punched by a mask, rather than
          four divs around the element: a mask follows a rounded corner exactly
          and cannot leave hairline gaps at the joins. */}
      <svg width="100%" height="100%" className="absolute inset-0" aria-hidden="true" onClick={() => finish('skip')}>
        <defs>
          <mask id="tour-hole">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="16" fill="#000" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(5,5,9,0.82)" mask="url(#tour-hole)" />
        {hole && (
          <rect
            x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="16"
            fill="none" stroke="var(--lime)" strokeWidth="3"
            style={{ filter: 'drop-shadow(0 0 14px rgba(163,255,46,0.7))' }}
          />
        )}
      </svg>

      <div
        ref={cardRef}
        tabIndex={-1}
        className="sticker absolute p-5 outline-none"
        style={{ top: cardTop, left: cardLeft, width: CARD_W, transform: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-lime-400">
            {i + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={() => finish('skip')}
            aria-label="Close the tour"
            className="-mt-1 text-slate-400 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        <h2 id="tour-title" className="arcade-heading mt-2 text-lg">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => finish('skip')}
            className="text-xs font-bold text-slate-400 underline underline-offset-2 transition-colors hover:text-white"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button type="button" onClick={back} className="nb-btn dark min-h-11 px-4 py-2 text-xs">
                Back
              </button>
            )}
            <button type="button" onClick={next} className="nb-btn min-h-11 px-5 py-2 text-xs">
              {i >= steps.length - 1 ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
