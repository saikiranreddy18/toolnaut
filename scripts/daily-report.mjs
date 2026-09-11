#!/usr/bin/env node
// Daily autonomous-dev report.
//
// Collects what the routines ACTUALLY did in a time window and renders an HTML
// email. Every number here is read from a real artefact — the radar run log, git
// history, the GitHub API, or a test run executed right now. Nothing is
// estimated, and a section with no data says "nothing", never a plausible guess.
//
// WHY THIS EXISTS
// The routines had been reporting success while doing nothing: the research
// agent's cron was commented out and it had never run once, and the bug-fix
// agent's cron was commented out too and it had been silent for eight days. A
// green checkmark on the runs page said nothing about whether work happened.
// The "Routine health" section below is the part that makes that visible — it
// reports the schedule each workflow DECLARES against when it actually last ran,
// so a disabled cron shows up as a finding instead of as silence.
//
// Usage:
//   node scripts/daily-report.mjs [--hours 24] [--out report.html] [--run-tests]

import { execSync, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const HOURS = Number(arg('hours', 24))
const OUT = arg('out', 'report.html')
// Re-running the whole suite is OFF by default. CI already runs it on every
// push, so doing it again here duplicates several minutes of compute to answer
// a question the CI history answers better — and on a constrained machine the
// browser-driven smoke step stalls and eats the job's budget. Pass --run-tests
// to additionally verify master is green at report time.
const RUN_TESTS = argv.includes('--run-tests')
const SINCE = new Date(Date.now() - HOURS * 3600e3)
// fileURLToPath, not URL.pathname — the latter stays percent-encoded, so a
// path containing a space resolves to a directory that does not exist.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const sh = (cmd, opts = {}) => {
  try { return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim() }
  catch (e) { return opts.tolerant ? (e.stdout || '').trim() : null }
}
const json = (file) => {
  const p = path.join(REPO_ROOT, file)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null }
}
// gh may be absent or unauthenticated; every caller must tolerate null
const gh = (args) => {
  try {
    const out = execFileSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return JSON.parse(out)
  } catch { return null }
}

// ─────────────────────────────────────────────────────────── 1. tools (radar)
function tools() {
  const log = json('radar/data/runs.log.json') || []
  const runs = log.filter((r) => new Date(r.at) >= SINCE)
  const sum = (k) => runs.reduce((a, r) => a + (r.counts?.[k] || 0), 0)
  const current = json('public/tools.json')
  const queue = json('radar/data/review-queue.json')

  // what the catalogue looked like at the start of the window, so "added" is a
  // real delta and not just this run's self-reported count
  const oldSha = sh(`git rev-list -1 --before="${SINCE.toISOString()}" HEAD -- public/tools.json`, { tolerant: true })
  let before = null
  if (oldSha) {
    const raw = sh(`git show ${oldSha}:public/tools.json`, { tolerant: true })
    try { const d = JSON.parse(raw); before = Array.isArray(d) ? d.length : (d.tools || []).length } catch { /* not parseable */ }
  }
  const now = Array.isArray(current) ? current.length : (current?.tools || []).length

  // names of the tools that actually appeared in the window
  let added = []
  if (oldSha && Array.isArray(current)) {
    const raw = sh(`git show ${oldSha}:public/tools.json`, { tolerant: true })
    try {
      const prev = new Set((JSON.parse(raw) || []).map((t) => t.id || t.slug || t.name))
      added = current.filter((t) => !prev.has(t.id || t.slug || t.name)).map((t) => t.name || t.id).filter(Boolean)
    } catch { /* leave empty */ }
  }

  return {
    runs: runs.length,
    candidates: sum('candidates'),
    published: sum('published'),
    rejected: sum('rejected'),
    skipped: sum('skipped'),
    courses: sum('courses'),
    catalogueNow: now,
    catalogueBefore: before,
    delta: before == null ? null : now - before,
    addedNames: added,
    reviewQueue: Array.isArray(queue) ? queue.length : null,
    lastRunAt: log.length ? log[log.length - 1].at : null,
  }
}

// ──────────────────────────────────────────────────────────── 2. fixes/commits
const AREA = [
  [/^(src\/components\/auth|src\/pages\/auth)/, 'Sign-in / auth'],
  [/^src\/components\/3d/, '3D / galaxy'],
  [/^src\/components/, 'UI components'],
  [/^src\/pages/, 'Pages'],
  [/^src\/state|^src\/utils/, 'State / logic'],
  [/^radar/, 'Radar pipeline'],
  [/^scripts/, 'Tooling'],
  [/^\.github/, 'CI / routines'],
  [/^(test|__tests__)/, 'Tests'],
]
const areaOf = (f) => (AREA.find(([re]) => re.test(f)) || [null, 'Other'])[1]

