import { Link } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import PayButton from '../components/app/PayButton'
import { PLANS } from '../utils/planData'
import { useHead } from '../utils/head'

// The Razorpay checkout flow, on its own route.
//
// WHY THIS IS NOT THE PRICING PAGE
// The pricing page, the footer and /methodology all currently state that
// Toolnaut is in free public beta and takes no payment of any kind. Putting a
// live "Pay ₹299" button next to that copy would make the product contradict
// itself in front of real visitors, so the checkout lives here until the beta
// actually ends. Switching over is then a deliberate act: point the pricing
// CTAs at PayButton and update those three claims in the same change.
//
// The route is noindex — it is a working integration, not a page to be found.
//
// The endpoint returns 503 when RAZORPAY_* is unset, which is the case on any
// deployment where the keys have not been added. That is the safe default:
// checkout is unavailable rather than half-working.

export default function Checkout() {
  useHead({
    title: 'Checkout — Toolnaut',
    description: 'Payment test harness.',
    path: '/checkout',
    noindex: true,
  })

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-5 py-10 lg:py-14">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/pricing" className="nb-btn px-4 py-2 text-xs">
          ← Plans
        </Link>
      </header>

      <p className="font-display text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--lime)' }}>
        ▸ Checkout
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">PAY FOR A PLAN</h1>

      <div
        className="mt-6 rounded-2xl border-[3px] border-black p-5"
        style={{ background: '#1a0d15', boxShadow: '5px 5px 0 #000' }}
      >
        <p className="text-sm text-slate-300">
          <strong className="text-white">Toolnaut is still in free public beta.</strong>{' '}
          This page exists so the payment integration can be exercised end to end.
          It runs against Razorpay in <strong className="text-white">test mode</strong>,
          so no real money moves — use Razorpay&apos;s test cards.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border-[3px] border-black p-5"
            style={{ background: '#15151f', boxShadow: '5px 5px 0 #000' }}
          >
            <p
              className="font-display text-[10px] font-black uppercase tracking-widest"
              style={{ color: plan.accent }}
            >
              {plan.tier}
            </p>
            <h2 className="mt-1 font-display text-lg font-black italic text-white">{plan.name}</h2>
            {/* The rupee figure is shown because that is what Razorpay will
                actually charge. The server re-derives it from this same PLANS
                entry, so the display and the charge cannot disagree. */}
            <p className="mt-2 font-display text-2xl font-black" style={{ color: 'var(--lime)' }}>
              ₹{plan.priceINR}
            </p>
            <p className="mt-1 text-xs text-slate-500">one-time, test mode</p>

            <PayButton
              className="mt-4"
              planId={plan.id}
              label={`Pay ₹${plan.priceINR}`}
              onPaid={(result) => {
                // Deliberately not granting the plan. There is no orders table
                // and no server-side entitlement yet, and writing "paid" into
                // localStorage would be a client-side claim of purchase that
                // anyone could set by hand.
                console.info('payment verified', result)
              }}
            />
          </div>
        ))}
      </div>

      <div
        className="mt-8 rounded-2xl border-[3px] border-black p-5"
        style={{ background: '#15151f', boxShadow: '5px 5px 0 #000' }}
      >
        <h3 className="font-display text-sm font-black italic text-white">Test cards</h3>
        <p className="mt-2 text-sm text-slate-300">
          Card <code style={{ color: 'var(--lime)' }}>4111 1111 1111 1111</code>, any
          future expiry, any CVV, any name. Razorpay&apos;s test-mode UPI succeeds
          on <code style={{ color: 'var(--lime)' }}>success@razorpay</code>.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Dismissing the window is treated as a cancellation, not a failure — nothing is charged.
        </p>
      </div>
    </div>
  )
}
