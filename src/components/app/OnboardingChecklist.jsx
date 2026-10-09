import { useState } from 'react'
import { Link } from 'react-router-dom'
import { read, write } from '../../state/scopedStorage'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { getOnboardingSteps } from '../../utils/onboardingSteps'

const DISMISS_KEY = 'exus_onboarding_dismissed_v1'

// First-session activation nudge: "have you actually done the things that
// predict you'll come back," not AppTour's one-time "here is where things
// are." Self-hiding once every step is done, and once a user dismisses it
// manually — a returning, fully-activated user sees the exact same page as
// before this shipped.
export default function OnboardingChecklist() {
  const track = useAnalytics()
  const [dismissed, setDismissed] = useState(() => Boolean(read(DISMISS_KEY)))
  const steps = getOnboardingSteps()
  const allDone = steps.every((s) => s.done)

  if (dismissed || allDone) return null

  function dismiss() {
    write(DISMISS_KEY, true)
    setDismissed(true)
    track(EVENTS.CTA_CLICK, { cta: 'dismiss', location: 'onboarding_checklist' })
  }

  const doneCount = steps.filter((s) => s.done).length

  return (
    <section className="sticker mt-6 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-white">
          getting started
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-display text-[10px] font-bold text-zinc-500">
            {doneCount} of {steps.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mt-1 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
      <ul className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`day-dot shrink-0 ${step.done ? 'done' : ''}`}
              style={{ width: 22, height: 22, fontSize: 11 }}
            >
              {step.done ? '✓' : ''}
            </span>
            {step.done ? (
              <span className="text-sm text-zinc-500 line-through">{step.label}</span>
            ) : (
              <Link
                to={step.href}
                className="text-sm font-bold underline underline-offset-2"
                style={{ color: 'var(--lime)' }}
              >
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
