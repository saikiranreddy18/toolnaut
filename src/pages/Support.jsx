import { Link } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { useHead, SITE } from '../utils/head'
import { CONTACT_EMAIL } from '../config'

// Payment and access support, and the refund policy.
//
// A product that takes money needs a visible way to reach a human and a written
// statement of what happens when someone wants their money back. Toolnaut had
// neither: refunds could only be issued from the Razorpay dashboard, and nobody
// outside this repository knew that.
//
// EVERYTHING HERE IS DELIBERATELY MODEST. The policy promises manual review by
// one person and no response-time SLA, because that is what a solo beta can
// actually deliver. A published promise that cannot be kept is worse than a
// smaller promise that can — the same rule that turned the pricing copy from
// "monthly" into "one-time, 30 days".

const mailto = (subject) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`

export default function Support() {
  useHead({
    title: 'Support, billing and refunds — Toolnaut',
    description:
      'How to get help with a Toolnaut payment, pass or account, what to include in your message, and the refund policy for the Founding Pass and 30-day plans.',
    path: '/support',
  })

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:py-16">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/pricing" className="nb-btn px-4 py-2 text-xs">See the plans</Link>
      </header>

      <p className="font-display text-xs font-black uppercase tracking-[0.2em] text-exus-lime">
        ▸ SUPPORT
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        BILLING, ACCESS AND REFUNDS
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        Toolnaut is a small beta run by one person. Everything below is what can
        genuinely be delivered today — no ticket queue, no bot, no promised
        response time that would be broken the first busy week.
      </p>

      {/* ── contact ─────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="arcade-heading section text-xl sm:text-2xl">GETTING HELP</h2>
        <div className="sticker mt-4 p-5">
          <p className="text-sm leading-relaxed text-slate-300">
            Email <a href={mailto('Toolnaut support')} className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>{CONTACT_EMAIL}</a>.
            Every message is read by a person. During the beta that person is one
            person, so allow a few working days.
          </p>
          <p className="mt-4 font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Include these and it will be sorted much faster
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
            <li>• The email address you signed in with</li>
            <li>• Roughly when you paid</li>
            <li>• The payment id, if you have it — it starts with <code className="rounded bg-white/10 px-1">pay_</code> and is on your Razorpay receipt and in ME → Billing</li>
          </ul>
        </div>
      </section>

      {/* ── paid but locked out ─────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="arcade-heading section text-xl sm:text-2xl">PAID BUT STILL LOCKED OUT?</h2>
        <div className="sticker mt-4 p-5">
          <p className="text-sm font-bold" style={{ color: 'var(--hot-pink)' }}>
            Do not pay again.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            A second payment does not unlock anything faster and creates a second
            charge to refund. If the money left your account, the payment exists
            and can be found.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Sign out and back in first — access is confirmed with the server when
            you sign in, and that alone fixes most cases. If it is still locked,
            email us with the payment id and it will be switched on by hand.
          </p>
          <a href={mailto('Toolnaut — paid but no access')} className="nb-btn mt-4 inline-block min-h-11 px-5 py-2.5 text-xs">
            EMAIL ABOUT ACCESS →
          </a>
        </div>
      </section>

      {/* ── refunds ─────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="arcade-heading section text-xl sm:text-2xl">REFUND POLICY</h2>
        <div className="sticker mt-4 p-5">
          <p className="text-sm leading-relaxed text-slate-300">
            Ask within <b className="text-white">7 days</b> of paying and a refund
            will be considered. Every request is reviewed by hand during the beta.
          </p>

          <p className="mt-5 font-display text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--lime)' }}>
            Refunded in these cases
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
            <li>• Access could not be activated after your payment</li>
            <li>• You were charged twice for the same thing</li>
            <li>• A fault on our side stopped you using what you paid for</li>
            <li>• You bought it by accident and have not really used it yet</li>
          </ul>

          <p className="mt-5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Not usually refunded
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
            <li>• More than 7 days after paying</li>
            <li>• A pass that has been substantially used</li>
            <li>• Simply changing your mind about the recommendations</li>
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-slate-400">
            Refunds are returned to the card or account you paid from, by
            Razorpay. Their side usually takes 5–7 working days after it is
            approved, and that part is not something we control. When a refund
            completes, the access it paid for ends.
          </p>

          <a href={mailto('Toolnaut — refund request')} className="nb-btn mt-4 inline-block min-h-11 px-5 py-2.5 text-xs">
            REQUEST A REFUND →
          </a>
        </div>
      </section>

      {/* ── what you actually bought ───────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="arcade-heading section text-xl sm:text-2xl">WHAT YOU BOUGHT</h2>
        <div className="sticker mt-4 p-5">
          <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
            <li>• Every plan is a <b className="text-white">one-time payment</b>. Nothing auto-renews.</li>
            <li>• Your card is never stored by Toolnaut and is never charged again.</li>
            <li>• A 30-day plan ends after 30 days unless you choose to buy another.</li>
            <li>• The Founder pass runs for 10 years.</li>
            <li>• There is no subscription to cancel, because none is created.</li>
            <li>• Your end date is always shown in <Link to="/app/settings" className="underline underline-offset-4" style={{ color: 'var(--cyan)' }}>ME → Billing</Link>.</li>
          </ul>
        </div>
      </section>

      <p className="mt-10 text-xs text-slate-500">
        See also <Link to="/terms" className="underline underline-offset-4">Terms</Link> and{' '}
        <Link to="/privacy" className="underline underline-offset-4">Privacy</Link>.
      </p>
    </div>
  )
}
