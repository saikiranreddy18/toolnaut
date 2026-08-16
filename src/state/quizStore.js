// Guest-safe quiz state, persisted to localStorage after every answer so a
// refresh mid-quiz never loses progress. On signup, this payload is what gets
// synced to the server (see APP-FLOW.md §3.1).
const KEY = 'exus_quiz_v1'

export function loadQuiz() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw === 'object') {
      return { answers: raw.answers || {}, completed: !!raw.completed }
    }
  } catch { /* corrupted or unavailable storage — start fresh */ }
  return { answers: {}, completed: false }
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full/blocked */ }
}

export function saveAnswer(questionId, optionKey) {
  const s = loadQuiz()
  s.answers = { ...s.answers, [questionId]: optionKey }
  save(s)
  return s
}

export function completeQuiz() {
  const s = loadQuiz()
  s.completed = true
  save(s)
  return s
}

export function resetQuiz() {
  save({ answers: {}, completed: false })
}
