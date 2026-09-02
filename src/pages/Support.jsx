import { Link } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { CONTACT_EMAIL } from '../config'

// Support and refunds.
//
// Razorpay expects a merchant to publish a reachable contact and a refund
// stance before processing live payments, and a buyer deciding on ₹29,999
// deserves to know what happens if it turns out not to be for them. Both live
// here rather than being buried in the terms.
//
// The address is info@toolnaut.xyz — the mailbox that actually exists on the
// Workspace account. The old hello@toolnaut.app was on a domain this project
// does not own, so every mail sent to it went nowhere.
export const SUPPORT_EMAIL = CONTACT_EMAIL
export const REFUND_WINDOW_DAYS = 7

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-black uppercase tracking-[0.12em]" style={{ color: 'var(--lime)' }}>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

const Mail = () => (
  <a
    href={`mailto:${SUPPORT_EMAIL}`}
    className="font-bold underline underline-offset-4"
    style={{ color: 'var(--cyan)' }}
  >
    {SUPPORT_EMAIL}
  </a>
)

export default function Support() {
  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-16 md:py-24">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-400 hover:text-white" aria-label="Back to Toolnaut">
          <span aria-hidden="true">←</span>
          <BrandLogo {...LOGO.compact} />
        </Link>

        <h1 className="arcade-heading mt-6 text-3xl md:text-4xl">SUPPORT &amp; REFUNDS</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          A real person reads this inbox. Write to <Mail /> and you will get an
          answer.
        </p>

        <Section title={`${REFUND_WINDOW_DAYS}-day money-back guarantee`}>
          <p>
            If Toolnaut is not what you needed, email <Mail /> within{' '}
            <strong className="text-white">{REFUND_WINDOW_DAYS} days</strong> of
            your payment and we refund it in full. No form, no exit interview,
            no reason required.
          </p>
          <p>
            Refunds go back to the card or account you paid from, through
            Razorpay. Their processing usually takes 5–7 working days once we
            approve it — that part is out of our hands.
          </p>
          <p className="text-slate-400">
            Your paid access ends when the refund is processed. Anything you
            built — your stack, saved tools, roadmap progress — stays on your
            account and is still there if you come back.
          </p>
        </Section>

        <Section title="After the first week">
          <p>
            Past {REFUND_WINDOW_DAYS} days we do not refund as a matter of
            course, but write anyway if something went wrong. A payment that was
            charged twice, a plan that never activated, or a feature that did
            not do what this site said it would are our mistakes, and we fix
            those whenever you find them.
          </p>
        </Section>

        <Section title="What you are buying">
          <p>
            Every plan is a <strong className="text-white">one-time payment</strong>.
            Nothing renews automatically, your card is never stored, and you are
            never charged a second time without going through checkout again.
          </p>
          <p>
            The 30-day plans end after 30 days unless you buy again. The Founder
            plan does not expire.
          </p>
        </Section>

        <Section title="Cancelling">
          <p>
            There is no subscription to cancel — nothing is recurring, so simply
            not buying again ends it. If you want your account and data deleted
            entirely, ask at <Mail /> and it will be done.
          </p>
        </Section>

        <Section title="Getting help">
          <p>
            Email <Mail /> with what happened and what you expected. If it is
            about a payment, include the date and the amount and we will find it
            from that.
          </p>
        </Section>

        <div className="mt-14 flex flex-wrap gap-5 border-t border-white/10 pt-6">
          <Link to="/terms" className="font-bold underline underline-offset-4" style={{ color: 'var(--lime)' }}>
            Terms of Service →
          </Link>
          <Link to="/privacy" className="font-bold underline underline-offset-4" style={{ color: 'var(--lime)' }}>
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  )
}
