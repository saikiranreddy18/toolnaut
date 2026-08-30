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
// Open-redirect guard for the ?next= parameter.
//
// `next` arrives from the URL, and its value ends up in
// window.location.assign() after sign-in. Unvalidated, a crafted link like
// /auth/login?next=https://evil.example sends a freshly signed-in person
// off-site — the moment when a fake "session expired" page is most credible.
//
// Parsed with the URL constructor rather than string checks, because string
// checks miss the bypasses: "//evil.example" is protocol-relative and
// startsWith('/') passes it; "/\\evil.example" normalises the same way in
// some browsers; "https:evil" has no slashes at all. new URL() resolves all
// of them the way the browser will, so comparing the RESOLVED origin is the
// only comparison that matches what location.assign() would actually do.
// Anything that does not resolve inside this origin falls back to the
// default destination.
export function safeNextPath(candidate, fallback = '/app/stack') {
  try {
    const base = window.location.origin
    const parsed = new URL(candidate ?? fallback, base)
    if (parsed.origin !== base) return fallback
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return fallback
  }
}

export function postAuthDestination(requested = '/app/stack') {
  const safe = safeNextPath(requested)
  try {
    // COMPLETED, not "has some answers". A half-finished intake produces no
    // persona at all — personaGenerator needs the full set — so someone who
    // answered three of nine and signed in would still land on an empty
    // dashboard, which is the exact bug this function exists to prevent.
    //
    // Sending them back to /goal is also the kinder outcome: the conversation
    // resumes at their first unanswered question rather than restarting.
    const { completed } = loadQuiz()
    return completed ? safe : '/goal'
  } catch {
    // Storage blocked: the intake is the safer landing either way, since it
    // works without any stored state and the dashboard does not.
    return '/goal'
  }
}
