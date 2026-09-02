import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../utils/supabase'
import { fetchEntitlement } from '../../utils/entitlement'
import { PLANS } from '../../utils/planData'

// Billing — current plan and payment history, spec step 7 of the payment
// pipeline (docs/payments-pipeline.md).
//
// The plan comes from /api/entitlement (user_entitlements is the authority);
// the history is read DIRECTLY from payment_transactions with the anon client
// — the RLS policy "own transactions" scopes the query to auth.uid(), which
// is exactly the access model the pipeline is built on: users read their own
// rows, only the server writes them.
//
// Honest states everywhere: no invented invoices, no fake "active" badges. A
// guest, a dev session, an unconfigured backend and a paid user each see what
// is actually true for them.

const paise = (n) => (Number.isFinite(n) ? `₹${(n / 100).toLocaleString('en-IN')}` : '—')
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const planName = (code) => PLANS.find((p) => p.id === code)?.name || code || '—'

const STATUS_COLOR = {
  captured: 'var(--lime)',
  created: '#94a3b8',
  failed: 'var(--hot-pink)',
  refunded: '#facc15',
}

export default function BillingCard({ session }) {
  const [ent, setEnt] = useState(null)
  const [history, setHistory] = useState(null) // null = loading, [] = none

  useEffect(() => {
    if (!session?.user || session.simulated) return
    let on = true
    fetchEntitlement().then((e) => { if (on) setEnt(e) })
    if (isSupabaseConfigured) {
      supabase
        .from('payment_transactions')
        .select('plan_code,status,amount_paise,razorpay_payment_id,created_at,paid_at')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (on) setHistory(error ? [] : data || [])
        })
    } else {
      setHistory([])
    }
    return () => { on = false }
  }, [session?.user?.id, session?.simulated])

  if (!session?.user) return null

  if (session.simulated || !isSupabaseConfigured) {
    return (
      <div className="sticker mt-4 p-5">
        <p className="text-sm leading-relaxed text-slate-300">
          Billing needs a real signed-in account — this is a local dev session,
          so there is nothing to bill and nothing is charged.
        </p>
      </div>
    )
  }

  return (
    <div className="sticker mt-4 p-5">
      <dl className="divide-y divide-white/10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5 first:pt-0">
          <dt className="text-xs text-slate-400">Current plan</dt>
          <dd className="font-display text-xs font-black uppercase tracking-wide" style={{ color: 'var(--lime)' }}>
            {ent === null ? 'Checking…'
              : ent.active ? `${planName(ent.plan)} · active`
              : 'Free beta'}
          </dd>
        </div>
        {ent?.active && ent.endsAt && (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
              <dt className="text-xs text-slate-400">Access ends</dt>
              <dd className="text-xs font-bold text-white">{day(ent.endsAt)}</dd>
            </div>
            {/* The two rows a payer actually worries about. Both are facts, not
                reassurance: no Razorpay Subscription exists, so there is
                genuinely no future charge to disclose. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
              <dt className="text-xs text-slate-400">Auto-renewal</dt>
              <dd className="text-xs font-bold text-white">Off — this pass does not renew</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
              <dt className="text-xs text-slate-400">Next charge</dt>
              <dd className="text-xs font-bold text-white">None</dd>
            </div>
          </>
        )}
      </dl>

      {/* Buy path only when there is genuinely something to buy. */}
      {ent && !ent.active && ent.paymentsEnabled && (
        <Link to="/pay" className="nb-btn mt-4 inline-block min-h-11 px-5 py-2.5 text-xs">
          GET A 30-DAY PASS →
        </Link>
      )}
      {ent && !ent.active && !ent.paymentsEnabled && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Paid plans aren’t open yet — everything current is part of the free beta.
        </p>
      )}

      {/* Ending soon. Silence until the last week, because a countdown shown
          on day one is nagging; shown on day twenty-eight it is a service.
          Nothing renews, so this is the only warning a person will get. */}
      {ent?.active && ent.daysLeft != null && ent.daysLeft <= 7 && (
        <p
          className="mt-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
          style={{ borderColor: 'rgba(255,46,163,0.4)', background: 'rgba(255,46,163,0.08)', color: '#fecdd3' }}
          role="status"
        >
          <b>
            {ent.daysLeft === 0
              ? 'Your access ends today.'
              : `Your access ends in ${ent.daysLeft} day${ent.daysLeft === 1 ? '' : 's'}.`}
          </b>{' '}
          Nothing renews automatically, so buy another pass if you want to carry on.
        </p>
      )}
      {ent?.active && ent.daysLeft != null && ent.daysLeft <= 7 && ent.paymentsEnabled && (
        <Link to="/pay" className="nb-btn mt-3 inline-block min-h-11 px-5 py-2.5 text-xs">
          GET ANOTHER PASS →
        </Link>
      )}

      {/* The one place a payer looks when something is wrong. A billing screen
          with no way to reach a human is where trust goes. */}
      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Payment or access problem?{' '}
        <Link to="/support" className="underline underline-offset-4" style={{ color: 'var(--cyan)' }}>
          Support and refunds
        </Link>
      </p>

      <p className="mt-5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        Payment history
      </p>
      {history === null ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : history.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          No payments yet. When you pay, every attempt shows here — amount,
          status and the payment id to quote if anything needs sorting out.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-white/10">
          {history.map((t, i) => (
            <li key={t.razorpay_payment_id || i} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
              <span className="text-xs text-slate-300">
                {day(t.paid_at || t.created_at)} · {planName(t.plan_code)}
              </span>
              <span className="text-xs font-bold text-white">
                {paise(t.amount_paise)}{' '}
                <span className="font-display text-[10px] font-black uppercase" style={{ color: STATUS_COLOR[t.status] || '#94a3b8' }}>
                  {t.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
