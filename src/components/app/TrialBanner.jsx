import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useEntitlement } from '../../hooks/useEntitlement'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// "Your trial ends in 3 days."
//
// SHOWN ONLY WHEN IT IS TRUE AND USEFUL. Not to paying customers, not to
// guests, not while the check is still loading, and not when the check FAILED
// — a network hiccup must never produce a countdown nobody can verify.
//
// Lifetime plans have a null end date and correctly get nothing: there is no
// expiry to warn about, and a banner implying one would be a lie.
const WARN_WITHIN_DAYS = 3

export default function TrialBanner() {
  const ent = useEntitlement()
  const track = useAnalytics()
  const reported = useRef(false)

  // Reported once per mount, and only once the server has actually said so —
  // firing on the click that CREATED the account would count trials that the
  // grant then failed to write.
  useEffect(() => {
    if (reported.current || ent.loading || ent.unknown) return
    if (ent.trial && ent.active) {
      reported.current = true
      track(EVENTS.TRIAL_STARTED, { days_left: ent.days ?? null })
    } else if (ent.trial && !ent.active) {
      reported.current = true
      track(EVENTS.TRIAL_EXPIRED, {})
    }
  }, [ent.loading, ent.unknown, ent.trial, ent.active, ent.days, track])

  if (ent.loading || ent.unknown) return null
  // Payments off means nobody can buy anything, so urging them to would be
  // pointing at a door that does not open.
  if (!ent.paymentsEnabled || !ent.configured) return null

  const days = ent.days

  // Expired: the shell already redirects to /pay, so this is the brief moment
  // before that lands, plus any page outside the gate.
  if (ent.trial && !ent.active) {
    return (
      <Banner tone="rose">
        Your free trial has ended.{' '}
        <Link to="/pay" className="underline underline-offset-2">Pick a plan</Link> to
        get your stack, roadmap and saved tools back.
      </Banner>
    )
  }

  if (!ent.active) return null

  // A purchase gets no banner until it is nearly out, and a lifetime plan
  // (days === null) never does.
  if (!ent.trial) {
    if (days === null || days > WARN_WITHIN_DAYS) return null
    return (
      <Banner tone="amber">
        Your plan ends in {days} {days === 1 ? 'day' : 'days'}.{' '}
        <Link to="/pay" className="underline underline-offset-2">Renew</Link> to keep
        everything you have built.
      </Banner>
    )
  }

  // On trial. Say so throughout — someone who forgets they are on a clock is
  // the person most surprised when it stops.
  const urgent = days !== null && days <= WARN_WITHIN_DAYS
  return (
    <Banner tone={urgent ? 'amber' : 'slate'}>
      {days === null
        ? 'You are on a free trial.'
        : `Free trial — ${days} ${days === 1 ? 'day' : 'days'} left.`}{' '}
      <Link to="/pay" className="underline underline-offset-2">See plans</Link>
    </Banner>
  )
}

function Banner({ tone, children }) {
  const tones = {
    rose: { bg: 'rgba(244,63,94,0.14)', border: '#fb7185', text: '#fecdd3' },
    amber: { bg: 'rgba(255,222,46,0.12)', border: 'var(--arcade-yellow)', text: '#fde68a' },
    slate: { bg: 'rgba(148,163,184,0.10)', border: '#475569', text: '#cbd5e1' },
  }
  const t = tones[tone] || tones.slate
  return (
    <div
      // polite, not assertive: it is information, and it must not interrupt a
      // screen reader mid-sentence when it appears after the entitlement check.
      role="status"
      aria-live="polite"
      className="mx-auto mb-4 max-w-5xl rounded-xl border-2 px-4 py-2.5 text-xs font-semibold xl:max-w-6xl"
      style={{ background: t.bg, borderColor: t.border, color: t.text }}
    >
      {children}
    </div>
  )
}
