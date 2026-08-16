// Lightweight haptic feedback. navigator.vibrate is Android/Chrome only (iOS
// Safari ignores it) — so it's a progressive enhancement, never load-bearing.
// Silenced when the user prefers reduced motion.
let allowed = true
try {
  allowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
} catch { /* no matchMedia — assume allowed */ }

function buzz(pattern) {
  if (!allowed) return
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

export const haptic = {
  tap: () => buzz(10),        // light confirmation (answer, toggle)
  select: () => buzz(18),     // add to stack, primary action
  success: () => buzz([0, 30, 40, 30]), // quiz complete, milestone done
}
