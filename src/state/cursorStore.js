// Cursor-effect preference: which effect follows the pointer, and how big.
//
// A DEVICE preference like theme and moonlight — deliberately not in
// scopedStorage's portable set. A cursor trail is a property of this screen
// and this mouse, not of the account; it would be strange for signing in on a
// work laptop to change how the cursor behaves there.
//
// Default is OFF. It was plasma-ribbon — the picked winner of the ten-variant
// Cursor Lab — until that default took the whole site down: the harness's
// trail fade painted the page ground across a canvas sitting IN FRONT of the
// app, so every route went solid black about a second after load. The fade is
// fixed (see CursorStars.jsx), but the default does not go back to an effect
// until someone has watched each of the ten run against real content.
//
// 'off' is a first-class choice, not an absence — some people find any pointer
// effect distracting, and that choice must survive reloads.

const KEY = 'exus_cursor_v1'
export const CURSOR_EVENT = 'exus:cursor-changed'

export const DEFAULT_CURSOR = { effect: 'off', size: 1 }

// Choice metadata for the Settings UI. The MODULES live in
// utils/cursorEffects.js (lazy-loaded, ~53KB) — only names are needed to
// render the picker, and pulling the code in just to label buttons would put
// all ten effects in the Settings chunk. Ids must match cursorEffects.js;
// the harness falls back to the first effect on an unknown id, so a mismatch
// degrades rather than breaks.
export const CURSOR_CHOICES = [
  { id: 'plasma-ribbon', name: 'Plasma Ribbon', icon: '〰️' },
  { id: 'comet-trail', name: 'Comet Trail', icon: '☄️' },
  { id: 'constellation', name: 'Constellation', icon: '✨' },
  { id: 'warp-streaks', name: 'Warp Field', icon: '💫' },
  { id: 'orbit-swarm', name: 'Orbit Swarm', icon: '🪐' },
  { id: 'pixel-dust', name: 'Pixel Stardust', icon: '👾' },
  { id: 'thruster', name: 'Rocket Thruster', icon: '🚀' },
  { id: 'gravity-stars', name: 'Gravity Lens', icon: '🌌' },
  { id: 'lightning', name: 'Static Crackle', icon: '⚡' },
  { id: 'black-hole', name: 'Event Horizon', icon: '🕳️' },
  { id: 'off', name: 'Off', icon: '🚫' },
]

export const CURSOR_SIZES = [
  { id: 0.7, name: 'Small' },
  { id: 1, name: 'Normal' },
  { id: 1.4, name: 'Large' },
  { id: 1.9, name: 'Huge' },
]

export function loadCursor() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return {
      effect: typeof raw?.effect === 'string' ? raw.effect : DEFAULT_CURSOR.effect,
      size: CURSOR_SIZES.some((s) => s.id === raw?.size) ? raw.size : DEFAULT_CURSOR.size,
    }
  } catch {
    return { ...DEFAULT_CURSOR }
  }
}

export function setCursor(next) {
  const merged = { ...loadCursor(), ...next }
  try { localStorage.setItem(KEY, JSON.stringify(merged)) } catch { /* storage blocked */ }
  // Same-tab live apply: CursorStars listens and swaps the running effect
  // immediately, so the Settings page doubles as a live preview.
  try { window.dispatchEvent(new CustomEvent(CURSOR_EVENT, { detail: merged })) } catch { /* SSR/prerender */ }
  return merged
}
