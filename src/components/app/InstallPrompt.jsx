import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CloseIcon } from './icons'

const DISMISS_KEY = 'exus_a2hs_dismissed'

// Add-to-home-screen prompt. On Chromium we capture beforeinstallprompt and
// drive the native dialog; on iOS Safari (no such event) we show a short
// "tap Share → Add to Home Screen" hint instead. Dismissal is remembered.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    let dismissed = false
    try { dismissed = !!localStorage.getItem(DISMISS_KEY) } catch { /* storage blocked */ }
    if (dismissed) return
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (standalone) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS gives no install event — detect Safari on iPhone/iPad and hint.
    const ua = window.navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome/i.test(ua)
    if (isIOS && isSafari) {
      const t = setTimeout(() => { setIosHint(true); setShow(true) }, 3500)
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onBeforeInstall) }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* storage blocked */ }
  }

  // Marked role="dialog", which sets the standard expectation that Escape
  // dismisses it — ChatPanel and GalaxyExplorer already honor this for the
  // same reason.
  useEffect(() => {
    if (!show) return
    function onKey(e) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="sticker fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] flex items-center gap-3 p-3.5 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-sm"
          style={{ transform: 'none' }}
          role="dialog"
          aria-label="Install Toolnaut"
        >
          <img src="/icon.svg" alt="" width="44" height="44" className="shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-black uppercase italic text-white">Add Toolnaut to your home screen</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              {iosHint
                ? 'Tap the Share icon, then "Add to Home Screen".'
                : 'Launch the galaxy full-screen, like a native app.'}
            </p>
          </div>
          {!iosHint && (
            <button onClick={install} className="nb-btn shrink-0 px-4 py-2 text-xs">
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="press flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
