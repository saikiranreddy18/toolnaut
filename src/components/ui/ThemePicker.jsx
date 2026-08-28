import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { THEMES, loadTheme, setTheme } from '../../state/themeStore'
import { loadMoon, setMoon } from '../../state/moonStore'
import MoonToggle from './MoonToggle'
import { haptic } from '../../utils/haptics'

// Floating "play modes" switcher — a palette button (bottom-right) that expands
// the sky settings. Global: mounted once in App, fixed above all pages.
//
// Two independent axes live here, which is why they share one panel rather than
// getting a second floating button: play modes change the accent colours, moon
// changes how much light is in the sky behind them. Either can be set without
// disturbing the other.
export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(loadTheme)
  const [moon, setMoonState] = useState(loadMoon)

  function pick(id) {
    haptic.tap()
    setActive(setTheme(id))
  }

  function pickMoon(id) {
    setMoonState(setMoon(id))
  }

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="sticker flex flex-col gap-1.5 p-2"
            style={{ transform: 'none' }}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t.id)}
                aria-pressed={active === t.id}
                className={`press flex items-center gap-2.5 rounded-xl px-3 py-2 text-left ${active === t.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <span className="flex gap-1" aria-hidden="true">
                  {t.swatch.map((c) => (
                    <span key={c} className="h-3.5 w-3.5 rounded-full border-2 border-black" style={{ background: c }} />
                  ))}
                </span>
                <span className="font-display text-xs font-black uppercase tracking-wider text-white">{t.name}</span>
                {active === t.id && <span className="ml-auto text-xs" style={{ color: 'var(--lime)' }}>✓</span>}
              </button>
            ))}

            <div className="my-1 h-px bg-white/10" role="separator" />
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="flex flex-col">
                <label
                  htmlFor="moonlight-switch"
                  className="font-display text-xs font-black uppercase tracking-wider text-white"
                >
                  Moonlight
                </label>
                {/* the hint has to say what changes, because the switch shows
                    the moon and not the sky it is lighting */}
                <span className="text-[10px] text-slate-400">
                  {moon === 'full' ? 'Lit sky, softer stars' : 'Deep dark, more stars'}
                </span>
              </span>
              <MoonToggle
                id="moonlight-switch"
                lit={moon === 'full'}
                onChange={(on) => pickMoon(on ? 'full' : 'none')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => { haptic.tap(); setOpen((v) => !v) }}
        aria-label="Sky settings — theme and moonlight"
        aria-expanded={open}
        className="nb-btn dark flex h-11 w-11 items-center justify-center !rounded-full !p-0"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="13.5" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r="1.4" fill="currentColor" stroke="none" />
          <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2a2 2 0 0 1 2-2h2.3A4.4 4.4 0 0 0 22 11c0-5-4.5-9-10-9z" />
        </svg>
      </button>
    </div>
  )
}
