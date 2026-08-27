import { loadQuiz } from '../state/quizStore'

// Where someone should land after signing in.
//
// Signing in used to always go to /app/stack. For anyone who had not done the
// intake yet that is an EMPTY DASHBOARD — no persona, no stack, no roadmap,
// because every one of those is generated from the nine answers. The first
// thing a new account saw was a blank screen telling them to go and do the
// thing they had not done.
//
// So the destination depends on whether there is anything to show:
//
//   no answers yet  ->  /goal, the intake conversation. It ends at
//                       /quiz/result, which leads into the app with a real
//                       stack already in place.
//   answers exist   ->  wherever they were trying to reach.
//
// The requested destination is honoured for people who HAVE completed intake,
// which keeps the ?next= redirect working when a guard bounces someone out of a
// deep link and back again.
export function postAuthDestination(requested = '/app/stack') {
  try {
    // COMPLETED, not "has some answers". A half-finished intake produces no
    // persona at all — personaGenerator needs the full set — so someone who
    // answered three of nine and signed in would still land on an empty
    // dashboard, which is the exact bug this function exists to prevent.
    //
    // Sending them back to /goal is also the kinder outcome: the conversation
    // resumes at their first unanswered question rather than restarting.
    const { completed } = loadQuiz()
    return completed ? requested : '/goal'
  } catch {
    // Storage blocked: the intake is the safer landing either way, since it
    // works without any stored state and the dashboard does not.
    return '/goal'
  }
}
