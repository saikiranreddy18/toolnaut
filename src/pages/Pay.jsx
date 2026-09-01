import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PLANS } from '../utils/planData'
import { useVisitorCountry } from '../hooks/useVisitorCountry'
import { loadSession, signOut } from '../state/authStore'
import { fetchEntitlement, getAccessToken } from '../utils/entitlement'
import useRazorpay from '../hooks/useRazorpay'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { track, EVENTS } from '../utils/analyticsEvents'
import { haptic } from '../utils/haptics'

// The paywall — where a signed-in user lands until a plan is active
// (AppShell sends them here only while the server says payments are ON and
// no entitlement exists). Pays through the existing Razorpay hook; the
// server prices the plan, verifies the payment, and flips the entitlement —
// this page only picks a plan and celebrates.
export default function Pay() {
  const navigate = useNavigate()
  const session = loadSession()
  const { startCheckout, status, error, busy } = useRazorpay()
  const country = useVisitorCountry()
  // Restricted plans are dropped for visitors who cannot buy them. Undetermined
  // country shows everything: the server is the real gate, and hiding plans
  // during a slow geo lookup would cost sales to protect nothing.
  const plans = PLANS.filter(
    (p) => !(country && p.excludeCountries?.includes(country)),
  )
  const [chosen, setChosen] = useState('guru')
  const [ent, setEnt] = useState(null)

  useEffect(() => {
    let on = true
    fetchEntitlement().then((e) => { if (on) setEnt(e) })
    return () => { on = false }
  }, [])

  // Not signed in → this page has no one to charge.
  useEffect(() => {
    if (!session?.user) navigate('/auth/login?next=/pay', { replace: true })
  }, [session, navigate])

  // Already paid (another tab, a webhook that beat the redirect) → straight in.
  useEffect(() => {
    if (ent?.active) navigate('/app/stack', { replace: true })
  }, [ent, navigate])

  async function pay(planId) {
    setChosen(planId)
    haptic.tap()
    track(EVENTS.CHECKOUT_STARTED, { plan: planId, surface: 'paywall' })
    const accessToken = await getAccessToken()
    startCheckout({
      planId,
      accessToken,
      prefill: session?.user?.email ? { email: session.user.email } : {},
      onPaid: () => {
        track(EVENTS.SUBSCRIPTION_STARTED, { plan: planId, surface: 'paywall' })
        haptic.success()
        navigate('/app/stack', { replace: true })
      },
    })
  }

  const paymentsOff = ent && !ent.unknown && !ent.paymentsEnabled

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-5 py-8">
      <Link to="/" aria-label="Toolnaut home" className="mb-6">
        <BrandLogo {...LOGO.page} />
      </Link>

      <p className="font-display text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--lime)' }}>
        ▸ one step before your universe
      </p>
      <h1 className="mt-2 text-center font-display text-3xl font-black uppercase text-white">
        Pick your plan
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-slate-400">
        {session?.user?.name ? `Signed in as ${session.user.name}. ` : ''}
        Your stack, roadmap and monitoring unlock the moment the payment confirms.
      </p>

      {paymentsOff && (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-slate-300">
          Payments aren’t switched on for this deployment yet — nothing can be charged right now.
        </p>
      )}

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
        {plans.map((p) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => pay(p.id)}
            disabled={busy || paymentsOff}
            className={`cursor-pointer rounded-2xl border-2 p-5 text-left transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${p.featured ? 'bg-white/[0.06]' : 'bg-white/[0.03]'}`}
            style={{ borderColor: p.accent, boxShadow: `0 10px 30px -12px ${p.glow}` }}
          >
            {p.badge && (
              <span className="font-display text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: p.accent }}>
                {p.badge}
              </span>
            )}
            <p className="mt-1 font-display text-lg font-black uppercase text-white">{p.name}</p>
            <p className="mt-1 font-display text-2xl font-black text-white">
              {p.currency === 'USD' ? `$${p.price}` : `₹${p.priceINR}`}
              <span className="text-xs font-bold text-slate-400">
                {p.lifetime ? ' one time · lifetime' : ' / 30 days'}
              </span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{p.audience}</p>
            <span
              className="mt-4 inline-block rounded-full px-4 py-1.5 font-display text-[10px] font-black uppercase tracking-wider text-black"
              style={{ background: 'var(--lime)' }}
            >
              {busy && chosen === p.id ? 'Opening…' : `Get ${p.name}`}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Stated at the point of payment, not buried in the terms. Someone who
          believes this renews will not come back to re-buy, and will treat the
          lapse as a bug or a broken charge. */}
      <p className="mt-5 text-[11px] leading-relaxed text-slate-400">
        Every plan here is a one-time payment. Nothing auto-renews and your card
        is never stored or charged again.{' '}
        {plans.some((p) => p.lifetime)
          ? 'The 30-day plans end when the 30 days are up unless you buy again; the Founder plan never expires.'
          : 'When the 30 days are up, access simply ends unless you choose to buy again.'}
      </p>

      {status === 'verifying' && (
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-300">Confirming your payment…</p>
      )}
      {error && (
        <p className="mt-5 max-w-md text-center text-xs font-semibold" style={{ color: 'var(--hot-pink)' }}>{error}</p>
      )}

      <div className="mt-8 flex items-center gap-5 text-xs text-slate-500">
        <Link to="/pricing" className="underline underline-offset-4 hover:text-white">Compare plans</Link>
        <button
          onClick={async () => { await signOut(); navigate('/') }}
          className="cursor-pointer underline underline-offset-4 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
