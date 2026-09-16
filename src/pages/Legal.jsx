import { Link, useLocation } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { BRAND, CONTACT_EMAIL } from '../config'
import { REFUND_WINDOW_DAYS } from './Support'

// Privacy policy and terms, rendered from one component because they share a
// layout and differ only in body.
//
// Google requires both before an OAuth app can be published to production, and
// Razorpay expects a merchant to publish them too.
//
// WRITTEN FROM WHAT THE CODE DOES, AND REWRITTEN WHEN THAT CHANGED
// The previous version described a free, browser-only beta with Google or
// GitHub sign-in and no server storage. By September 2026 none of that was
// true: signed-in stacks and progress sync to Supabase, plans are sold through
// Razorpay, alert and account-deletion emails go out through Resend, crash
// reports go to Sentry, and GitHub sign-in is not offered. A policy that
// describes a product which no longer exists is worse than a short one, because
// people rely on it. Each section below was checked against the code on the
// date in UPDATED — re-check whenever a new third party or table is added.
//
// NOT LEGAL ADVICE. This is an honest description of the product's behaviour,
// which is the part a template gets wrong. Have someone qualified read it before
// relying on it commercially.

const UPDATED = '13 September 2026'

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--lime)' }}>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  )
}

const Strong = ({ children }) => <strong className="text-white">{children}</strong>

function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>
      {CONTACT_EMAIL}
    </a>
  )
}

function Privacy() {
  return (
    <>
      <Section title="The short version">
        <p>
          We keep what we need to run your account and nothing to sell. If you use {BRAND} without
          signing in, your answers, stack and progress stay in <Strong>your own browser</Strong>. If
          you sign in, we store your account and a copy of your stack and progress so they follow you
          to other devices. If you buy a plan, we keep a record of the payment.
        </p>
        <p>We do not sell data. We do not run advertising. We do not use advertising trackers.</p>
      </Section>

      <Section title="If you do not sign in">
        <p>
          Everything is stored in your browser's local storage: your intake answers, your persona and
          recommended stack, tools you save, roadmap progress, your day streak, community posts and
          drafts, and display preferences such as theme and sky. None of it is sent to us, and clearing
          your browser data deletes it permanently.
        </p>
      </Section>

      <Section title="If you sign in">
        <p>
          Sign-in is handled by <Strong>Supabase</Strong>, with Google or a one-time link sent to your
          email. We receive your <Strong>email address, display name and profile picture</Strong>.
          There is no password to store.
        </p>
        <p>
          While you are signed in, we also store on our servers: your intake answers and whether you
          finished the intake, your chosen avatar, the tools in your stack and your saved tools, and
          which roadmap steps you have completed. This is what lets your progress follow you to another
          device. Community posts, your streak and display preferences stay in your browser only.
        </p>
      </Section>

      <Section title="If you buy a plan">
        <p>
          Payments are processed by <Strong>Razorpay</Strong>. We never see or store your card number,
          UPI PIN or bank login. We keep a record of each payment: the plan, the amount, its status, the
          dates, and Razorpay's order and payment reference numbers. Razorpay also sends us payment
          notifications, which can include the email address, phone number and payment method used; we
          keep these so payments and refunds can be reconciled.
        </p>
      </Section>

      <Section title="Emails we send">
        <p>
          <Strong>New-tool alerts</Strong> are off until you turn them on in Settings. When they are on,
          we store your email address and the categories you chose. Every alert has an unsubscribe link.
        </p>
        <p>
          <Strong>Account deletion codes</Strong> are sent to your account's email when you ask to delete
          your account. We store only a scrambled form of the code, never the code itself, and it expires
          after 10 minutes.
        </p>
      </Section>

      <Section title="Other services that receive data">
        <p>
          <Strong>Supabase</Strong> stores your account and synced data. <Strong>Razorpay</Strong> processes
          payments. <Strong>Resend</Strong> delivers our emails.
        </p>
        <p>
          <Strong>Featherless AI</Strong> powers the assistant. When you type an answer in your own words
          during the intake, or send a message to the in-app assistant, that text is sent to be answered.
          Your name, email and account id are not attached.
        </p>
        <p>
          <Strong>Google Analytics</Strong> receives anonymous product-usage events, such as which pages
          you view, which buttons you press, and milestones like finishing the intake. It does not receive
          your name, email, account id or anything you type.
        </p>
        <p>
          <Strong>Sentry</Strong> receives a technical report when a page crashes, describing the error and
          the page it happened on, so we can fix it. Reports are configured not to include your IP address,
          name or email.
        </p>
        <p>
          <Strong>Vercel</Strong> hosts the site and, like any web host, processes standard request logs,
          including IP addresses.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          You can delete your account yourself: <Strong>Settings → Delete account</Strong>. We email a code
          to confirm it is you, then permanently erase your account, profile, intake answers, stack, saved
          tools, roadmap progress, alert settings and sign-in.
        </p>
        <p>
          Payment records are the one exception. Indian tax law requires businesses to keep transaction
          records, and refunds and disputes must still be traceable, so we keep them after deletion with
          your name, email, phone number and payment-method details removed.
        </p>
        <p>If you never signed in, clearing your browser data removes everything.</p>
      </Section>

      <Section title="Cookies">
        <p>
          No advertising cookies. Google Analytics sets its own first-party cookies to recognise repeat
          visits, and signing in stores a session token so you stay signed in. Neither is used to advertise
          to you.
        </p>
      </Section>

      <Section title="Children">
        <p>{BRAND} is not directed at children under 13, and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about your data, or a request we can help with: <Mail /></p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <Section title="What this is">
        <p>
          {BRAND} recommends AI tools based on answers you give about your role, experience, budget and
          goals, and builds a learning roadmap around them.
        </p>
      </Section>

      <Section title="Trial and plans">
        <p>
          New accounts get <Strong>7 days of full access free</Strong>, with no card required. After that,
          access needs a paid plan. Current plans and prices are on the{' '}
          <Link to="/pricing" className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>pricing page</Link>.
        </p>
        <p>
          Every plan is a <Strong>one-time payment</Strong>, charged in Indian Rupees through Razorpay. A
          30-day plan gives 30 days of access and then ends. <Strong>Nothing renews automatically</Strong>:
          we do not store your card, and you are never charged again unless you go through checkout again.
          A plan described as never expiring does not expire.
        </p>
      </Section>

      <Section title="Refunds">
        <p>
          Email <Mail /> within <Strong>{REFUND_WINDOW_DAYS} days</Strong> of paying and we refund the full
          amount, no reason needed. Details are on the{' '}
          <Link to="/support" className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>support page</Link>.
        </p>
      </Section>

      <Section title="Recommendations are opinions">
        <p>
          Our suggestions are generated from a catalogue and a scoring model. They are not professional,
          financial or career advice, and we make no promise that a recommended tool will suit you, remain
          available, keep its pricing, or continue to exist. Check anything that matters before relying on it.
        </p>
        <p>
          Tool details come from public sources and automated discovery, and can be out of date or wrong.
        </p>
      </Section>

      <Section title="Your data and progress">
        <p>
          If you use {BRAND} without signing in, your progress lives only in your browser, and clearing
          browser data deletes it — we cannot recover it. Signing in keeps a copy on our servers. Our{' '}
          <Link to="/privacy" className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>privacy policy</Link>{' '}
          explains what is stored.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          Do not use {BRAND} to break the law, to abuse or harass anyone, or to attack the service. We may
          suspend accounts that do. You can delete your account at any time from Settings.
        </p>
      </Section>

      <Section title="Other people's tools">
        <p>
          We link to third-party AI tools. We do not operate them and are not responsible for them. Their
          own terms and pricing apply, and their names and trademarks belong to their owners.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          {BRAND} is provided as-is, without warranties. To the extent the law allows, we are not liable for
          losses arising from using it, including anything lost through browser storage being cleared.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms, and the date at the top changes when we do. Continuing to use {BRAND}
          after a change means you accept it.
        </p>
      </Section>

      <Section title="Contact">
        <p><Mail /></p>
      </Section>
    </>
  )
}

