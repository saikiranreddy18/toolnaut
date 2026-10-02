// Aggregates everything Settings.jsx already shows on screen into one plain
// object, for the "Download my data" button — the read half of the account
// pair whose write half (DeleteAccount.jsx) already ships.
//
// Session is a PARAMETER here, not loaded inside this file. Every other value
// comes from a self-contained localStorage store with no further imports;
// authStore.js is the one exception (it pulls in the Supabase client, which
// reads import.meta.env — fine under Vite, but it crashes under node --test's
// plain ESM loader). Accepting session as an argument keeps this function
// itself pure and testable without that dependency.
import { loadQuiz } from '../state/quizStore'
import { loadStack } from '../state/stackStore'
import { loadFavorites } from '../state/favoritesStore'
import { loadProgress } from '../state/progressStore'
import { loadRoadmapProgress } from '../state/roadmapStore'
import { loadStreak } from '../state/streakStore'
import { loadTheme } from '../state/themeStore'
import { loadMoon } from '../state/moonStore'
import { loadCursor } from '../state/cursorStore'
import { loadAvatar } from '../state/avatarStore'

export function buildUserDataExport(session) {
  const quiz = loadQuiz()
  const streak = loadStreak()

  return {
    exportedAt: new Date().toISOString(),
    // Name/email/provider/plan only — never a token, never the Supabase user id.
    account: session?.user
      ? {
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          provider: session.user.provider ?? null,
          plan: session.plan ?? null,
        }
      : null,
    quiz: { completed: Boolean(quiz.completed), answers: quiz.answers ?? null },
    stack: loadStack(),
    favorites: loadFavorites(),
    progress: loadProgress(),
    roadmapProgress: loadRoadmapProgress(),
    streak: { count: streak.count, days: streak.days },
    preferences: {
      theme: loadTheme(),
      moon: loadMoon(),
      cursor: loadCursor(),
      avatar: loadAvatar(),
    },
  }
}

// Zero-dependency Blob download, same native-API approach the PDF-roadmap
// entry in docs/research-backlog.md established for this codebase.
export function downloadUserData(session, filename = 'toolnaut-my-data.json') {
  const data = buildUserDataExport(session)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
