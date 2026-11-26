import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { roadmapToIcs } from '../src/utils/roadmapCalendar.js'

const milestones = [
  { id: 'w1', week: 1, title: 'Master Cursor', focus: 'An AI code editor', steps: ['Set up Cursor', 'Use it once'] },
  { id: 'w2', week: 2, title: 'Master Claude', focus: 'An AI assistant; good at writing, and code', steps: [] },
]

describe('roadmapToIcs', () => {
  test('wraps events in a valid VCALENDAR', () => {
    const ics = roadmapToIcs(milestones, { now: new Date(2026, 0, 1) })
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
    assert.match(ics, /END:VCALENDAR\r\n$/)
    assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2)
  })

  test('anchors each week 7 days after the last, as an all-day range', () => {
    const ics = roadmapToIcs(milestones, { now: new Date(2026, 0, 1) })
    assert.match(ics, /DTSTART;VALUE=DATE:20260101/)
    assert.match(ics, /DTEND;VALUE=DATE:20260108/)
    assert.match(ics, /DTSTART;VALUE=DATE:20260108/)
    assert.match(ics, /DTEND;VALUE=DATE:20260115/)
  })

  test('escapes commas and semicolons in free text per RFC 5545', () => {
    const ics = roadmapToIcs(milestones, { now: new Date(2026, 0, 1) })
    assert.match(ics, /SUMMARY:Week 2: Master Claude/)
    assert.match(ics, /good at writing\\, and code/)
    assert.match(ics, /An AI assistant\\; good at writing/)
  })

  test('joins steps into the description with escaped newlines', () => {
    const ics = roadmapToIcs(milestones, { now: new Date(2026, 0, 1) })
    assert.match(ics, /DESCRIPTION:An AI code editor\\nSet up Cursor\\nUse it once/)
  })

  test('gives each milestone a stable, unique UID', () => {
    const ics = roadmapToIcs(milestones, { now: new Date(2026, 0, 1) })
    assert.match(ics, /UID:toolnaut-roadmap-w1@toolnaut\.xyz/)
    assert.match(ics, /UID:toolnaut-roadmap-w2@toolnaut\.xyz/)
  })
})
