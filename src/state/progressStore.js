// Per-tool progress, keyed by tool NAME (not slug — persona starter tools are
// derived and were always tracked by name). Index into STATUSES below.
//
// Lifted out of Stack.jsx because ME now shows the same numbers, and two
// components reading the same localStorage key through two private copies of
// the parsing logic is how they drift apart.
const KEY = 'exus_progress_v1'

export const STATUSES = ['Not started', 'Exploring', 'Using weekly', 'Mastered']

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function saveProgress(progress) {
  try { localStorage.setItem(KEY, JSON.stringify(progress)) } catch { /* storage blocked */ }
  return progress
}

// Advances one tool to the next status, wrapping back to "Not started".
export function cycleProgress(progress, toolName) {
  const current = progress[toolName] || 0
  return saveProgress({ ...progress, [toolName]: (current + 1) % STATUSES.length })
}
