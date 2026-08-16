import { makeCourseRecord } from './schema.js'
import { skillIdsFor } from './skills.js'
import { callLLM, NoLLMError } from './llm.js'
import { log } from './util/logger.js'

// Turns a published tool into a structured micro-course. LLM writes it when
// available; otherwise the deterministic template (mirroring the app's
// roadmapGenerator) produces a solid course so no tool is ever left without one.
export async function generateCourse(tool, { now }) {
  let body
  try {
    body = coerceCourse(await courseWithLLM(tool), tool)
    body.generatedBy = 'llm'
  } catch (e) {
    if (!(e instanceof NoLLMError)) log.warn(`course LLM failed for ${tool.slug}, using template`, e.message)
    body = courseFallback(tool)
    body.generatedBy = 'fallback:template'
  }
  return makeCourseRecord({
    ...body,
    id: `course-${tool.slug}`,
    toolSlug: tool.slug,
    title: `Master ${tool.name}`,
    level: tool.level,
    updatedAt: now,
  })
}

async function courseWithLLM(tool) {
  const system = 'You design short, practical micro-courses for learning a single software tool. Be concrete, not generic.'
  const user =
    `Tool: ${tool.name}\nWhat it does: ${tool.blurb}\nLevel: ${tool.level}\n\n` +
    `Return JSON: { "objectives": [3 short strings], "modules": [ { "title": string, "estMinutes": number, "steps": [2-3 concrete action strings] } ], "prerequisites": [] }`
  const text = await callLLM(system, user, { json: true, maxTokens: 700 })
  return JSON.parse(extractJSON(text))
}

function coerceCourse(p, tool) {
  const modules = Array.isArray(p.modules) && p.modules.length
    ? p.modules.slice(0, 5).map((m) => ({
        title: String(m.title || 'Module'),
        estMinutes: Number(m.estMinutes) || 30,
        steps: (Array.isArray(m.steps) ? m.steps : []).filter((s) => typeof s === 'string').slice(0, 4),
      }))
    : courseFallback(tool).modules
  const objectives = Array.isArray(p.objectives) && p.objectives.length
    ? p.objectives.filter((s) => typeof s === 'string').slice(0, 4)
    : courseFallback(tool).objectives
  return { objectives, modules, skills: skillIdsFor(tool), prerequisites: Array.isArray(p.prerequisites) ? p.prerequisites : [] }
}

function courseFallback(tool) {
  const beginner = tool.level === 'beginner'
  return {
    objectives: [
      `Understand what ${tool.name} is for`,
      `Use ${tool.name} on a real task`,
      `Know where ${tool.name} fits — and its limits`,
    ],
    modules: [
      {
        title: 'Set up',
        estMinutes: 20,
        steps: [
          beginner
            ? `Create an account and finish the official getting-started flow for ${tool.name}.`
            : `Configure ${tool.name} for your real workflow, not the demo.`,
          `Say what ${tool.name} does in one line you could tell a colleague.`,
        ],
      },
      {
        title: 'Use it for real',
        estMinutes: 40,
        steps: [
          `Run one small, real task through ${tool.name}.`,
          beginner
            ? 'Find one feature or shortcut that makes it click.'
            : `Push ${tool.name} to an edge case and learn where it breaks.`,
        ],
      },
      {
        title: 'Make it stick',
        estMinutes: 30,
        steps: [
          `Fold ${tool.name} into a task you repeat weekly.`,
          'Write down when to reach for it — and when not to.',
        ],
      },
    ],
    skills: skillIdsFor(tool),
    prerequisites: [],
  }
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}/)
  return m ? m[0] : text
}
