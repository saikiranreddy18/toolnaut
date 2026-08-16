// Roadmap progress: per-step completion keyed by "<milestoneId>:<stepIndex>",
// plus a per-milestone checkpoint pass keyed by "<milestoneId>:quiz".
// localStorage until the backend (Supabase) owns progress — the function
// surface below is the seam a backend adapter would implement.
const KEY = 'exus_roadmap_v1'

export function loadRoadmapProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

function persist(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* storage blocked */ }
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
