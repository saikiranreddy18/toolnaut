import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Landing from './pages/Landing'
import OnboardingShell from './shells/OnboardingShell'
import ThemePicker from './components/ui/ThemePicker'
import CursorStars from './components/ui/CursorStars'
import { track, EVENTS } from './utils/analyticsEvents'

const Quiz = lazy(() => import('./pages/Quiz'))
const QuizResult = lazy(() => import('./pages/QuizResult'))
const Login = lazy(() => import('./pages/auth/Login'))
const AppShell = lazy(() => import('./shells/AppShell'))
const Stack = lazy(() => import('./pages/app/Stack'))
const Settings = lazy(() => import('./pages/app/Settings'))
const Discover = lazy(() => import('./pages/app/Discover'))
const ToolDetail = lazy(() => import('./pages/app/ToolDetail'))
const Learning = lazy(() => import('./pages/app/Learning'))
const Community = lazy(() => import('./pages/app/Community'))
const Thread = lazy(() => import('./pages/app/Thread'))
const NexusLanding = lazy(() => import('./pages/NexusLanding'))
const Office = lazy(() => import('./pages/Office'))
const About = lazy(() => import('./pages/About'))
const Pricing = lazy(() => import('./pages/Pricing'))

// Scroll + analytics on route change. initAnalytics() already fires the first
// page_view, so skip the initial render to avoid double counting. Hash links
// (e.g. /#pricing from the quiz result) scroll to their section after paint.
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
      requestAnimationFrame(() => {
        document.querySelector(location.hash)?.scrollIntoView()
      })
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
            <Route path="/starchart" element={<NexusLanding />} />
            <Route path="/office" element={<Office />} />
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />

            <Route element={<OnboardingShell />}>
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/quiz/result" element={<QuizResult />} />
              <Route path="/auth/login" element={<Login />} />
            </Route>

            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/stack" replace />} />
              <Route path="stack" element={<Stack />} />
              <Route path="discover" element={<Discover />} />
              <Route path="tools/:slug" element={<ToolDetail />} />
              <Route path="learning" element={<Learning />} />
              <Route path="community" element={<Community />} />
              <Route path="community/:id" element={<Thread />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Landing />} />
          </Routes>
        </MotionConfig>
      </Suspense>
    </BrowserRouter>
  )
}
