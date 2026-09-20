import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'

// Shown once, on every route, whenever GA4 is configured and the visitor
// hasn't chosen yet (App.jsx only mounts this when that's true). Mirrors
// InstallPrompt.jsx's fixed-bar shape and positioning, but drops its
// Escape-to-dismiss: a consent prompt has no neutral "close" — every exit
// has to be Accept or Decline, so nothing here hides it silently.
export default function ConsentBanner({ onAccept, onDecline }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="sticker fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] flex flex-col gap-3 p-4 sm:flex-row sm:items-center lg:inset-x-auto lg:right-6 lg:max-w-md"
        style={{ transform: 'none' }}
        role="dialog"
        aria-label="Cookie consent"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-white">We use analytics cookies</p>
          <p className="mt-0.5 text-xs leading-snug text-zinc-400">
            Google Analytics helps us see which pages and features people use. Nothing loads until you accept —
            see{' '}
            <Link to="/privacy#analytics" className="underline hover:text-white">
              what it collects
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onDecline}
            className="press rounded-full px-4 py-2 text-xs text-zinc-400 hover:text-white"
          >
            Decline
          </button>
          <button onClick={onAccept} className="nb-btn shrink-0 px-4 py-2 text-xs">
            Accept
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
