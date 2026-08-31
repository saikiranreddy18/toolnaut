// Razorpay Standard Checkout, front end.
//
// Loads checkout.js on demand rather than in index.html: it is a third-party
// script most visitors never need, and the landing page already carries a
// 857KB three.js chunk. One fetch, cached, only when someone intends to pay.

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

let loading

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true)
  if (loading) return loading
  loading = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve(true)
    // A blocked script (offline, ad blocker, strict extension) is a normal
    // outcome, not an exception to throw at the caller.
    s.onerror = () => { loading = null; resolve(false) }
    document.head.appendChild(s)
  })
  return loading
}

// Runs the whole flow and resolves to one result object. Every branch —
// success, cancel, failure, blocked script, unverified signature — comes back
// in the same shape, so the caller has exactly one thing to render.
//
//   { status: 'paid' | 'cancelled' | 'failed' | 'unavailable', message, paymentId? }
export async function payFounderOffer({ name, email } = {}) {
  const ok = await loadCheckout()
  if (!ok) {
    return { status: 'unavailable', message: 'Could not load the payment window. Check your connection or any ad blocker, then try again.' }
  }

  let order
  try {
    const res = await fetch('/api/razorpay-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}', // the amount is server-side on purpose; nothing to send
    })
    if (!res.ok) {
      return {
        status: 'unavailable',
        message: res.status === 503
          ? 'Payments are not switched on yet.'
          : 'Could not start the payment. Please try again.',
      }
    }
    order = await res.json()
  } catch {
    return { status: 'unavailable', message: 'Could not reach the payment service.' }
  }

  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      // The key id comes back from our own endpoint rather than the bundle, so
      // rotating it is an env change with no rebuild.
      key: order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'Toolnaut',
      description: 'Founder lifetime access',
      prefill: { name: name || '', email: email || '' },
      theme: { color: '#a3ff2e' },
      // Dismissing the modal is a normal choice, not an error.
      modal: {
        ondismiss: () => resolve({ status: 'cancelled', message: 'Payment cancelled — nothing was charged.' }),
      },
      handler: async (r) => {
        // The modal saying "success" is not proof. Only the server's signature
        // check is, so nothing is unlocked until this returns verified.
        try {
          const res = await fetch('/api/razorpay-verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            }),
          })
          const body = await res.json().catch(() => ({}))
          if (res.ok && body.verified) {
            resolve({ status: 'paid', message: 'Payment confirmed.', paymentId: body.payment_id })
          } else {
            // Money may well have left their account, so never say "failed" —
            // say what is true and give them somewhere to go.
            resolve({
              status: 'failed',
              message: 'We could not verify this payment. If you were charged, email support with your payment id and it will be sorted.',
              paymentId: r.razorpay_payment_id,
            })
          }
        } catch {
          resolve({
            status: 'failed',
            message: 'Payment taken but verification did not complete. Please contact support with your payment id.',
            paymentId: r.razorpay_payment_id,
          })
        }
      },
    })

    rzp.on('payment.failed', (e) => {
      resolve({
        status: 'failed',
        message: e?.error?.description || 'The payment did not go through. No charge was made.',
      })
    })

    rzp.open()
  })
}
