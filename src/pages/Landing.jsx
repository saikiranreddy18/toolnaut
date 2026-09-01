import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import HeroSection from '../components/sections/HeroSection'
import HowItWorksSection from '../components/sections/HowItWorksSection'
import RolesSection from '../components/sections/RolesSection'
import AudienceSection from '../components/sections/AudienceSection'
import PricingSection from '../components/sections/PricingSection'
import FeaturesSection from '../components/sections/FeaturesSection'
import StatsSection from '../components/sections/StatsSection'
import FounderRibbon from '../components/ui/FounderRibbon'
import CTASection from '../components/sections/CTASection'
import CometProgress from '../components/ui/CometProgress'
import GalaxyExplorer from '../components/ui/GalaxyExplorer'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import useSmoothScroll from '../hooks/useSmoothScroll'
import { BRAND } from '../config'
import { useAnalytics } from '../hooks/useAnalytics'
import { useSpaceAudio } from '../hooks/useSpaceAudio'
import { EVENTS } from '../utils/analyticsEvents'
import { galaxyState } from '../state/galaxyStore'
import { webglAvailable } from '../utils/webgl'

const Scene = lazy(() => import('../components/3d/Scene'))

// CSS-only fallback sky when WebGL is unavailable.
function StaticSky() {
  return (
    <div
      className="fixed inset-0 z-0"
      aria-hidden="true"
      style={{
        background:
          'radial-gradient(ellipse 60% 40% at 30% 20%, rgba(124,58,237,0.25), transparent), radial-gradient(ellipse 50% 40% at 75% 70%, rgba(6,182,212,0.18), transparent), #060609',
      }}
    />
  )
}

export default function Landing() {
  // Eases the position between wheel notches. The wheel was raw: each notch
  // jumped ~30px and decayed over five frames, which reads as stepping rather
  // than gliding. scroll-behavior:smooth never touched this — it only applies
  // to programmatic scrolls.
  useSmoothScroll()

  const [booted, setBooted] = useState(false)
  const [explore, setExplore] = useState(false)
  const track = useAnalytics()
  const audio = useSpaceAudio()
  const navigate = useNavigate()

  // The moon is off HERE and only here. It is a real setting (moonStore, with a
  // toggle in the theme picker) and it stays available on every other surface —
  // but on the landing hero its disc sits at the top right, right where the
  // nav, the BETA badge and the headline's upper corner already are. Three
  // competing focal points in one corner, and the moon loses: it is scenery,
  // and the headline is the reason the page exists.
  //
  // Marked on <html> rather than toggling the user's stored setting, so their
  // choice survives the visit and comes back intact on the next page.
  useEffect(() => {
    document.documentElement.setAttribute('data-page', 'landing')
    return () => document.documentElement.removeAttribute('data-page')
  }, [])

  const hasWebGL = useMemo(webglAvailable, [])
  // calm = accessibility (static scene); mobile keeps the LIVE galaxy at
  // phone-safe quality — this is a mobile-first launch, immersion included.
  const mode = useMemo(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'calm'
    return window.innerWidth < 768 ? 'mobile' : 'full'
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), mode === 'calm' ? 200 : 900)
    return () => clearTimeout(t)
  }, [mode])

  useEffect(() => {
    galaxyState.explore = explore
    document.body.style.overflow = explore ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [explore])

  function toggleExplore() {
    if (!explore) track(EVENTS.GALAXY_EXPLORE, {})
    setExplore((e) => !e)
  }

  function toggleSound() {
    track(EVENTS.SOUND_TOGGLE, { on: !audio.on })
    audio.toggle()
  }

  // QUIZ_START now fires on /quiz mount (single source of truth) —
  // HeroSection already tracks the CTA_CLICK.
  function openQuiz() {
    navigate('/goal')
  }

  return (
    <div className="relative min-h-screen">
      {hasWebGL ? (
        <Suspense fallback={<StaticSky />}>
          <Scene mode={mode} />
        </Suspense>
      ) : (
        <StaticSky />
      )}

      {/* boot: black screen -> galaxy fades in */}
      <AnimatePresence>
        {!booted && (
          <motion.div
            className="fixed inset-0 z-[90] bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          />
        )}
      </AnimatePresence>

      {/* The ribbon sits above the nav inside the same fixed header, so it
          travels with it instead of scrolling away — the countdown is only
          useful while it is visible. Hidden during galaxy exploration along
          with the rest of the chrome. */}
      <header className={`fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-[#060609]/90 via-[#060609]/50 to-transparent pb-3 transition-opacity duration-500 ${explore ? 'pointer-events-none opacity-0' : ''}`}>
        <FounderRibbon />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#hero" aria-label={BRAND}>
            <BrandLogo {...LOGO.page} />
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <Link to="/pricing" className="hover:text-white">Pricing</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/search" className="hover:text-white">Search</Link>
            <a href="#contact" className="hover:text-white">Contact</a>
            <Link
              to="/app/stack"
              onClick={() => track(EVENTS.CTA_CLICK, { cta: 'open_app', location: 'nav' })}
              className="nb-btn px-4 py-1.5 text-xs"
            >
              🚀 Open app
            </Link>
          </nav>
          {/* mobile: the app entry must exist on small screens too */}
          <Link
            to="/app/stack"
            onClick={() => track(EVENTS.CTA_CLICK, { cta: 'open_app', location: 'nav_mobile' })}
            className="nb-btn px-4 py-1.5 text-xs md:hidden"
          >
            🚀 Open app
          </Link>
        </div>
      </header>

      <main className={`transition-opacity duration-500 ${explore ? 'pointer-events-none opacity-0' : ''}`}>
        <HeroSection onEnter={openQuiz} />
        <StatsSection />
        <HowItWorksSection />
        <RolesSection />
        <AudienceSection />
        <FeaturesSection />
        <PricingSection />
        <CTASection />
      </main>

      {!explore && <CometProgress />}

      {/* singleton hover popup for AI-tool stars, positioned from the frame loop */}
      <div
        id="tool-tooltip"
        aria-hidden="true"
        className="pointer-events-none fixed z-[85] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border-2 border-black bg-[var(--lime)] px-4 py-1.5 font-display text-xs font-black uppercase italic tracking-wide text-black"
        style={{ opacity: 0, transition: 'opacity 0.15s ease', boxShadow: '3px 3px 0 #000' }}
      />

      {/* persistent scene controls: sound + galaxy exploration */}
      <div className="fixed bottom-6 left-6 z-[76] flex items-center gap-2">
        <button
          onClick={toggleSound}
          aria-pressed={audio.on}
          aria-label={audio.on ? 'Mute galaxy sound' : 'Play galaxy sound'}
          className="nb-btn dark flex h-11 w-11 items-center justify-center !rounded-full !p-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
            {audio.on ? (
              <>
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 6a9 9 0 0 1 0 12" />
              </>
            ) : (
              <path d="M16 9l5 6M21 9l-5 6" />
            )}
          </svg>
        </button>
        <button
          onClick={toggleExplore}
          className="nb-btn dark inline-flex items-center gap-1.5 px-5 py-2.5 text-xs tracking-[0.2em]"
        >
          {!explore && <span>+</span>}
          {explore ? 'Exit exploration' : 'Explore the galaxy'}
        </button>
      </div>

      <AnimatePresence>
        {explore && <GalaxyExplorer onClose={() => setExplore(false)} />}
      </AnimatePresence>
    </div>
  )
}
