import { useRazorpay } from '../../hooks/useRazorpay'

// Checkout button for one plan.
//
// It takes a plan ID and never a price. The amount is decided by
// /api/create-order from the same PLANS table the pricing page renders from, so
// this component cannot be made to charge the wrong number and the two cannot
// drift apart.
//
// Every failure state says whether money moved. "Payment failed" and "we could
// not confirm your payment" are completely different situations for the person
// reading them, and conflating the two is how someone ends up paying twice.

const LABELS = {
  idle: null, // caller's label
  loading: 'Starting…',
  open: 'Waiting for payment…',
  verifying: 'Confirming…',
  paid: '✓ Paid',
  error: null, // caller's label — the button stays usable so they can retry
}

export default function PayButton({
  planId,
  label = 'Upgrade',
  prefill,
  onPaid,
  className = '',
}) {
  const { startCheckout, status, error, busy } = useRazorpay()

  const disabled = busy || status === 'open' || status === 'paid'

  return (
    <div className={className}>
      <button
        type="button"
        className="nb-btn w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        aria-busy={busy || undefined}
        onClick={() => startCheckout({ planId, prefill, onPaid })}
      >
        {LABELS[status] || label}
      </button>

      {error && (
        // role=alert so it is announced. Payment errors are exactly the kind of
        // message that must not be silently visual-only.
        <p
          role="alert"
          className="mt-2 text-xs leading-relaxed"
          style={{ color: 'var(--hot-pink)' }}
        >
          {error}
        </p>
      )}

      {status === 'paid' && (
        <p role="status" className="mt-2 text-xs" style={{ color: 'var(--lime)' }}>
          Payment confirmed. Thank you.
        </p>
      )}
    </div>
  )
}
