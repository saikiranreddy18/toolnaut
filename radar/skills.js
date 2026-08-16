import { makeSkillRecord } from './schema.js'

// The skill graph links tools ↔ skills ↔ courses. A tool teaches a domain skill
// plus one skill per meaningful tag. These ids are stable, so many tools
// accumulate under the same skill (that's what lets the app "allocate skills"
// to a user across their whole stack).
export function skillIdsFor(tool) {
  const ids = new Set([`skill-${tool.category}`])
  for (const tag of tool.tags || []) ids.add(`skill-${tag}`)
  return [...ids].slice(0, 6)
}

export function skillsFor(tool, { now }) {
  return skillIdsFor(tool).map((id) =>
    makeSkillRecord({
      id,
      name: id.replace('skill-', '').replace(/-/g, ' '),
      domain: tool.category,
      level: tool.level,
      toolsTeaching: [tool.slug],
      courses: [`course-${tool.slug}`],
      updatedAt: now,
    }),
  )
}
