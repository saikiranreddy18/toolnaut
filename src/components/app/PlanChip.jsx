import { Link } from 'react-router-dom'
import { PLANS } from '../../utils/planData'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// The plan you are actually on, and a way to upgrade when upgrading does
// something.
//
// FROM THE SERVER, NOT THE SESSION. The sidebar used to print
// planLabel(session.plan), and session.plan is hardcoded to 'shishya' at sign-in
// (authStore) — so every account, including paying ones, was told it was on the
// Student plan. This reads the entitlement the server granted instead.
//
// WHO SEES AN UPGRADE BUTTON
//   trial, still running   -> days left + Upgrade
//   no active plan         -> Upgrade
//   paid and active        -> the plan name, no upsell
// Paying customers get no upgrade prompt on purpose: today every paid plan
// unlocks the same app, so offering a "higher" tier would sell nothing.
//
// Hidden for guests, while loading, when the check failed, and when payments
// are switched off — a button to a checkout that cannot take money is a dead end.
//
// `ent` is passed in rather than fetched here: the chip renders twice (desktop
// rail and mobile bar), and one shared request is better than two.

function planName(id) {
  return PLANS.find((p) => p.id === id)?.name || id
}

export default function PlanChip({ ent, compact = false, className = '' }) {
  const track = useAnalytics()
  if (!ent || ent.loading || ent.unknown || !ent.configured || !ent.paymentsEnabled) return null

  const upgrade = (label) => (
    <Link
      to="/pay"
      onClick={() => track(EVENTS.UPGRADE_CLICKED, { surface: compact ? 'topbar' : 'sidebar', from: ent.trial ? 'trial' : 'none' })}
      className="nb-btn inline-block min-h-8 px-3 py-1 text-[10px]"
    >
      {label}
    </Link>
  )

  // Paid and active: say which plan, and stop there.
  if (ent.active && !ent.trial) {
    const lifetime = ent.active && !ent.endsAt
    return (
      <Link
        to="/app/settings"
        className={`inline-flex items-center gap-1.5 rounded-full border-2 border-black px-2.5 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-black ${className}`}
        style={{ background: 'var(--cyan)' }}
        title="Your plan and billing"
      >
        {planName(ent.plan)}
        {!compact && <span className="opacity-70">· {lifetime ? 'lifetime' : `${ent.days ?? 0}d left`}</span>}
      </Link>
    )
  }

  // On a trial that is still running.
  if (ent.active && ent.trial) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {!compact && (
          <span className="font-display text-[10px] font-black uppercase tracking-wider text-cyan-300">
            Trial · {ent.days ?? 0}d left
          </span>
        )}
        {upgrade('Upgrade')}
      </div>
    )
  }

  // No active plan: the trial has ended, or a paid plan expired.
  return <div className={className}>{upgrade(compact ? 'Upgrade' : 'Choose a plan')}</div>
}
