import { Link, Outlet } from 'react-router-dom'
import { BRAND } from '../config'

// Shell for /quiz and /quiz/result (and later /auth/*): dimmed nebula ambience,
// CSS-only — the WebGL galaxy lives on the landing page and never mounts here.
export default function OnboardingShell() {
  return (
    <div className="relative min-h-screen">
      <div className="starfield" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-sm font-bold tracking-[0.35em] text-white">
            {BRAND}
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
