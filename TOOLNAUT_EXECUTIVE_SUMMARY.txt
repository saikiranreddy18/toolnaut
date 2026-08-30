# Toolnaut — Executive Summary

**29 August 2026 · commit `dd0f0d7` · v0.31.0**
Full detail: [`TOOLNAUT_AUDIT_REPORT.md`](./TOOLNAUT_AUDIT_REPORT.md)

---

## The one-line finding

**Authentication is real. Persistence is not.** An account exists in `auth.users`, but nothing an account *does* is attached to it — stack, saved tools, quiz answers, roadmap, progress, streak and avatar are all `localStorage`. Signing in synchronises nothing, because there is nothing on a server to synchronise.

Everything else in this report follows from that.

---

## Where Toolnaut is strong

- **Discovery works.** 781 tools, 14 routes prerendered with real HTML, per-route canonicals and structured data. A crawler now sees 20,140 characters on `/tools/design` where it previously saw an empty `<div id="root">`.
- **Guest mode is genuinely good.** No sign-in wall, and the product is honest about it: *"Browsing as guest — saved to this browser."*
- **The codebase is careful.** No service-role key in the client, no `dangerouslySetInnerHTML`, the one real secret correctly isolated in a serverless function, and comments that explain *why* rather than *what*.
- **Accessibility is above average** — skip link, 0 nested interactive elements on Find, 44px touch targets, reduced-motion honoured.

## Where it is not ready

- **No durable user data.** Clear your browser and everything is gone, signed in or not. No recovery.
- **No analytics whatsoever.** `VITE_GA4_ID` is unset, so gtag never loads. Zero measurement IDs in any live bundle. No activation, retention or conversion figure exists for any decision.
- **No billing integration.** Pricing is a marketing page; there is no checkout anywhere in the codebase.
- **No tool-data trust model.** Pricing and status are presented as current fact with no source URL and no verification date. For a product whose promise is *trustworthy tool decisions*, this is the deepest gap.

---

## Five highest-impact fixes

1. **Run the two Supabase migrations** (`0001_explorers.sql`, `0002_user_state.sql`). The sync layer and schema are written, committed, and **inert** — a live probe of `rpc/sync_available` returns 404. One paste unblocks durable data *and* the landing-page explorer count.
2. **Set an analytics key.** Until then every product decision, including all of the above, is opinion.
3. **Add `last_verified_at` + `source_url` to every volatile tool claim.** Pricing shown as fact without provenance is the fastest way to lose the trust the product is selling.
4. **Split the 710KB entry chunk.** It ships the Supabase client and lenis to every visitor, including the majority who never sign in.
5. **Decide what Pricing is.** Either wire billing or relabel the plans as a roadmap with a waitlist. Today every upgrade intent dead-ends.

## Five most serious risks

1. **Silent data loss.** A user builds a stack, clears their cache, and it is gone with no warning and no backup. Today's most likely support complaint.
2. **Entitlement would be client-side.** `plan` is a hardcoded string in the session mirror. Harmless while nothing is gated — **critical the day a paywall ships**, because any user could edit it.
3. **Building blind.** With no analytics, the roadmap is guesswork and no feature can be evaluated after launch.
4. **Stale tool facts.** One wrong price undermines the entire catalogue's credibility.
5. **Open redirect.** `?next=` is read with no relative-path validation and passed to `window.location.assign()`. Blunted on the production OAuth path, live on the magic-link and simulated paths.

---

## First engineering sprint

1. Run both migrations; verify RLS **denies** cross-user reads, not just that allows work.
2. Verify sync end-to-end: guest → sign in → import → second browser pulls → clear storage → recovers.
3. Validate `next` matches `^/(?!/)`; reject everything else.
4. Add CSP, HSTS, X-Content-Type-Options and Referrer-Policy to `vercel.json` — only `Cache-Control` is set today.
5. Split Supabase + lenis out of the entry chunk.
6. Write the first tests covering `src/` — the 102 existing tests cover only the `radar` pipeline, so the storage scoping and guest-import code that touches real user data is entirely untested.

## First product / UX sprint

1. Set the analytics key; instrument six events: `landing_viewed`, `onboarding_started`, `onboarding_completed`, `stack_generated`, `tool_saved`, `signup_completed`.
2. Define activation as **intake completed + one meaningful action**, and measure the baseline before changing anything.
3. Give sign-in a real benefit — after sync lands, the prompt becomes *"Back up your stack and open it on your phone"* instead of today's honest *"this does not sync anything yet."*
4. Add a real 404; `*` currently renders the landing page at HTTP 200.
5. Label the seeded Squad threads as examples, as the leaderboard already does.

## Decisions needed before building further

| Decision | Why it blocks work |
|---|---|
| GA4 or PostHog? | GA4 is already coded; PostHog needs an adapter but gives better funnels and guest→account aliasing |
| Pricing live without checkout? | Determines whether billing is this month's work or a waitlist |
| Small real explorer count, or lead with 781 tools? | The honest number will be low single digits |
| Is Squad a product or a placeholder? | Decides label-vs-remove |
| Who verifies tool facts, and how often? | Freshness needs an owner, not just a column |
| Are multiple named stacks a real roadmap item? | Determines whether the schema grows a `stacks` table |

---

## Scope and honesty of this audit

Verified by execution: repository inspection, `npm test` (102 pass), production build, 18-route smoke, prerender verification, live HTTP probes, and browser walkthroughs at 1440/1600/375px.

**Not verified, and why:** real Google OAuth end-to-end (would create a production account); colour contrast and Core Web Vitals (the browser pane could not composite frames, so all layout findings are DOM measurements rather than pixel inspection); `npm audit`; RLS allow/deny behaviour (the tables do not exist yet).

No code was changed in producing this audit.