function commits() {
  const raw = sh(`git log --since="${SINCE.toISOString()}" --no-merges --pretty=format:%H%x1f%an%x1f%ad%x1f%s --date=short`, { tolerant: true })
  if (!raw) return { list: [], byArea: {}, authors: {} }
  const list = raw.split('\n').filter(Boolean).map((line) => {
    const [sha, author, date, subject] = line.split('\x1f')
    const files = (sh(`git show --name-only --pretty=format: ${sha}`, { tolerant: true }) || '')
      .split('\n').map((s) => s.trim()).filter(Boolean)
    const areas = [...new Set(files.map(areaOf))]
    const stat = sh(`git show --shortstat --pretty=format: ${sha}`, { tolerant: true }) || ''
    return { sha: sha.slice(0, 7), author, date, subject, files: files.length, areas, stat: stat.trim() }
  })
  const byArea = {}
  list.forEach((c) => c.areas.forEach((a) => { byArea[a] = (byArea[a] || 0) + 1 }))
  const authors = {}
  list.forEach((c) => { authors[c.author] = (authors[c.author] || 0) + 1 })
  return { list, byArea, authors }
}

// ───────────────────────────────────────────────────────────────── 3. tests
function tests() {
  if (!RUN_TESTS) return { skipped: true }
  const out = {}
  const t = sh('npm test 2>&1', { tolerant: true, timeout: 4 * 60e3 }) || ''
  const num = (re) => { const m = t.match(re); return m ? Number(m[1]) : null }
  out.unit = { pass: num(/^# pass (\d+)/m), fail: num(/^# fail (\d+)/m), total: num(/^# tests (\d+)/m) }
  const b = sh('npm run build 2>&1', { tolerant: true, timeout: 6 * 60e3 }) || ''
  out.build = { ok: /built in/.test(b), detail: (b.match(/✓ built in [\d.]+m?s/) || [])[0] || null }
  const s = sh('node scripts/smoke.mjs 2>&1', { tolerant: true, timeout: 8 * 60e3 }) || ''
  out.smoke = {
    ok: /all routes render clean/.test(s),
    routes: (s.match(/^OK\s/gm) || []).length,
    failed: (s.match(/^FAIL\s/gm) || []).length,
    timedOut: s === '',
  }
  const h = sh('node scripts/radar-health.mjs 2>&1', { tolerant: true, timeout: 2 * 60e3 }) || ''
  out.radarHealth = { ok: !/STALE|NO-SOURCE|NO-PUBLISH/.test(h), detail: h.split('\n').slice(0, 3).join(' ') }
  return out
}

// What the CI actually ran in the window. The fresh run above proves master is
// green right now; this says what was exercised while the routines worked, which
// is the question "what tests did you do" is really asking.
function ciRuns() {
  const runs = gh(['run', 'list', '--workflow', 'ci.yml', '--limit', '30', '--json', 'createdAt,conclusion,displayTitle,url']) || []
  const inWindow = runs.filter((r) => new Date(r.createdAt) >= SINCE)
  return {
    total: inWindow.length,
    passed: inWindow.filter((r) => r.conclusion === 'success').length,
    failed: inWindow.filter((r) => r.conclusion === 'failure').length,
    list: inWindow.slice(0, 6),
  }
}

// ──────────────────────────────────────────────────── 4. research + 5. features
function research() {
  const since = SINCE.toISOString().slice(0, 10)
  const issues = gh(['issue', 'list', '--state', 'all', '--limit', '60', '--json', 'number,title,labels,createdAt,url,body']) || []
  const inWindow = issues.filter((i) => new Date(i.createdAt) >= SINCE)
  const labelled = (name) => inWindow.filter((i) => (i.labels || []).some((l) => l.name === name))
  return {
    ghAvailable: issues.length > 0 || gh(['repo', 'view', '--json', 'name']) !== null,
    growth: labelled('growth').map((i) => ({ n: i.number, title: i.title, url: i.url })),
    all: inWindow.map((i) => ({ n: i.number, title: i.title, url: i.url, labels: (i.labels || []).map((l) => l.name) })),
    since,
  }
}

function features() {
  const prs = gh(['pr', 'list', '--state', 'merged', '--limit', '40', '--json', 'number,title,mergedAt,url,labels']) || []
  const merged = prs.filter((p) => p.mergedAt && new Date(p.mergedAt) >= SINCE)
  const open = gh(['pr', 'list', '--state', 'open', '--limit', '20', '--json', 'number,title,url,createdAt']) || []
  return { merged, open }
}

// ───────────────────────────────────────────────────────── 6. routine health
// The section that would have caught the silent failure. A workflow that never
// runs produces no failed runs, so "no red" is not evidence of anything.
const ROUTINES = [
  ['radar.yml', 'Radar · tool discovery'],
  ['agent-bugfix.yml', 'Agent · bug fix'],
  ['agent-research.yml', 'Agent · research'],
  ['agent-maintainer.yml', 'Agent · dependencies'],
  ['agent-reviewer.yml', 'Agent · review'],
]
function routines() {
  return ROUTINES.map(([file, label]) => {
    const p = path.join(REPO_ROOT, '.github/workflows', file)
    const src = existsSync(p) ? readFileSync(p, 'utf8') : ''
    const active = [...src.matchAll(/^\s{2,}-\s*cron:\s*["']([^"']+)/gm)].map((m) => m[1])
    const commented = [...src.matchAll(/^\s*#\s*-\s*cron:\s*["']([^"']+)/gm)].map((m) => m[1])
    const runs = gh(['run', 'list', '--workflow', file, '--limit', '20', '--json', 'createdAt,conclusion,status']) || []
    const last = runs[0] || null
    const inWindow = runs.filter((r) => new Date(r.createdAt) >= SINCE)
    const failed = inWindow.filter((r) => r.conclusion === 'failure').length

    let status = 'ok'
    let note = ''
    if (!active.length && commented.length) { status = 'bad'; note = `schedule is COMMENTED OUT (${commented.join(', ')}) — this never fires` }
    else if (!active.length) { status = 'warn'; note = 'manual dispatch only — never fires on its own' }
    else if (!last) { status = 'bad'; note = `scheduled ${active.join(', ')} but has NEVER run` }
    else {
      const ageH = (Date.now() - new Date(last.createdAt)) / 3600e3
      if (failed) { status = 'warn'; note = `${failed} failed run(s) in window` }
      else if (ageH > 24 * 7) { status = 'bad'; note = `scheduled ${active.join(', ')} but last ran ${Math.round(ageH / 24)} days ago` }
      else note = `last run ${Math.round(ageH)}h ago`
    }
    return { file, label, active, commented, runsInWindow: inWindow.length, failed, last, status, note }
  })
}

// ────────────────────────────────────────────────────────────────── render
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const BRAND = { lime: '#a3ff2e', pink: '#ff2ea3', cyan: '#22d3ee', ink: '#0a0a0f', panel: '#15151f', line: '#2a2a3a', dim: '#9aa0b4', text: '#eef0f6' }

const card = (label, value, sub) => `
  <td style="padding:0 6px;" width="25%">
    <div style="background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:10px;padding:14px 12px;">
      <div style="font:700 24px/1.1 Helvetica,Arial,sans-serif;color:${BRAND.lime};">${esc(value)}</div>
      <div style="font:600 11px/1.4 Helvetica,Arial,sans-serif;color:${BRAND.dim};text-transform:uppercase;letter-spacing:.08em;margin-top:5px;">${esc(label)}</div>
      ${sub ? `<div style="font:400 11px/1.4 Helvetica,Arial,sans-serif;color:${BRAND.dim};margin-top:3px;">${esc(sub)}</div>` : ''}
    </div>
  </td>`

const section = (title, body) => `
  <tr><td style="padding:26px 24px 0 24px;">
    <div style="font:700 13px/1.2 Helvetica,Arial,sans-serif;color:${BRAND.pink};text-transform:uppercase;letter-spacing:.12em;padding-bottom:10px;border-bottom:1px solid ${BRAND.line};">${esc(title)}</div>
    <div style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:${BRAND.text};padding-top:12px;">${body}</div>
  </td></tr>`

const none = (what) => `<div style="color:${BRAND.dim};font-style:italic;">Nothing ${esc(what)} in this window.</div>`

const DOT = { ok: BRAND.lime, warn: '#f5a524', bad: '#ff4d6a' }

function render(d) {
  const { T, C, TE, R, F, RT, window: win } = d
  const toolsAdded = T.delta == null ? T.published : T.delta

  const commitRows = C.list.length ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${C.list.slice(0, 18).map((c) => `
        <tr>
          <td style="padding:6px 8px 6px 0;font:400 12px/1.5 monospace;color:${BRAND.cyan};white-space:nowrap;vertical-align:top;">${esc(c.sha)}</td>
          <td style="padding:6px 0;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:${BRAND.text};">
            ${esc(c.subject)}
            <div style="color:${BRAND.dim};font-size:11px;margin-top:2px;">${esc(c.areas.join(' · '))} — ${esc(c.stat || `${c.files} file(s)`)}</div>
          </td>
        </tr>`).join('')}
    </table>
    ${C.list.length > 18 ? `<div style="color:${BRAND.dim};font-size:12px;margin-top:8px;">+ ${C.list.length - 18} more</div>` : ''}
  ` : none('committed')

  const areaChips = Object.entries(C.byArea).sort((a, b) => b[1] - a[1]).map(([a, n]) =>
    `<span style="display:inline-block;background:${BRAND.ink};border:1px solid ${BRAND.line};border-radius:20px;padding:4px 11px;margin:0 6px 6px 0;font:600 11px Helvetica,Arial,sans-serif;color:${BRAND.text};">${esc(a)} <span style="color:${BRAND.lime};">${n}</span></span>`).join('')

  const ciRow = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:5px 0;font:400 13px Helvetica,Arial,sans-serif;color:${BRAND.dim};width:45%;">CI runs in window</td>
        <td style="padding:5px 0;font:600 13px Helvetica,Arial,sans-serif;color:${d.CI.total === 0 ? BRAND.dim : (d.CI.failed ? '#ff4d6a' : BRAND.lime)};">
          ${d.CI.total ? `${d.CI.passed} passed, ${d.CI.failed} failed` : 'none'}
        </td>
      </tr>
    </table>
    ${d.CI.list.length ? `<div style="margin-top:8px;">${d.CI.list.map((r) => `
      <div style="font:400 12px/1.6 Helvetica,Arial,sans-serif;color:${BRAND.dim};">
        <span style="color:${r.conclusion === 'success' ? BRAND.lime : '#ff4d6a'};">&#9679;</span>
        <a href="${esc(r.url)}" style="color:${BRAND.cyan};text-decoration:none;">${esc(r.displayTitle || 'CI')}</a>
      </div>`).join('')}</div>` : ''}
    ${TE.skipped ? `<div style="color:${BRAND.dim};font-size:12px;margin-top:10px;font-style:italic;">Suite not re-run in this report (CI already runs it on every push). Pass --run-tests to verify master at report time.</div>` : ''}`

  const testRows = TE.skipped ? ciRow : `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
    ['CI runs in window', d.CI.total ? `${d.CI.passed} passed, ${d.CI.failed} failed` : 'none', d.CI.total > 0 && d.CI.failed === 0],
    ['Unit tests (re-run)', TE.unit.total != null ? `${TE.unit.pass}/${TE.unit.total} passing` : 'not parsed', TE.unit.fail === 0 && TE.unit.total],
    ['Production build', TE.build.ok ? (TE.build.detail || 'succeeded') : 'FAILED', TE.build.ok],
    ['Route smoke test', TE.smoke.timedOut ? 'timed out' : (TE.smoke.ok ? `${TE.smoke.routes} routes clean` : `${TE.smoke.failed} route(s) failed`), TE.smoke.ok],
    ['Radar health', TE.radarHealth.ok ? 'fresh' : 'STALE / no publish', TE.radarHealth.ok],
  ].map(([k, v, ok]) => `
        <tr>
          <td style="padding:5px 0;font:400 13px Helvetica,Arial,sans-serif;color:${BRAND.dim};width:45%;">${esc(k)}</td>
          <td style="padding:5px 0;font:600 13px Helvetica,Arial,sans-serif;color:${ok ? BRAND.lime : '#ff4d6a'};">${esc(v)}</td>
        </tr>`).join('')}
    </table>`

  const routineRows = `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${RT.map((r) => `
        <tr>
          <td style="padding:7px 8px 7px 0;width:14px;vertical-align:top;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${DOT[r.status]};"></span></td>
          <td style="padding:7px 0;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:${BRAND.text};">
            <strong>${esc(r.label)}</strong>
            <span style="color:${BRAND.dim};">— ${esc(r.active.length ? r.active.join(', ') : 'no active schedule')}</span>
            <div style="color:${r.status === 'ok' ? BRAND.dim : DOT[r.status]};font-size:12px;margin-top:2px;">${esc(r.note)}</div>
          </td>
          <td style="padding:7px 0;font:600 12px Helvetica,Arial,sans-serif;color:${BRAND.dim};text-align:right;white-space:nowrap;vertical-align:top;">${r.runsInWindow} run(s)</td>
        </tr>`).join('')}
    </table>`

  const researchBody = !R.ghAvailable
    ? `<div style="color:${BRAND.dim};font-style:italic;">GitHub API unavailable in this run — research topics could not be read.</div>`
    : (R.all.length ? `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${R.all.map((i) => `
          <tr><td style="padding:6px 0;font:400 13px/1.5 Helvetica,Arial,sans-serif;">
            <a href="${esc(i.url)}" style="color:${BRAND.cyan};text-decoration:none;">#${i.n}</a>
            <span style="color:${BRAND.text};"> ${esc(i.title)}</span>
            ${i.labels.length ? `<span style="color:${BRAND.dim};font-size:11px;"> — ${esc(i.labels.join(', '))}</span>` : ''}
          </td></tr>`).join('')}
      </table>` : none('researched'))

  const featureBody = (F.merged.length || F.open.length) ? `
    ${F.merged.length ? `<div style="font:600 12px Helvetica,Arial,sans-serif;color:${BRAND.dim};text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Shipped</div>
    <table width="100%" cellpadding="0" cellspacing="0">${F.merged.map((p) => `
      <tr><td style="padding:5px 0;font:400 13px/1.5 Helvetica,Arial,sans-serif;">
        <a href="${esc(p.url)}" style="color:${BRAND.lime};text-decoration:none;">#${p.number}</a>
        <span style="color:${BRAND.text};"> ${esc(p.title)}</span></td></tr>`).join('')}</table>` : ''}
    ${F.open.length ? `<div style="font:600 12px Helvetica,Arial,sans-serif;color:${BRAND.dim};text-transform:uppercase;letter-spacing:.08em;margin:14px 0 6px;">Proposed / in flight</div>
    <table width="100%" cellpadding="0" cellspacing="0">${F.open.map((p) => `
      <tr><td style="padding:5px 0;font:400 13px/1.5 Helvetica,Arial,sans-serif;">
        <a href="${esc(p.url)}" style="color:${BRAND.cyan};text-decoration:none;">#${p.number}</a>
        <span style="color:${BRAND.text};"> ${esc(p.title)}</span></td></tr>`).join('')}</table>` : ''}
  ` : none('shipped or proposed')

  const broken = RT.filter((r) => r.status === 'bad')
  const banner = broken.length ? `
    <tr><td style="padding:0 24px;">
      <div style="background:#2a1119;border:1px solid #ff4d6a;border-radius:10px;padding:13px 15px;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:#ffd9e1;">
        <strong style="color:#ff4d6a;">${broken.length} routine${broken.length > 1 ? 's are' : ' is'} not running.</strong>
        ${esc(broken.map((b) => b.label).join(', '))}. A workflow that never fires produces no failed runs, so this will not show up as a red build.
      </div>
    </td></tr>` : ''

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Toolnaut · autonomous dev report</title></head>
<body style="margin:0;padding:0;background:#050508;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:22px 12px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${BRAND.ink};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;">

  <tr><td style="padding:22px 24px 4px;">
    <div style="font:800 20px/1.2 Helvetica,Arial,sans-serif;color:${BRAND.text};letter-spacing:-.01em;">
      T<span style="color:${BRAND.lime};">&#8734;</span>lnaut <span style="color:${BRAND.dim};font-weight:600;">· autonomous dev</span>
    </div>
    <div style="font:400 12px/1.5 Helvetica,Arial,sans-serif;color:${BRAND.dim};margin-top:4px;">
      ${esc(win.from)} &rarr; ${esc(win.to)} &nbsp;·&nbsp; last ${HOURS}h
    </div>
  </td></tr>

  ${banner}

  <tr><td style="padding:16px 18px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${card('Tools added', toolsAdded ?? 0, `${T.catalogueNow} in catalogue`)}
      ${card('Commits', C.list.length, `${Object.keys(C.byArea).length} area(s)`)}
      ${card('CI runs', TE.skipped ? String(d.CI.total) : `${TE.unit.pass ?? 0}/${TE.unit.total ?? 0}`, TE.skipped ? (d.CI.failed ? `${d.CI.failed} failed` : 'all green') : (TE.unit.fail ? `${TE.unit.fail} failing` : 'all passing'))}
      ${card('Routines OK', `${RT.filter((r) => r.status === 'ok').length}/${RT.length}`, broken.length ? `${broken.length} not running` : 'all firing')}
    </tr></table>
  </td></tr>

  ${section('Tools added', `
    ${T.runs ? `<div style="margin-bottom:10px;">Radar ran <strong style="color:${BRAND.lime};">${T.runs}</strong> time(s): ${T.candidates} candidates seen, <strong style="color:${BRAND.lime};">${T.published}</strong> published, ${T.skipped} already known, ${T.rejected} rejected.</div>`
    : none('discovered')}
    ${T.delta != null ? `<div style="color:${BRAND.dim};font-size:13px;">Catalogue ${T.catalogueBefore} &rarr; <strong style="color:${BRAND.text};">${T.catalogueNow}</strong> (${T.delta >= 0 ? '+' : ''}${T.delta}). ${T.reviewQueue != null ? `${T.reviewQueue} awaiting review.` : ''}</div>` : ''}
    ${T.addedNames.length ? `<div style="margin-top:10px;">${T.addedNames.slice(0, 24).map((n) => `<span style="display:inline-block;background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:6px;padding:3px 9px;margin:0 5px 5px 0;font:500 12px Helvetica,Arial,sans-serif;color:${BRAND.text};">${esc(n)}</span>`).join('')}${T.addedNames.length > 24 ? `<span style="color:${BRAND.dim};font-size:12px;">+${T.addedNames.length - 24} more</span>` : ''}</div>` : ''}
  `)}

  ${section('Fixes and changes', `${areaChips ? `<div style="margin-bottom:10px;">${areaChips}</div>` : ''}${commitRows}`)}

  ${section('Tests run', testRows)}

  ${section('Research topics', researchBody)}

  ${section('Features', featureBody)}

  ${section('Routine health', routineRows)}

  <tr><td style="padding:22px 24px 24px;">
    <div style="border-top:1px solid ${BRAND.line};padding-top:14px;font:400 11px/1.6 Helvetica,Arial,sans-serif;color:${BRAND.dim};">
      Generated by <code style="color:${BRAND.text};">scripts/daily-report.mjs</code> from the radar run log, git history and the GitHub API${TE.skipped ? '' : ', plus a test run executed at report time'}.
      Every figure is measured; sections with no data say so rather than estimating.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

// ───────────────────────────────────────────────────────────────────── main
const data = {
  window: { from: SINCE.toISOString().replace('T', ' ').slice(0, 16), to: new Date().toISOString().replace('T', ' ').slice(0, 16) },
  T: tools(),
  C: commits(),
  TE: tests(),
  R: research(),
  F: features(),
  RT: routines(),
  CI: ciRuns(),
}

const html = render(data)
writeFileSync(path.join(REPO_ROOT, OUT), html, 'utf8')

const broken = data.RT.filter((r) => r.status === 'bad')
const toolsAdded = data.T.delta == null ? data.T.published : data.T.delta
const subject = `Toolnaut · ${toolsAdded} tools, ${data.C.list.length} commits${broken.length ? `, ${broken.length} routine(s) DOWN` : ''}`

console.log(`report      : ${OUT}`)
console.log(`subject     : ${subject}`)
console.log(`tools added : ${toolsAdded} (catalogue now ${data.T.catalogueNow})`)
console.log(`commits     : ${data.C.list.length}`)
console.log(`tests       : ${data.TE.skipped ? 'skipped' : `${data.TE.unit.pass}/${data.TE.unit.total} unit, build ${data.TE.build.ok ? 'ok' : 'FAILED'}, smoke ${data.TE.smoke.ok ? 'ok' : 'FAILED'}`}`)
console.log(`ci          : ${data.CI.total} run(s), ${data.CI.failed} failed`)
console.log(`research    : ${data.R.all.length} issue(s)`)
console.log(`routines    : ${data.RT.filter((r) => r.status === 'ok').length}/${data.RT.length} healthy${broken.length ? ` — DOWN: ${broken.map((b) => b.label).join(', ')}` : ''}`)

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `subject=${subject}\n`, { flag: 'a' })
}
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## ${subject}\n\n- Tools added: ${toolsAdded} (catalogue ${data.T.catalogueNow})\n- Commits: ${data.C.list.length}\n- Research issues: ${data.R.all.length}\n- Routines healthy: ${data.RT.filter((r) => r.status === 'ok').length}/${data.RT.length}\n${broken.map((b) => `- **DOWN**: ${b.label} — ${b.note}\n`).join('')}`,
    { flag: 'a' })
}
