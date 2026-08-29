import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { pendingImport, adoptGuestData, discardGuestData } from '../../state/scopedStorage'
import { haptic } from '../../utils/haptics'

// Offered once, the first time an account signs in on a browser that already
// has guest data and has nothing of its own yet.
//
// Why this has to exist: storage is now scoped per account, so without it a
// guest who builds a stack and THEN signs in would watch the whole thing
// vanish — the exact failure that makes people distrust a sign-up. And the
// alternative, silently adopting whatever is in the browser, is wrong the
// other way: on a shared laptop it hands one person's stack to another.
//
// So: ask, say precisely what was found, and make declining safe.
export default function GuestImportPrompt() {
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFound(pendingImport())
  }, [])

  if (!found) return null

  const bits = [
    found.tools && `${found.tools} tool${found.tools === 1 ? '' : 's'} in your stack`,
    found.saved && `${found.saved} saved`,
    found.steps && `${found.steps} roadmap step${found.steps === 1 ? '' : 's'}`,
    found.quiz && 'your persona',
  ].filter(Boolean)

  function keep() {
    haptic.success()
    setBusy(true)
    adoptGuestData()
    // Full reload rather than a state nudge: every store read its data at mount
    // under the old key, so the cheapest correct way to show the imported data
    // is to let the app read it again from the top.
    window.location.reload()
  }

  function fresh() {
    haptic.tap()
    setBusy(true)
    discardGuestData()
    window.location.reload()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <motion.div
          initial={{ y: 24, scale: 0.97 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md rounded-2xl border-[3px] border-black bg-[#12121c] p-6"
          style={{ boxShadow: '6px 6px 0 #000' }}
        >
          <h2 id="import-title" className="arcade-heading section text-xl sm:text-2xl">
            BRING YOUR WORK WITH YOU?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            This browser has {bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits.slice(-1) : bits[0]} from
            before you signed in. Add it to your account?
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button onClick={keep} disabled={busy} className="nb-btn min-h-11 flex-1 px-5 py-3 text-sm disabled:opacity-50">
              ⚡ ADD IT TO MY ACCOUNT
            </button>
            <button onClick={fresh} disabled={busy} className="nb-btn dark min-h-11 px-5 py-3 text-sm disabled:opacity-50">
              START FRESH
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Starting fresh clears that guest data from this browser, so it is not
            handed to whoever signs in next. Your account still saves to this
            device only — there is no server copy yet.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
