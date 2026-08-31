import { useState } from 'react'
import { payFounderOffer } from '../../utils/razorpay'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// The one thing on the site that takes money.
//
// Razorpay Standard Checkout is a ONE-TIME payment, which is why this is
// attached to the founder lifetime offer and not to the monthly pillars above
// it. Selling a recurring plan through this flow would charge once and imply
// forever — the Subscriptions API is a different integration.
//
// Every outcome is shown, including the ones people usually swallow: a
// dismissed modal, a blocked script, and the bad one — money taken but the
// signature not verified. That last case must never say "failed", because the
// charge may be real.

const TONE = {
  paid: { color: 'var(--lime)', role: 'status' },
  cancelled: { color: '#cbd5e1', role: 'status' },
  failed: { color: 'var(--hot-pink)', role: 'alert' },
  unavailable: { color: 'var(--arcade-yellow)', role: 'alert' },
}

export default function FounderPayButton({ label = 'GET LIFETIME ACCESS', className = '' }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const track = useAnalytics()

  async function pay() {
    if (busy) return
    setBusy(true)
    setResult(null)
    track(EVENTS.CTA_CLICK, { cta: 'founder_checkout', location: 'pricing' })
    try {
      setResult(await payFounderOffer())
    } finally {
      setBusy(false)
    }
  }

  const tone = result ? TONE[result.status] || TONE.failed : null

  return (
    <div className={className}>
      <button onClick={pay} disabled={busy} className="nb-btn px-6 py-3 text-sm disabled:opacity-60">
        {busy ? 'OPENING…' : label}
      </button>

      {result && (
        <p
          role={tone.role}
          className="mt-3 max-w-md text-xs leading-relaxed"
          style={{ color: tone.color }}
        >
          {result.message}
          {/* The payment id is the only thing that makes an unverified charge
              recoverable, so it is shown rather than only logged. */}
          {result.paymentId && result.status !== 'paid' && (
            <>
              {' '}
              <span className="font-mono text-[11px] text-slate-400">{result.paymentId}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}
