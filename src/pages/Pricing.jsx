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
  useHead({
    title: 'Pricing — Toolnaut',
    description: 'Toolnaut is free while it is in public beta. See what a paid tier will cover, and what stays free.',
    path: '/pricing',
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
        <span className="tape-label text-xs">✦ beta is free — plans open at launch ✦</span>
      </div>

      <PricingSection titleAs="h1" />

      <CapabilityMatrix />

      <p className="relative pb-16 text-center text-xs text-slate-500">
        <Link to="/" className="underline underline-offset-2 hover:text-white">← Back home</Link>
      </p>
    </div>
  )
}
