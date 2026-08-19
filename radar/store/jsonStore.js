import fs from 'node:fs'
import path from 'node:path'
import { domainKey } from '../util/slug.js'

// File-based store — the default, zero-dependency adapter. It implements the
// whole Store interface the pipeline needs; swapping to Postgres/Supabase later
// means writing one more adapter with the same methods, nothing else changes.
export function createJsonStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })
  const P = {
    tools: path.join(dataDir, 'tools.json'),
    courses: path.join(dataDir, 'courses.json'),
    skills: path.join(dataDir, 'skills.json'),
    review: path.join(dataDir, 'review-queue.json'),
    known: path.join(dataDir, 'known.json'),
    runs: path.join(dataDir, 'runs.log.json'),
  }
  // A missing file is the normal first-run case → default. ANY other failure
  // (truncated JSON, bad permissions) must abort the run: silently defaulting
  // to an empty store would make the next save() overwrite the real data.
  const load = (p, d = []) => {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch (e) {
      if (e.code === 'ENOENT') return d
      throw new Error(`radar store: cannot read ${p} — ${e.message}`, { cause: e })
    }
  }
  // Write to a temp file then rename — a process kill mid-write can't leave a
  // truncated/corrupt store file, since rename() is atomic on the same volume.
  const save = (p, v) => {
    const tmp = `${p}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(v, null, 2))
    fs.renameSync(tmp, p)
  }

  const tools = load(P.tools)
  const courses = load(P.courses)
  const skills = load(P.skills)
  const review = load(P.review)
  const known = new Set(load(P.known))

  const bySlug = new Map(tools.map((t) => [t.slug, t]))
  const byDomain = new Map()
  for (const t of tools) {
    const d = domainKey(t.website)
    if (d) byDomain.set(d, t)
  }

  return {
    getTool: (slug) => bySlug.get(slug) || null,
    getToolByDomain: (d) => byDomain.get(d) || null,
    listTools: () => tools.slice(),
    countTools: () => tools.length,

    isKnown: (slug, d) => known.has(`s:${slug}`) || (d ? known.has(`d:${d}`) : false),
    markKnown(slug, d) {
      known.add(`s:${slug}`)
      if (d) known.add(`d:${d}`)
      save(P.known, [...known])
    },

    upsertTool(record) {
      const existing = bySlug.get(record.slug)
      record.version = existing ? (existing.version || 1) + 1 : 1
      record.lifecycle = 'published'
      if (existing) Object.assign(existing, record)
      else {
        tools.push(record)
        bySlug.set(record.slug, record)
      }
      const d = domainKey(record.website)
      if (d) byDomain.set(d, record)
      save(P.tools, tools)
      return record
    },

    enqueueReview(record) {
      record.lifecycle = 'in_review'
      review.push(record)
      save(P.review, review)
    },

    upsertCourse(course) {
      const i = courses.findIndex((c) => c.id === course.id)
      if (i >= 0) courses[i] = course
      else courses.push(course)
      save(P.courses, courses)
    },

    upsertSkill(skill) {
      const i = skills.findIndex((s) => s.id === skill.id)
      if (i >= 0) {
        const ex = skills[i]
        ex.toolsTeaching = [...new Set([...(ex.toolsTeaching || []), ...(skill.toolsTeaching || [])])]
        ex.courses = [...new Set([...(ex.courses || []), ...(skill.courses || [])])]
      } else {
        skills.push(skill)
      }
      save(P.skills, skills)
    },

    // Versioned snapshot of the published data — the rollback point. Prunes
    // beyond SNAPSHOT_RETENTION so daily unattended runs don't grow disk
    // usage forever.
    snapshot(tag) {
      const snapshotsDir = path.join(dataDir, 'snapshots')
      const dir = path.join(snapshotsDir, tag)
      fs.mkdirSync(dir, { recursive: true })
      save(path.join(dir, 'tools.json'), tools)
      save(path.join(dir, 'courses.json'), courses)
      save(path.join(dir, 'skills.json'), skills)

      const retention = Number(process.env.RADAR_SNAPSHOT_RETENTION) || 14
      const entries = fs.readdirSync(snapshotsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
      for (const old of entries.slice(0, Math.max(0, entries.length - retention))) {
        fs.rmSync(path.join(snapshotsDir, old), { recursive: true, force: true })
      }
    },

    appendRun(report) {
      const r = load(P.runs)
      r.push({ at: report.at, counts: report.counts })
      save(P.runs, r)
    },
  }
}
