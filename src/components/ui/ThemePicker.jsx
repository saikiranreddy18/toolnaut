import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { THEMES, loadTheme, setTheme } from '../../state/themeStore'
import { loadMoon, setMoon } from '../../state/moonStore'
import MoonToggle from './MoonToggle'
import { GALAXY_LEVELS, loadGalaxyQuality, setGalaxyQuality } from '../../state/galaxyQualityStore'
import { haptic } from '../../utils/haptics'

// Floating "play modes" switcher — a palette button (bottom-right) that expands
// the sky settings. Global: mounted once in App, fixed above all pages.
//
// Two independent axes live here, which is why they share one panel rather than
// getting a second floating button: play modes change the accent colours, moon
// changes how much light is in the sky behind them. Either can be set without
// disturbing the other.
//
// The panel is CONTEXTUAL, because two of its controls only mean something on
// one side of the app:
//
//   Galaxy detail is read by exactly one component, components/3d/Scene.jsx,
//   which renders on the landing page. Inside /app there is no galaxy to set
//   the detail of, so the control there offered Full / Light / Off over
//   nothing at all.
//
//   Moonlight lights the in-app sky and already has a labelled home in
//   ME -> settings. On the landing page the galaxy is the sky, so the toggle
//   was a second control for a thing the visitor cannot see changing.
//
// Themes stay in both: accent colours apply everywhere.
export default function ThemePicker() {
  // /app/* is the in-app shell; everything else is the public site.
  const pathname = useLocation().pathname
  const inApp = pathname.startsWith('/app')
  // The intake surfaces — the Naut chat and the quiz/result pages. They render
  // no 3D galaxy (that lives on the landing page), but they DO mount the
  // starfield sky that data-moon lights, so they get the Moonlight toggle and
  // not a Galaxy detail control over nothing.
  const isIntake = pathname.startsWith('/goal') || pathname.startsWith('/quiz')
  const showMoon = inApp || isIntake
  const showGalaxy = !inApp && !isIntake
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(loadTheme)
  const [moon, setMoonState] = useState(loadMoon)
  const [gq, setGq] = useState(loadGalaxyQuality)

  function pick(id) {
    haptic.tap()
    setActive(setTheme(id))
  }

  function pickMoon(id) {
    setMoonState(setMoon(id))
  }

  function pickGalaxy(id) {
    haptic.tap()
    setGq(setGalaxyQuality(id))
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

            {showMoon && (
            <>
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
            </>
            )}

            {showGalaxy && (
            <>
            <div className="my-1 h-px bg-white/10" role="separator" />
            <p className="px-3 pb-1 font-display text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
              Galaxy
            </p>
            {/* The escape hatch for a machine the 3D is too heavy for. Every
                automatic fix for that was measured and none of them moved the
                number — turning WebGL off is the one that always works, and the
                person at the keyboard knows better than a heuristic. */}
            <div className="flex gap-1.5 px-3 pb-1" role="radiogroup" aria-label="Galaxy detail">
              {GALAXY_LEVELS.map((l) => (
                <button
                  key={l.id}
                  role="radio"
                  aria-checked={gq === l.id}
                  onClick={() => pickGalaxy(l.id)}
                  title={l.hint}
                  className="press flex-1 rounded-lg border-2 px-2 py-1.5 font-display text-[10px] font-black uppercase tracking-wider transition-colors"
                  style={{
                    borderColor: gq === l.id ? 'var(--lime)' : 'rgba(255,255,255,0.12)',
                    background: gq === l.id ? 'var(--lime)' : 'transparent',
                    color: gq === l.id ? '#000' : '#cbd5e1',
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <p className="px-3 pb-1 text-[10px] leading-snug text-slate-500">
              {GALAXY_LEVELS.find((l) => l.id === gq)?.hint}
            </p>
            </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => { haptic.tap(); setOpen((v) => !v) }}
        aria-label={showMoon ? 'Sky settings — theme and moonlight' : 'Sky settings — theme and galaxy detail'}
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
