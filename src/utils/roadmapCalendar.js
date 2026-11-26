// Turns the 4-week roadmap into a downloadable .ics file so its weekly
// milestones show up where a user already looks — their calendar — instead
// of only inside /app/learning. One all-day event per week/milestone, not
// per step: a 4-week plan shouldn't spam 12-16 calendar entries. No live
// sync (that would need a stable per-user URL, a backend this static SPA
// doesn't have) — a one-time download the calendar app then owns.

// RFC 5545 §3.3.11: comma, semicolon and backslash must be backslash-escaped
// and newlines become literal `\n` — all before any line-folding.
function icsEscape(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

// VALUE=DATE wants YYYYMMDD, local-calendar-day arithmetic (no timezone).
function toIcsDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// RFC 5545 §3.1: lines over 75 octets should be folded with CRLF + a space.
function foldLine(line) {
  if (line.length <= 75) return line
  const chunks = []
  let rest = line
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75))
    rest = rest.slice(75)
  }
  chunks.push(rest)
  return chunks.join('\r\n ')
}

export function roadmapToIcs(milestones, { now = new Date(), uidSuffix = '' } = {}) {
  const stamp = toIcsDate(now) + 'T000000Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Toolnaut//4-Week Roadmap//EN',
    'CALSCALE:GREGORIAN',
  ]

  milestones.forEach((m, i) => {
    const start = addDays(now, (m.week - 1) * 7)
    const end = addDays(start, 7)
    const description = [m.focus, ...(m.steps || [])].filter(Boolean).join('\n')

    lines.push(
      'BEGIN:VEVENT',
      foldLine(`UID:toolnaut-roadmap-${m.id || i}${uidSuffix}@toolnaut.xyz`),
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(start)}`,
      `DTEND;VALUE=DATE:${toIcsDate(end)}`,
      foldLine(`SUMMARY:${icsEscape(`Week ${m.week}: ${m.title}`)}`),
      foldLine(`DESCRIPTION:${icsEscape(description)}`),
      'END:VEVENT',
    )
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export function downloadRoadmapIcs(milestones, filename = 'toolnaut-roadmap.ics') {
  const blob = new Blob([roadmapToIcs(milestones)], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
