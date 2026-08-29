// Roadmap progress: per-step completion keyed by "<milestoneId>:<stepIndex>",
// plus a per-milestone checkpoint pass keyed by "<milestoneId>:quiz".
// localStorage until the backend (Supabase) owns progress — the function
// surface below is the seam a backend adapter would implement.
import { read, write, remove } from './scopedStorage'
const KEY = 'exus_roadmap_v1'

export function loadRoadmapProgress() {
  try { return read(KEY) || {} } catch { return {} }
}

function persist(p) {
  try { write(KEY, p) } catch { /* storage blocked */ }
  return p
}

export function toggleStep(milestoneId, stepIndex) {
  const p = loadRoadmapProgress()
  const key = `${milestoneId}:${stepIndex}`
  if (p[key]) delete p[key]
  else p[key] = true
  return persist(p)
}

export function isStepDone(progress, milestoneId, stepIndex) {
  return !!progress[`${milestoneId}:${stepIndex}`]
}

export function allStepsDone(progress, milestone) {
  return milestone.steps.every((_, i) => progress[`${milestone.id}:${i}`])
}

export function setQuizPassed(milestoneId) {
  const p = loadRoadmapProgress()
  p[`${milestoneId}:quiz`] = true
  return persist(p)
}

// Progress keys aren't persona-scoped, so a retaken quiz must start clean —
// otherwise the freshly generated roadmap inherits the old ticks.
export function resetRoadmapProgress() {
  try { remove(KEY) } catch { /* storage blocked */ }
}

export function isQuizPassed(progress, milestoneId) {
  return !!progress[`${milestoneId}:quiz`]
}

// A milestone clears when every step is checked AND, if it has a checkpoint,
// the quiz has been passed. Capstone (quiz === null) needs only its steps.
export function milestoneComplete(progress, milestone) {
  if (!allStepsDone(progress, milestone)) return false
  if (milestone.quiz && milestone.quiz.length) return isQuizPassed(progress, milestone.id)
  return true
}
