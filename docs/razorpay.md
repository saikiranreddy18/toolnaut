# Razorpay Standard Checkout

Test-mode integration. Nothing on the live pricing page points at it yet — see
[Going live](#going-live).

## Files

| File | Role |
|---|---|
| `api/_razorpay.js` | Shared: plan→amount, origin allow-list, rate limit, signature check. Underscore-prefixed so Vercel does not make it an endpoint. |
| `api/create-order.js` | `POST /api/create-order` — takes `{ planId }`, returns `{ order_id, amount, currency, plan, key_id }` |
| `api/verify-payment.js` | `POST /api/verify-payment` — takes the three `razorpay_*` fields, returns `{ verified }` |
| `src/hooks/useRazorpay.js` | Loads checkout.js on demand, opens the modal, verifies server-side |
| `src/components/app/PayButton.jsx` | Button + status/error states for one plan |
| `src/pages/Checkout.jsx` | `/checkout` — noindexed test harness |
| `test/razorpay.test.mjs` | Signature and pricing tests |

## The two decisions that matter

**The browser never sends an amount.** It sends a plan id; the server looks the
price up in `PLANS` (`src/utils/planData.js`), the same table the pricing page
renders from. If the client set the amount, anyone could pay ₹1 for the Team
plan — and signature verification would still pass, because a signature proves
the payment matches the order, not that the order was for the right amount.

**A valid signature is not proof of payment.** `verify-payment` re-fetches the
payment and the order from Razorpay and checks status, amount, currency and
order linkage. The browser's callback is a claim to be checked.

## Environment

Server-only — neither has a `VITE_` prefix, and the secret must never get one:

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

`.env` is gitignored (`.env*` with an `.env.example` exception). The browser
receives `key_id` from `/api/create-order` at checkout time, so it is never
baked into the bundle.

With the variables unset, `/api/create-order` returns **503** and the UI shows
"Payments are not available right now." That is the intended default for any
deployment without keys.

## Testing locally

```bash
npm run build && npx vercel dev
```

Then open `/checkout`. Card `4111 1111 1111 1111`, any future expiry, any CVV.
Test-mode UPI succeeds on `success@razorpay`.

`vercel dev` is needed because `vite dev` does not run the `api/` functions.

Note the origin allow-list accepts `localhost:5173` and `127.0.0.1:5173` only.
Serving the app on another port returns **403** from both endpoints — that is
the guard working, not a bug.

## Going live

Not automatic. All of this is deliberate:

1. Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to Vercel (Production), using
   **live** keys rather than the `rzp_test_` pair.
2. Point the pricing CTAs at `PayButton`.
3. **Update the three places that currently promise no payment is taken** —
   `ContactSection.jsx` ("Free public beta — no card, no payment taken"),
   `Methodology.jsx` ("does not currently take payment of any kind"), and the
   pricing copy. Taking money while those claims stand would make the product
   contradict itself.
4. Decide what a payment grants. Right now `onPaid` deliberately grants nothing:
   there is no orders table, and writing "paid" into localStorage would be a
   purchase claim anyone could forge by editing devtools.

## Still missing for real money

**A webhook.** `verify-payment` only runs if the visitor's browser survives the
redirect. If they close the tab after paying, nothing records it. Razorpay's
`payment.captured` webhook arrives server-to-server and is the only reliable
record. It needs somewhere to write to, which means the Supabase migrations
(`0001`→`0003`) have to be applied first.

**Idempotency.** With an orders table, verification must be safe to run twice —
the same payment id arriving from both the browser and the webhook must not be
credited twice.

## Permissions-Policy

`vercel.json` previously sent `payment=()`, which disables the Payment Request
API site-wide and breaks Razorpay's card and wallet flows. It now allows `self`
plus the two Razorpay origins. Narrowing that header again will silently break
checkout.
