import { useCallback, useRef, useState } from 'react'

// Razorpay Standard Checkout, as a hook.
//
// THE SCRIPT LOADS ON DEMAND, NOT IN index.html
// Putting checkout.js in the document head makes every visitor download a
// payment SDK to read the landing page. It is fetched the first time someone
// actually starts a checkout, and the promise is cached so a second click does
// not load it twice.
//
// THE BROWSER NEVER NAMES A PRICE
// startCheckout takes a plan id. The amount and the key id both come back from
// /api/create-order, which decides them server-side. If this hook accepted an
// amount, the price would be whatever devtools said it was.
//
// A "success" here means the SERVER verified it. Razorpay's handler firing only
// means the browser was told the payment worked, and a browser can be scripted,
// so nothing is treated as paid until /api/verify-payment says so.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let scriptPromise = null

function loadCheckoutScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`)
    const el = existing || document.createElement('script')
    el.src = CHECKOUT_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      // Cleared so a later attempt can retry rather than being stuck with a
      // permanently rejected cached promise — this fails on flaky networks and
      // behind blockers, both of which are recoverable.
      scriptPromise = null
      reject(new Error('Could not load the payment window'))
    }
    if (!existing) document.body.appendChild(el)
  })
  return scriptPromise
}

const GENERIC_ERROR = 'Something went wrong starting the payment. Nothing was charged.'

export function useRazorpay() {
  const [status, setStatus] = useState('idle') // idle | loading | open | verifying | paid | error
  const [error, setError] = useState(null)
  // Guards double-submits: the button is disabled while busy, but a fast double
  // click can still land two calls before React re-renders.
  const busy = useRef(false)

  const startCheckout = useCallback(async ({ planId, prefill = {}, onPaid, accessToken } = {}) => {
    if (busy.current) return
    busy.current = true
    setError(null)
    setStatus('loading')

    try {
      // The token ties the ORDER to the signed-in user (create-order writes
      // the user id into the order notes server-side). Without it the payment
      // still works but can never activate an entitlement.
      const headers = { 'Content-Type': 'application/json' }
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      const [orderRes] = await Promise.all([
        fetch('/api/create-order', {
          method: 'POST',
          headers,
          body: JSON.stringify({ planId }),
        }),
        loadCheckoutScript(),
      ])

      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}))
        throw new Error(
          orderRes.status === 503
            ? 'Payments are not available right now.'
            : body.error || GENERIC_ERROR,
        )
      }

      const order = await orderRes.json()

      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Toolnaut',
        description: `${order.plan?.name || 'Plan'} — Toolnaut`,
        prefill,

        // The mascot, in the one slot Razorpay actually gives us.
        //
        // WHAT CAN AND CANNOT BE BRANDED HERE
        // Standard Checkout renders Razorpay's own template. The illustration on
        // the coloured panel is theirs and cannot be replaced, animated, or
        // hidden - there is no option for it. What IS ours: this logo, the
        // merchant name, the description, and the theme colours. Without `image`
        // that square falls back to the first letter of `name`, which is why it
        // was showing a bare "T".
        //
        // Absolute HTTPS, because Razorpay's page fetches it, not ours. PNG
        // rather than the SVG at /icon.svg: their modal renders SVG
        // inconsistently. Regenerate with scripts/make-checkout-logo.mjs.
        image: 'https://toolnaut.xyz/checkout-logo.png',

        theme: {
          color: '#a3ff2e',
          // The panel behind the modal, so the arcade dark carries through
          // instead of Razorpay's default grey wash.
          backdrop_color: 'rgba(10, 10, 18, 0.92)',
        },

        // Dismissing the modal is a normal thing to do, not an error. Saying
        // "nothing was charged" is the entire point of the message.
        modal: {
          ondismiss: () => {
            busy.current = false
            setStatus('idle')
            setError(null)
          },
        },

        handler: async (response) => {
          setStatus('verifying')
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const result = await verifyRes.json().catch(() => ({}))

            if (!verifyRes.ok || !result.verified) {
              // The money may well have left their account, so this must never
              // read like "payment failed, try again" — that invites a second
              // charge. Give them the payment id to quote.
              setStatus('error')
              setError(
                `We could not confirm this payment automatically. Do not pay again — ` +
                `quote payment ${response.razorpay_payment_id} and we will sort it out.`,
              )
              return
            }

            setStatus('paid')
            onPaid?.(result)
          } catch {
            setStatus('error')
            setError(
              `We could not reach our server to confirm the payment. Do not pay again — ` +
              `quote payment ${response.razorpay_payment_id}.`,
            )
          } finally {
            busy.current = false
          }
        },
      })

      rzp.on('payment.failed', (resp) => {
        busy.current = false
        setStatus('error')
        // Razorpay's own description is written for the payer ("card declined",
        // "insufficient funds") and is more useful than anything generic.
        setError(resp?.error?.description || 'The payment did not go through. Nothing was charged.')
      })

      setStatus('open')
      rzp.open()
    } catch (e) {
      busy.current = false
      setStatus('error')
      setError(e?.message || GENERIC_ERROR)
    }
  }, [])

  const reset = useCallback(() => {
    busy.current = false
    setStatus('idle')
    setError(null)
  }, [])

  return { startCheckout, status, error, reset, busy: status === 'loading' || status === 'verifying' }
}

export default useRazorpay
