import { Link, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import FlowSteps from '../components/onboarding/FlowSteps'

// Shell for /quiz and /quiz/result (and later /auth/*): dimmed nebula ambience,
// CSS-only — the WebGL galaxy lives on the landing page and never mounts here.
export default function OnboardingShell() {
  // /goal puts the mark in the centre of its own opening block, so the corner
  // copy is suppressed there. Two of the same logo on one screen reads as a
  // rendering fault, not as branding.
  const { pathname } = useLocation()
  const ownsItsMark = pathname.startsWith('/goal')

  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true" />

      {!ownsItsMark && (
        <header className="fixed inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link to="/" aria-label="Toolnaut home">
              <BrandLogo {...LOGO.chrome} />
            </Link>
          </div>
        </header>
      )}

      {/* The four-step path from quiz to app, so every onboarding screen says
          where you are and what comes next. */}
      <div className={`relative z-20 ${ownsItsMark ? 'pt-4' : 'pt-20'}`}>
        <FlowSteps />
      </div>

      <main id="main-content" tabIndex={-1} className="relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
