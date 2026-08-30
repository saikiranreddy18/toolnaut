import { Link, useLocation } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { BRAND } from '../config'
import Wordmark from '../components/ui/Wordmark'

// Privacy policy and terms, rendered from one component because they share a
// layout and differ only in body.
//
// Google requires both before an OAuth app can be published to production, and
// it checks that the URLs resolve. Until now /privacy and /terms returned HTTP
// 200 purely because the SPA rewrite serves index.html for any path — so both
// "worked" while actually rendering the landing page to anyone who clicked them.
//
// Written from what the app verifiably does, not from a template. Every claim
// below was checked against the code: the localStorage keys are the real ones,
// analytics genuinely is not collecting (no measurement ID is configured), and
// the only third parties that receive anything are the three named.
//
// NOT LEGAL ADVICE. This is an honest description of the product's behaviour,
// which is the part a template gets wrong. Have someone qualified read it before
// relying on it commercially.

const UPDATED = '27 August 2026'

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

function Privacy() {
  return (
    <>
      <Section title="The short version">
        <p>
          {BRAND} has no user database for anything except sign-in. Your quiz answers,
          your stack, your roadmap progress, your streak and your saved tools are stored
          in <strong className="text-white">your own browser</strong>, not on our servers.
          Clearing your browser data deletes them permanently, and they do not follow you
          to another device.
        </p>
        <p>We do not sell data. We do not run advertising. There are no third-party trackers.</p>
      </Section>

      <Section title="What stays in your browser">
        <p>
          Stored in localStorage on your device: your intake answers and anything you
          typed in your own words, your persona and recommended stack, tools you have
          added or favourited, roadmap progress, your day streak, community drafts, and
          your display preferences such as theme and moonlight.
        </p>
        <p>None of it is transmitted to us. We cannot read it, recover it, or delete it for you.</p>
      </Section>

      <Section title="What we receive when you sign in">
        <p>
          Sign-in is handled by Supabase using Google or GitHub. If you sign in, we
          receive your <strong className="text-white">email address, display name and
          profile picture</strong> from that provider, and Supabase stores them so the
          account exists on your next visit. We never see or store your password — there
          isn't one.
        </p>
        <p>You can ask us to delete your account and everything attached to it at any time.</p>
      </Section>

      <Section title="Third parties">
        <p>
          <strong className="text-white">Supabase</strong> — authentication and account
          storage. Receives your email, name and avatar when you sign in.
        </p>
        <p>
          <strong className="text-white">Featherless AI</strong> — powers the assistant in
          the intake conversation. When you type an answer in your own words, that sentence
          and the question it answers are sent to be interpreted. Nothing identifying is
          attached: no name, no email, no account id. If you only tap the suggested options,
          nothing is sent at all.
        </p>
        <p>
          <strong className="text-white">Vercel</strong> — hosts the site and, like any web
          host, processes standard request logs including IP address.
        </p>
      </Section>

      <Section title="Analytics">
        <p>
          The app contains analytics code, but{' '}
          <strong className="text-white">it is not currently collecting anything</strong> —
          no measurement ID is configured, so no events are sent and no analytics cookies
          are set. If that changes we will update this page and say so plainly rather than
          quietly switching it on.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          No advertising or tracking cookies. Signing in sets a session token so you stay
          signed in; that is the only cookie-like storage that is not a preference you set
          yourself.
        </p>
      </Section>

      <Section title="Children">
        <p>{BRAND} is not directed at children under 13 and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, or a request to delete your account:{' '}
          <a href="mailto:hello@toolnaut.app" className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>
            hello@toolnaut.app
          </a>
        </p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <Section title="What this is">
        <p>
          {BRAND} recommends AI tools based on answers you give about your role, budget and
          how you work, and generates a learning roadmap around them. It is free to use and
          currently in beta.
        </p>
      </Section>

      <Section title="Recommendations are opinions">
        <p>
          Our suggestions are generated from a catalogue and a scoring model. They are not
          professional, financial or career advice, and we make no promise that a
          recommended tool will suit you, remain available, keep its pricing, or continue
          to exist. Check anything that matters before you rely on it.
        </p>
        <p>
          Tool details in the catalogue come from public sources and automated discovery.
          They can be out of date or wrong.
        </p>
      </Section>

      <Section title="Beta software">
        <p>
          Features may change or disappear. Because your progress is stored in your own
          browser rather than on our servers, clearing browser data will delete it and{' '}
          <strong className="text-white">we cannot recover it</strong>. Treat anything you
          build here as impermanent for now.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          Do not use {BRAND} to break the law, to abuse or harass anyone, or to attack the
          service. We may suspend accounts that do.
        </p>
      </Section>

      <Section title="Other people's tools">
        <p>
          We link to third-party AI tools. We do not operate them and are not responsible
          for them. Their own terms and pricing apply, and names and trademarks belong to
          their owners.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          {BRAND} is provided as-is, without warranties. To the extent the law allows, we
          are not liable for losses arising from using it, including anything lost through
          browser storage being cleared.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms. Continuing to use {BRAND} after a change means you
          accept it.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          <a href="mailto:hello@toolnaut.app" className="font-bold underline underline-offset-4" style={{ color: 'var(--cyan)' }}>
            hello@toolnaut.app
          </a>
        </p>
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
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-400 hover:text-white" aria-label="Back to Toolnaut">
          <span aria-hidden="true">←</span>
          <BrandLogo {...LOGO.compact} />
        </Link>

        <h1 className="arcade-heading mt-6 text-3xl md:text-4xl">
          {isPrivacy ? 'PRIVACY POLICY' : 'TERMS OF SERVICE'}
        </h1>
        <p className="mt-3 font-mono text-xs text-slate-500">Last updated {UPDATED}</p>

        {isPrivacy ? <Privacy /> : <Terms />}

        <div className="mt-14 border-t border-white/10 pt-6">
          <Link
            to={isPrivacy ? '/terms' : '/privacy'}
            className="font-bold underline underline-offset-4"
            style={{ color: 'var(--lime)' }}
          >
            {isPrivacy ? 'Terms of Service' : 'Privacy Policy'} →
          </Link>
        </div>
      </div>
    </div>
  )
}
