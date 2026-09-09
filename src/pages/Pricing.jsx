import { Link } from 'react-router-dom'
import PricingSection from '../components/sections/PricingSection'
import { useHead } from '../utils/head'
import CapabilityMatrix from '../components/sections/CapabilityMatrix'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { BRAND } from '../config'
import { useEffect } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'
import { EVENTS } from '../utils/analyticsEvents'

// Standalone pricing page — reuses the same pillars/comparison section that
// is also mounted on the landing page. All plans are reservations while in
// beta; CapabilityMatrix below is the corroborating live/planned breakdown.
export default function Pricing() {
  // DRIVEN BY THE PAYMENT SWITCH — same flag ContactSection.jsx's footer,
  // Methodology.jsx and CapabilityMatrix.jsx already read. See docs/razorpay.md.
  const paymentsOn = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
  useHead({
    title: 'Pricing — Toolnaut',
    description: paymentsOn
      ? 'Toolnaut paid plans are now live. See what each tier covers, and what stays free.'
      : 'Toolnaut is free while it is in public beta. See what a paid tier will cover, and what stays free.',
    path: '/pricing',
    // The questions someone actually asks an answer engine about a paid
    // product — does it renew, can I get a refund, is there a free option.
    // Every answer here is checked against how the system really behaves:
    // nothing recurs, the trial is 7 days, refunds are 7 days. Schema that
    // over-promises is worse than none, because it gets quoted verbatim.
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Toolnaut free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'New accounts get 7 days of full access free, with no card required. After that a '
              + 'one-time 30-day pass starts at Rs 299.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does a Toolnaut plan renew automatically?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Every plan is a one-time payment. Nothing auto-renews, your card is never '
              + 'stored, and you are never charged again without going through checkout. A 30-day '
              + 'plan simply ends unless you buy again.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does Toolnaut cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Student is Rs 299, Pro is Rs 799 and Team is Rs 4,999, each for 30 days. A '
              + 'Founder plan is Rs 29,999 paid once and never expires. All plans are charged in '
              + 'Indian Rupees worldwide.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I get a refund?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Email info@toolnaut.xyz within 7 days of payment and it is refunded in full, '
              + 'no reason required.',
          },
        },
      ],
    },
  })
  const track = useAnalytics()
  // Purchase intent. Without it there is no way to tell whether people who
  // never upgrade even reached the pricing page.
  useEffect(() => { track(EVENTS.PRICING_VIEWED) }, [])

  return (
    <div className="relative z-10 min-h-screen bg-[#0a0a0f]">
      <div className="starfield" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" aria-label={BRAND}>
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          ⚡ Find your stack
        </Link>
      </header>

      <div className="relative mx-auto max-w-6xl px-1 pb-6 pt-2 text-center">
        <span className="tape-label text-xs">
          {paymentsOn ? '✦ paid plans are live ✦' : '✦ beta is free — plans open at launch ✦'}
        </span>
      </div>

      <PricingSection titleAs="h1" />

      <CapabilityMatrix />

      <p className="relative pb-16 text-center text-xs text-slate-500">
        <Link to="/" className="underline underline-offset-2 hover:text-white">← Back home</Link>
      </p>
    </div>
  )
}