export default function Legal() {
  const { pathname } = useLocation()
  const isPrivacy = pathname.startsWith('/privacy')

  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-16 md:py-24">
        <Link to="/" className="inline-flex items-center gap-2.5 text-zinc-400 hover:text-white" aria-label="Back to Toolnaut">
          <span aria-hidden="true">←</span>
          <BrandLogo {...LOGO.page} />
        </Link>

        <h1 className="arcade-heading mt-6 text-3xl md:text-4xl">
          {isPrivacy ? 'Privacy policy' : 'Terms of service'}
        </h1>
        <p className="mt-3 font-mono text-xs text-zinc-500">Last updated {UPDATED}</p>

        {isPrivacy ? <Privacy /> : <Terms />}

        <footer className="mt-14 border-t border-white/10 pt-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Legal">
            <Link to={isPrivacy ? '/terms' : '/privacy'} className="font-bold underline underline-offset-4" style={{ color: 'var(--lime)' }}>
              {isPrivacy ? 'Terms of Service' : 'Privacy Policy'} →
            </Link>
            <Link to="/support" className="font-bold text-zinc-400 underline underline-offset-4 hover:text-white">
              Support &amp; refunds
            </Link>
          </nav>
          <p className="mt-6 text-xs text-zinc-500">
            © {new Date().getFullYear()} {BRAND}. All rights reserved. Tool names and trademarks belong to their owners.
          </p>
        </footer>
      </div>
    </div>
  )
}
