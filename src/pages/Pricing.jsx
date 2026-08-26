import { Link } from 'react-router-dom'
import PricingSection from '../components/sections/PricingSection'
import { BrandLogo } from '../components/ui/Mascot'
import { BRAND } from '../config'

// Standalone pricing page — reuses the pillars/comparison section that was
// removed from the landing flow. All plans are reservations while in beta.
export default function Pricing() {
  return (
    <div className="relative z-10 min-h-screen bg-[#0a0a0f]">
      <div className="starfield" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" aria-label={BRAND}>
          <BrandLogo size={44} textClass="text-xl" />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          ⚡ Find your stack
        </Link>
      </header>

      <div className="relative mx-auto max-w-6xl px-1 pb-6 pt-2 text-center">
        <span className="tape-label text-xs">✦ beta is free — plans open at launch ✦</span>
      </div>

      <PricingSection />

      <p className="relative pb-16 text-center text-xs text-slate-500">
        <Link to="/" className="underline underline-offset-2 hover:text-white">← Back home</Link>
      </p>
    </div>
  )
}
