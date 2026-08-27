import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Landing from './pages/Landing'
import OnboardingShell from './shells/OnboardingShell'
import ThemePicker from './components/ui/ThemePicker'
import CursorStars from './components/ui/CursorStars'
import { track, EVENTS } from './utils/analyticsEvents'

const GoalChat = lazy(() => import('./pages/GoalChat'))
const QuizResult = lazy(() => import('./pages/QuizResult'))
const Login = lazy(() => import('./pages/auth/Login'))
const AppShell = lazy(() => import('./shells/AppShell'))
const Stack = lazy(() => import('./pages/app/Stack'))
const Settings = lazy(() => import('./pages/app/Settings'))
const Discover = lazy(() => import('./pages/app/Discover'))
const Favorites = lazy(() => import('./pages/app/Favorites'))
const Compare = lazy(() => import('./pages/app/Compare'))
const ToolDetail = lazy(() => import('./pages/app/ToolDetail'))
const Learning = lazy(() => import('./pages/app/Learning'))
const Community = lazy(() => import('./pages/app/Community'))
const Thread = lazy(() => import('./pages/app/Thread'))
const Office = lazy(() => import('./pages/Office'))
const About = lazy(() => import('./pages/About'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Legal = lazy(() => import('./pages/Legal'))
const SharedStack = lazy(() => import('./pages/SharedStack'))
const CategoryLanding = lazy(() => import('./pages/CategoryLanding'))

// Scroll + analytics on route change. initAnalytics() already fires the first
// page_view, so skip the initial render to avoid double counting. Hash links
// scroll to their section after paint; an invalid selector (e.g. a pasted
// hash-router URL) falls back to a plain scroll-to-top instead of throwing.
function RouteEffects() {
  const location = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
    } else {
      track(EVENTS.PAGE_VIEW, { path: location.pathname })
    }

    if (location.hash) {
      const handle = requestAnimationFrame(() => {
        try {
          document.querySelector(location.hash)?.scrollIntoView()
        } catch {
          window.scrollTo(0, 0)
        }
      })
      return () => cancelAnimationFrame(handle)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.hash])

  return null
}

function PageFallback() {
  return <div className="fixed inset-0 bg-[#060609]" aria-hidden="true" />
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <CursorStars />
      <ThemePicker />
      <Suspense fallback={<PageFallback />}>
        <MotionConfig reducedMotion="user">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/office" element={<Office />} />
            <Route path="/about" element={<About />} />
            {/* Google requires both before an OAuth app can go to production,
                and both previously resolved only via the SPA catch-all — which
                served the landing page to anyone who clicked them. */}
            <Route path="/privacy" element={<Legal />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/s/:slugs" element={<SharedStack />} />
            <Route path="/tools/:domain" element={<CategoryLanding />} />

            <Route element={<OnboardingShell />}>
              <Route path="/goal" element={<GoalChat />} />
              {/* the form-based quiz was replaced by the conversation; links,
                  bookmarks and old analytics all still point at /quiz */}
              <Route path="/quiz" element={<Navigate to="/goal" replace />} />
              <Route path="/quiz/result" element={<QuizResult />} />
              <Route path="/auth/login" element={<Login />} />
            </Route>

            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/stack" replace />} />
              <Route path="stack" element={<Stack />} />
              <Route path="discover" element={<Discover />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="compare" element={<Compare />} />
              <Route path="tools/:slug" element={<ToolDetail />} />
              <Route path="learning" element={<Learning />} />
              <Route path="community" element={<Community />} />
              <Route path="community/:id" element={<Thread />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* /starchart was a second landing page. The catch-all would render
                Landing at that stale URL, which reads as duplicate content to a
                crawler; redirecting corrects the address bar and the bookmark. */}
            <Route path="/starchart" element={<Navigate to="/" replace />} />

            <Route path="*" element={<Landing />} />
          </Routes>
        </MotionConfig>
      </Suspense>
    </BrowserRouter>
  )
}
