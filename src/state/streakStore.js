// Visit streak, and the days behind it.
//
// WHY THIS FILE EXISTS
// Stack.jsx used to render its seven day-dots as `isDone = index < todayDayOfWeek`
// — every day earlier in the week was drawn as a completed visit whether or not
// the person had ever opened the app. A brand-new user on a Friday saw four
// filled dots and a "1-day streak" side by side. That is invented activity, and
// it is the one thing a progress mechanic must never do: if the dots can be
// filled without doing anything, filling them means nothing.
//
// So the visit dates are now actually recorded. A dot is filled when that exact
// calendar date is in the log, and empty otherwise.
//
// SHAPE: { date, count, days }
//   date  — legacy toDateString() of the last visit, kept because
//           utils/communityStats.js reads { date, count } directly
//   count — consecutive-day streak
//   days  — ['YYYY-MM-DD', ...] local dates, trimmed to the last WINDOW days
const KEY = 'exus_streak_v1'

// Four weeks is enough for the current week's dots plus room for a longer
// history view later, and small enough to never matter for storage.
const WINDOW = 28

// Local date key. Deliberately NOT toISOString(), which converts to UTC and
// rolls the date over early or late for most of the world.
export function toDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Built from parts, not Date.parse: new Date('2026-08-28') is parsed as UTC
// midnight and lands on the 27th for anyone west of Greenwich.
function fromDateKey(k) {
  const [y, m, d] = String(k).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function readRaw() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

// Existing installs only have the legacy { date, count }. Seed the log with
// that single day so the streak count they already earned is not thrown away.
function readDays(raw) {
  if (Array.isArray(raw.days)) return raw.days
  if (raw.date) {
    const d = new Date(raw.date)
    if (!Number.isNaN(d.getTime())) return [toDateKey(d)]
  }
  return []
}

// Calendar-day successor check (not a fixed 24h) so DST transitions don't
// desync the streak.
function isNextCalendarDay(prevKey, todayKey) {
  const prev = fromDateKey(prevKey)
  prev.setDate(prev.getDate() + 1)
  return toDateKey(prev) === todayKey
}

export function loadStreak() {
  const raw = readRaw()
  return { count: Number(raw.count) || 0, days: readDays(raw) }
}

// Records today and returns the updated streak. Idempotent within a day, so
// calling it on every mount is safe.
export function recordVisit(now = new Date()) {
  const raw = readRaw()
  const days = readDays(raw)
  const todayKey = toDateKey(now)

  if (days.includes(todayKey)) {
    return { count: Number(raw.count) || 1, days }
  }

  const last = days.length > 0 ? days[days.length - 1] : null
  const count = last && isNextCalendarDay(last, todayKey) ? (Number(raw.count) || 0) + 1 : 1

  const nextDays = [...days, todayKey].slice(-WINDOW)
  try {
    localStorage.setItem(KEY, JSON.stringify({
      date: now.toDateString(), // legacy field, still read by communityStats
      count,
      days: nextDays,
    }))
  } catch { /* storage blocked — the streak is best-effort, never load-bearing */ }

  return { count, days: nextDays }
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// The current Sunday→Saturday week, each day flagged with whether it was
// actually visited. Future days are marked so the UI can render them as
// "not yet" rather than as a miss.
export function weekDots(days, now = new Date()) {
  const visited = new Set(days)
  const todayKey = toDateKey(now)
  const sunday = new Date(now)
  sunday.setDate(sunday.getDate() - sunday.getDay())

  return DAY_LETTERS.map((letter, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    const key = toDateKey(d)
    return {
      letter,
      key,
      visited: visited.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }
  })
}
