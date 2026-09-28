  — whoever builds this can hardcode `GITHUB_REPO_URL =
  'https://github.com/saikiranreddy18/toolnaut'` in `src/config.js` directly,
  no verification step left to do. Confirmed `src/config.js` still has no
  such constant and `src/utils/suggestTool.js` still doesn't exist, so this
  gap is exactly as unbuilt and exactly as buildable as when it was first
  logged — only the target line numbers and the repo-URL blank needed
  filling in. `ToolDetail.jsx:143-145`'s "VISIT WEBSITE" `nb-btn dark` link,
  cited above as the style to reuse for the `Settings.jsx` link, is also
  still at that exact location, unchanged.
- **Deepened 2026-09-22 15:20 UTC — the oldest untouched OPEN entry (22 days);
  re-verified against current `src/`, still fully unbuilt and still fully
  buildable, only line numbers drifted:**
  - Confirmed `src/config.js` still has no `GITHUB_REPO_URL` constant and
    `src/utils/suggestTool.js` still does not exist — nothing about this gap
    has shipped by another name since the last check.
  - `Discover.jsx`'s empty state moved again: it's now `Discover.jsx:296-323`
    (was `227-254`). Shape is unchanged — `suggestedCats` buttons
    (`Discover.jsx:307-315`) then a "Clear all filters" button
    (`Discover.jsx:317-322`) — so the plan's insertion point ("after both, as
    the last-resort block for someone who tried both and still found
    nothing") still applies exactly, only the line numbers needed updating.
  - `ToolDetail.jsx`'s "Visit website" `nb-btn dark` link also drifted, to
    `ToolDetail.jsx:151-158` (was `143-145`).
  - **The `Settings.jsx` placement was previously left vague ("the natural
    home") — pinned it to an exact slot this run:** `Settings.jsx:506-511` is
    a `border-t` row holding a "Replay the tour" `nb-btn dark` button,
    explicitly placed outside the signed-in check with the comment "guests
    use /app too" — the same audience (any visitor, session or not) this
    gap's suggestion link needs, and the same `nb-btn dark` style already
    planned for reuse. A "Suggest a tool" link belongs in that same row, next
    to "Replay the tour", not as a new standalone section.

### PDF roadmap export (sold on Pro, does not exist)
- **Status:** OPEN
- **Seen in:** this isn't a competitor pattern so much as a Toolnaut-only
  false claim — flagged while re-auditing `planData.js` for other unbacked
  rows after the favorites gap (found there is not the only one). Print/
  export-to-PDF as a client-only feature (no server render, no PDF library)
  is a standard web pattern via a dedicated print stylesheet + `window.print()`
  — GitHub's own "Print" on rendered Markdown and countless invoice/reports
  pages use exactly this, no backend involved.
- **Gap:** `src/utils/planData.js:49` promises "Export learning roadmaps as
  PDF" on the Pro tier, repeated as a comparison-table row at
  `planData.js:87` (`['PDF roadmap export', false, true, true]`) — live today
  on `/pricing` via `PricingSection.jsx`. Grepped the whole `src/` tree for
  `print(|PDF|jspdf|download` (case-insensitive): the only hits are those two
  `planData.js` copy lines and unrelated tool-catalog blurbs (`toolsCatalog.js:469`
  matches "Blueprint AI", a false positive). `src/pages/app/Learning.jsx`
  already renders the full 4-week roadmap (`generateRoadmap()` → `milestones`
  with `week`/`title`/`focus`/`steps`/`tool`, `Learning.jsx:224-385`) and
  already has one export-adjacent action — `share()` at `Learning.jsx:243-250`
  copies a one-line brag string, not the roadmap content itself. There is no
  `package.json` PDF dependency (`jspdf`, `html2canvas`, etc. — confirmed
  zero hits) and no `@media print` rule anywhere in `src/index.css` (509
  lines, checked in full) or any component file. A Pro subscriber who reads
  the pricing page and looks for this gets nothing.
- **Why it matters:** same category of issue as the favorites gap — a
  specific, checkable claim on the pricing page with zero product behind it,
  discoverable by anyone who actually tries to use what they're told they're
  paying for. It's also a real, if secondary, retention aid on its own
  merits: a roadmap someone can save/print survives outside the browser tab
  the same way the (shipped) stack-share link does, useful for someone who
  wants to follow their 4-week plan without Toolnaut open.
- **Smallest useful version (what to actually build):**
  - No new dependency — use the browser's native print-to-PDF via
    `window.print()`, which every modern browser already exposes as "Save as
    PDF" in its print destination picker. This is the only approach
    consistent with every other gap in this file staying dependency-free.
  - Add a scoped `@media print` block to `src/index.css` (or a small
    `Learning.jsx`-only `<style>` — whichever keeps the block visibly tied to
    the one page it affects) that hides everything print doesn't need: the
    galaxy/3D background canvas, `AppShell`'s nav chrome, the "How ▾" lesson
    disclosure toggles, the checkpoint quiz forms, and all the sticker
    box-shadow/rotate decoration (`transform: rotate(...)`, `box-shadow`
    inherited from the `.sticker` class) that reads as visual noise on paper
    — keep milestone title, week, focus, step list with done/not-done state,
    and the tool link. Force light-on-white text color for print (the app is
    dark-theme-only; printing white text on a transparent/dark background as-is
    would be unreadable/wasteful on paper).
  - One "🖨️ Export as PDF" button on `Learning.jsx`, near the existing
    "🎓 SHARE MY BADGE" button's visual slot (`Learning.jsx:398-400`) —
    always visible (not gated behind `allCleared`, since exporting an
    in-progress roadmap is at least as useful as a completed one), calling
    `window.print()` directly. No new component needed beyond the button and
    the print stylesheet.
  - **What this would NOT include** (kept out to bound the diff): no actual
    PDF-library-generated file (no `jspdf`/`html2canvas`, no client-side
    binary PDF construction) — `window.print()` → "Save as PDF" is the
    honest, dependency-free way to deliver this and is what "export as PDF"
    means to a user regardless of mechanism; no plan-tier gating (same
    reasoning as the favorites gap — no billing system exists to enforce
    Student vs. Pro against, so this ships ungated for everyone, same as
    favorites would); no print styling for any other page (Stack, Discover,
    ToolDetail) in v1, scoped to `Learning.jsx` only since that's the exact
    page the copy names ("roadmaps"); no server-rendered/emailed PDF.
- **Build size:** S — one `@media print` stylesheet block, one button on
  `Learning.jsx` calling `window.print()`. No backend, no new dependency, no
  new route, no new store.
- **Found:** 2026-08-25 03:20 UTC
- **Deepened 2026-09-03 03:20 UTC — both the "false claim" framing and the
  "ships ungated" plan are now stale; the build itself is still exactly
  right.** Two things changed underneath this entry since 2026-08-25, and
  this run re-verified both against the current tree rather than trusting
  the original text:
  1. **The pricing page no longer sells this as live.** `planData.js:108`
     now reads `planned('Export learning roadmaps as PDF')` (line moved from
     the original `:49` — the file was restructured when payments shipped),
     and `COMPARISON` at `planData.js:154` is `['PDF roadmap export', false,
     'planned', 'planned']`, not the bare `true` this entry originally
     found. Read `PricingSection.jsx`'s `Cell` component and
     `PricingPillar.jsx`'s feature-list rendering: both now branch on
     `status`/`value === 'planned'` and render a dimmed "planned, not yet
     built" pill (`PricingSection.jsx:13-19`) instead of a checkmark. This is
     the fix the now-SHIPPED "Pricing already got its honest fix written"
     entry above (`c04149e`) put in place — it explicitly named this PDF
     row as one of the four claims it was reconciling. Net effect: a visitor
     reading `/pricing` today already sees this as "planned," not as
     something they're being sold. The trust-cost framing in "Why it
     matters" above was accurate on 2026-08-25 and is not accurate now — the
     remaining reason to build this is closing a real promise/reality gap
     and giving Pro subscribers something they were told to expect, not
     stopping an active false claim.
  2. **"No billing system exists to enforce Student vs. Pro" is false.**
     Confirmed by reading `src/hooks/useEntitlement.js` and
     `src/utils/entitlement.js`: `fetchEntitlement()` hits a real
     `/api/entitlement` endpoint backed by `user_entitlements` and returns
     `{ active, plan, paymentsEnabled, configured, unknown }`, and
     `TrialBanner.jsx:39` already shows the established call-site pattern for
     a Pro-only UI piece: `if (!ent.paymentsEnabled || !ent.configured)
     return null`. This means gating is now cheap and real, not a "no
     billing system" dead end.
  - **Corrected smallest useful version:** build exactly as originally
    specced (the `@media print` block, the button, `window.print()` — none
    of that changes), but wire the button through `useEntitlement()` using
    the exact `TrialBanner.jsx:39` escape hatch: when `!ent.paymentsEnabled
    || !ent.configured` (today's actual state, free public beta), render the
    button unconditionally — identical to what this entry originally
    proposed, so behavior right now is unchanged from the original plan.
    Once payments are live, gate on `ent.active && (ent.plan === 'guru' ||
    ent.plan === 'founder' || ent.plan === 'pandava')` (Pro and up, matching
    `planData.js:98,128`'s "Everything in Student/Pro, plus" inheritance) —
    Student sees a "Pro roadmap export →/pricing" nudge instead of the
    button. This turns the current `planned` pill into a `live` one
    specifically for the tier that was promised it, rather than the
    original plan's "ship free for everyone regardless of plan," which
    would have quietly under-delivered the Team/Pro distinction the second
    payments actually go live and nobody revisits this file.
  - **What this still would NOT include:** any change to the `@media print`
    scope, the button's page (`Learning.jsx` only), or the dependency-free
    `window.print()` approach — none of that was wrong, only the gating
    assumption was stale. Also not proposing to gate `Favorites.jsx`'s
    10-tool cap the same way in this pass — that's a separate, already-
    shipped feature this run did not re-audit; flagging it only so a future
    hour doesn't assume this deepening covered it.
  - **Build size, corrected:** still S — same stylesheet + button, plus one
    `useEntitlement()` call and a two-branch conditional already proven at
    `TrialBanner.jsx:39`. No new dependency, no new route.
  - **Re-verified 2026-09-23 00:20 UTC — build still fully correct and still
    unbuilt, but the button's anchor point moved and needs re-pinning.**
    Oldest untouched OPEN entry (20 days) — deepened per the cumulative-
    research rule rather than adding a new one.
    - Core claim unchanged: `planData.js:118` still reads
      `planned('Export learning roadmaps as PDF')` and `planData.js:172` is
      still `['PDF roadmap export', false, 'planned', 'planned']` (both lines
      drifted again since the last check, substance identical). Grepped `src/`
      for `print|PDF|jspdf|html2canvas` again — same two `planData.js` copy
      hits plus the same `toolsCatalog.js:469` "Blueprint AI" false positive,
      nothing new. `src/index.css` grew 509 → 965 lines since 2026-09-03 and
      still has zero `@media print` rule. Zero PDF dependency in
      `package.json`. `useEntitlement.js` and `TrialBanner.jsx:39`'s
      `if (!ent.paymentsEnabled || !ent.configured) return null` gate are both
      unchanged — the corrected gating plan above is still exactly right.
    - **What changed and matters for the build:** `Learning.jsx` grew 385 →
      464 lines, and the "near the SHARE MY BADGE button's visual slot"
      anchor this entry previously gave is now actively misleading. That
      button (still `🎓 SHARE MY BADGE`, now `Learning.jsx:451`) is nested
      inside `{allCleared && (...)}` (opens `Learning.jsx:439`) — it only
      renders once every milestone is cleared. The PDF export button must
      stay **always visible** per this entry's own spec ("exporting an
      in-progress roadmap is at least as useful as a completed one"), so it
      cannot actually sit in that slot without either escaping the
      conditional (churn this entry doesn't call for) or rendering only for
      users who already finished the roadmap (contradicts the spec). The
      always-rendered header block — `<h1>Your 4-week<br/>Orbit</h1>` at
      `Learning.jsx:273`, immediately followed by the `{current && (...)}`
      "your next move" sticker at `Learning.jsx:275` — is the right anchor
      instead: it renders on every visit regardless of progress, right below
      the page title, and is the first always-visible content on the page.
      Corrected placement: the export button goes directly under the `<h1>`
      at `Learning.jsx:273`, before the "next move" sticker, not reused from
      the share button's slot.
    - Nothing else in the build (the `@media print` scope, `window.print()`
      approach, entitlement gating) needed correction this pass.
- **Status:** SHIPPED, but PARTIALLY REOPENED 2026-09-13 21:20 UTC — the
  `ToolDetail`/`Compare` follow-up this entry closed itself against on
  2026-08-31 ("still gated behind AppShell") is now stale: the gate is gone.
  See the 2026-09-13 21:20 UTC deepening below, appended after the original
  closing note rather than rewritten into it, so the discovery trail stays
  intact. The hook, its prerender bug fix, and the five originally-scoped
  top-level call sites are still correctly SHIPPED and unaffected.
- **Seen in:** every directory competitor treats per-listing metadata as
  table stakes because it's their primary organic-search channel — G2 and
  Capterra generate a unique `<title>`/description per product page keyed off
  the product name, and There's An AI For That / Futurepedia do the same per
  tool listing. This is also standard for any content-per-URL site (a blog
  post, a Notion public page) — the page title matches what the page is
  actually showing, not a fixed site-wide string.
- **Gap:** confirmed by reading `index.html:11-27` and grepping `document.title|
  react-helmet|<title>|og:title|og:description` across `src/`: the only
  `<title>`, `<meta name="description">`, and every `og:*`/`twitter:*` tag are
  static, hardcoded once in `index.html` for the root `/` route, and nothing
  in `package.json` provides `react-helmet`/`react-helmet-async` or any other
  per-route head manager. Of `src/App.jsx`'s 15 routes (`App.jsx:73-98`), only
  one — `NexusLanding.jsx:518-523` — ever touches `document.title` at all, via
  a raw `useEffect` that sets it to a fixed string on mount and restores the
  previous value on unmount; it never touches `<meta name="description">` or
  any `og:*`/`twitter:*` tag, and social crawlers (which don't execute JS —
  `index.html`'s own comment at line 15 says so) never see the change anyway.
  Net effect: `ToolDetail.jsx` (one route, 700+ distinct tool slugs),
  `Pricing.jsx`, `About.jsx`, `SharedStack.jsx` (the just-shipped share-stack
  feature above), and `Compare.jsx` all render with the exact same tab title
  ("Toolnaut — Your AI Stack, Personalized") and the exact same social-preview
  card as the homepage, regardless of which tool, stack, or comparison is
  actually on screen.
- **Why it matters:** two distinct costs, both real and both free to name
  precisely. (1) SEO: Google's crawler does render JS during indexing (unlike
  Twitter/Facebook's crawlers), so a correct per-route `document.title` and
  `<meta name="description">` would genuinely help long-tail search — someone
  searching "Notion AI review" or "Notion AI alternatives" has a real reason
  to land on a Toolnaut `ToolDetail` page today, but that page's `<title>`
  never mentions the tool name at all, which is a meaningful ranking signal
  left on the table across 700+ pages. (2) Social/share quality: the
  share-stack gap above (shipped) built `/s/:slugs` specifically to be
  "something to post when they want to show someone their AI stack," but a
  pasted share link previews as the generic homepage card in every chat app
  and social feed — the exact feature meant to drive sharing undercuts itself
  the moment it's actually shared. Same problem for `ToolDetail` links pasted
  into a Slack channel or DM.
- **Smallest useful version (what to actually build):**
  - New `src/hooks/usePageMeta.js`: a small hook, `usePageMeta({ title,
    description })`, that in a `useEffect` sets `document.title` and finds-or-
    creates a `<meta name="description">` tag via `document.querySelector`,
    writing the previous values and restoring them on unmount — same
    restore-on-unmount shape `NexusLanding.jsx:518-523` already established,
    generalized into one reusable hook instead of every page hand-rolling the
    same `useEffect`. Pure DOM manipulation, no dependency (`react-helmet-
    async` would be the "correct" long-term answer but is a new dependency
    for a change this size — out of scope for a first cut per this file's own
    dependency-free bias).
  - Call it from `ToolDetail.jsx` with `${tool.name} — Toolnaut` / `tool.blurb`
    (both already loaded for the page), `Pricing.jsx` with a pricing-specific
    title/description, `About.jsx`, `SharedStack.jsx` (title naming the tools
    in the stack, e.g. "My AI stack: Notion AI, Cursor, Perplexity —
    Toolnaut"), and `Compare.jsx` (title naming the compared tools). Each call
    site supplies its own strings — no shared copy table needed for five call
    sites.
  - Replace `NexusLanding.jsx`'s hand-rolled `document.title` `useEffect`
    (`NexusLanding.jsx:518-523`) with the same hook, so there is exactly one
    place this logic lives.
  - **What this would NOT include** (kept out to bound the diff): no dynamic
    `og:*`/`twitter:*` tag updates — those need a crawler that executes JS,
    which social crawlers don't, so updating them client-side would be dead
    code that looks like it works and doesn't; fixing *those* for real needs
    either a Vercel Edge Middleware/serverless function injecting per-route
    HTML or a prerender step, which is a backend-shaped change this backlog's
    own ranking rule says to reject — flagging it here as the honest reason
    social previews stay generic, not silently working around it with fake
    client-side OG tags; no per-category or per-audience meta variants beyond
    the five call sites above; no sitemap/structured-data (`JSON-LD`) work,
    a separate and larger SEO project; no i18n/locale variants.
- **Build size:** S — one new hook (`usePageMeta.js`), five call sites
  (`ToolDetail.jsx`, `Pricing.jsx`, `About.jsx`, `SharedStack.jsx`,
  `Compare.jsx`) plus replacing `NexusLanding.jsx`'s existing ad hoc version.
  No backend, no new dependency, no new route.
- **Found:** 2026-08-25 12:09 UTC
- **Deepened 2026-08-25 21:09 UTC:** two of this gap's five call sites
  (`ToolDetail.jsx`, `Compare.jsx`) get zero real SEO value from the hook as
  specced, because the pages themselves are unreachable by a crawler today —
  a problem one level below meta tags. `AppShell.jsx:57-59` hard-redirects
  any visitor with no session straight to `/auth/login`, and both routes are
  nested under `<Route path="/app" element={<AppShell />}>` in `App.jsx:87-98`.
  `authStore.js:6-25` confirms the session is entirely fake/local — `signIn()`
  just writes a localStorage flag, no real credential check, no backend call
  — but a crawler doesn't click "Continue with Google" or "Send magic link"
  (`Login.jsx:78-87,96-114`) any more than a real unauthenticated user would,
  so it never gets one. `scripts/smoke.mjs:75-77` already documents this
  exact failure mode in its own comment — it seeds a fake session via
  `page.addInitScript` before visiting any `/app/*` route specifically
  "[without one] every one of these renders the login page instead" — the
  smoke suite had to route around the same wall this finding is about. Net
  effect: a Google crawl of `toolnaut.xyz/app/tools/notion-ai` today renders
  the **login page's** HTML (title "Enter your command center", generic
  description), never the tool's. Same failure for a `ToolDetail` link
  pasted into Slack/Discord — the recipient who isn't already signed in
  clicks through to a login screen, not the tool page they were sent, which
  is a worse outcome than the "generic preview card" problem the base gap
  already names for `SharedStack` links (that route is correctly public,
  outside `AppShell`, at `App.jsx:79`).
  This does **not** invalidate the base gap — `Pricing.jsx`, `About.jsx`,
  and `SharedStack.jsx` are all top-level public routes (`App.jsx:74-79`,
  outside `AppShell`) and get the hook's full SEO/social value with no
  further change. It scopes the gap: ship `usePageMeta` for those three
  first since they're immediately net-positive, and treat `ToolDetail`/
  `Compare` as blocked on a separate, smaller decision rather than silently
  wiring the hook into two pages a crawler can't reach and calling it done.
  **Smallest real fix for the two blocked pages:** the session gate buys no
  actual security today (there's no real account, no billing, nothing
  private to protect — `planData.js`'s Team-tier admin/seat claims are
  already REJECTED above as needing real accounts this app doesn't have),
  and `ToolDetail.jsx` already degrades cleanly with no session: `quiz.completed
  ? quiz.answers : null` (`ToolDetail.jsx:51-52`) already falls back to a
  "Take the quiz" prompt instead of a match score, and stack/favorites default
  to empty arrays rather than throwing. So `ToolDetail` (at minimum — `Compare`
  is a smaller win since a comparison URL is a less likely inbound/shared link)
  could render outside the guard entirely: pull it out of the `AppShell`-nested
  route and give it its own top-level public route (mirroring `SharedStack`'s
  pattern exactly), keeping the nav/nudge chrome only for the fields that
  need it (add-to-stack/favorite buttons already check `session` implicitly
  via their stores, not via a hard redirect, so they'd just no-op to
  localStorage for a guest same as any first-time visitor). **What this would
  NOT include:** no change to `AppShell`'s guard for `Stack`/`Discover`/
  `Learning`/`Community`/`Favorites`/`Settings` — those pages assume an
  active persona/session-scoped state in a way a single tool page does not,
  and reworking the guard wholesale is a much larger, riskier change than
  this file's own S/M sizing bias allows; no removal of the login flow
  itself. **Build size of the follow-up fix:** S/M — move `ToolDetail`'s
  route to top-level (public) in `App.jsx`, decide what nav chrome (if any)
  a guest sees instead of the full `AppShell`, add its route to
  `scripts/smoke.mjs`'s unauthed section. Should ship together with or
  right after the base `usePageMeta` gap, not as a separate backlog line —
  same feature, one more file (`App.jsx`'s route table) than originally
  scoped.
- **Deepened 2026-08-31 00:20 UTC — the hook shipped, and it shipped with a
  bug that undid most of its own point; found and fixed this run.** This gap
  was written before `src/utils/head.js` existed. Re-reading the current
  repo: a `useHead({ title, description, path, jsonLd })` hook (hand-rolled,
  not `react-helmet` — exactly what this gap's own "smallest useful version"
  proposed) is real and already wired into six pages — `CategoryLanding.jsx`,
  `NewTools.jsx`, `Pricing.jsx`, `About.jsx`, `Methodology.jsx`,
  `NotFound.jsx` — none of which are recorded in DEVLOG or this backlog under
  this gap's name, so it shipped as part of some other, unlogged piece of
  work (most likely the prerender effort below, same commit per `git log`).
  Of this gap's original five call sites: `Pricing`/`About` done;
  `ToolDetail`/`Compare` still correctly blocked on the session-gate problem
  the previous deepening above already named; `SharedStack.jsx` — public,
  ungated, no blocker at all — was simply never wired and is the one real
  remaining gap here (see below).
  The bigger finding is a real, shipped bug, not a scoping gap. A second new
  file, `scripts/prerender.mjs` (also unlogged under any gap), runs the
  `vite build` output through a headless browser per public route and writes
  the rendered HTML back into `dist/` so crawlers get real content instead of
  an empty `<div id="root">` — necessary, and it correctly names the exact
  problem this gap's own "why it matters" predicted (a shared canonical
  "asks Google to treat them all as duplicates of the homepage and index
  none of them"). But it deliberately rebuilds every route from the
  **pristine, pre-hydration shell** captured before any route mounts, to keep
  Vite's per-route `<link rel="modulepreload">` tags out of the static
  output (the three.js-preload bug this repo's CLAUDE.md warns about,
  `prerender.mjs`'s own comment names it explicitly). Side effect:
  `useHead()`'s `document.head` writes — title, description, canonical,
  `og:*`/`twitter:*`, the JSON-LD script — all happen inside the exact
  browser session `prerender.mjs` throws away. **Verified by building it**:
  before this run's fix, `dist/tools/design/index.html` shipped the
  homepage's `<title>`, a canonical pointing at `https://toolnaut.xyz/` (not
  `/tools/design`), and zero `application/ld+json` — identical across all 14
  prerendered routes, the exact "every page shares one" failure this gap is
  named for, just moved one layer below where it was originally written
  against. `scripts/verify-prerender.mjs` (a real, purpose-built
  crawler-view checker) never caught it — it only asserts body text length
  and h1 content, no `<title>`/canonical assertion at all — and it isn't
  wired into `npm test` or CI regardless (checked `package.json` and
  `.github/workflows/`).
  **Fixed this run**, in `scripts/prerender.mjs` (already built and
  verified, not a proposal): after rendering each route, `page.evaluate()`
  reads back what `useHead()` just wrote (`document.title`, the live
  description/canonical/og/twitter tag content, `#route-jsonld`'s text), and
  a small `patchHead()` applies those as string substitutions onto the
  pristine shell's already-declared static tags — no live DOM is
  serialised, so the modulepreload bug this design exists to avoid stays
  avoided. Verified by rebuilding and grepping `dist/tools/design/index.html`,
  `dist/new/index.html`, `dist/pricing/index.html`: each now carries its own
  title/description/canonical/`og:*`, `/tools/design` carries a real
  `CollectionPage`/`ItemList` JSON-LD block, and `dist/index.html` (no
  `useHead()` call) is unchanged — confirmed via `npm test` (162/162),
  `npm run build`, and `npm run smoke`, all green.
  **What's still open, now correctly scoped to one item:** wire `useHead()`
  into `SharedStack.jsx` — public, ungated, on the same tier as the pages
  already done, but not in `prerender.mjs`'s `ROUTES` list (correctly —
  `/s/:slugs`' content depends on the URL param, and that file's own comment
  already excludes it for that reason), so this is a client-side-only
  `useHead()` call (e.g. title naming the shared tools: "My AI stack: Notion
  AI, Cursor, Perplexity — Toolnaut"), not a prerender change. One import,
  one hook call, using data the page already has resolved.
- **Deepened 2026-08-31 12:22 UTC — the last call site shipped; closing this
  gap.** `SharedStack.jsx` now calls `useHead()` (title naming up to 5 tools
  by name plus a "+N more" tail, a description listing all of them, `path:
  /s/:slugs`, and an `ItemList` JSON-LD of the shared tools) when the link
  resolves to at least one real tool, and just a bare `path` (site defaults)
  for a stale/unrecognized link — never a fabricated title for zero tools.
  Confirmed via `npm run smoke`: `/s/chatgpt` still renders clean (0 console
  errors); this route is client-only per the design above, so there's no
  `dist/` output to grep the way the prerendered routes were checked. All
  five of this gap's originally-scoped call sites are now done, and the two
  routes this deepening's own earlier note found blocked (`ToolDetail`,
  `Compare`) remain the one open follow-up — still gated behind `AppShell`,
  still a separate, larger routing decision, not part of this gap's scope.
- **Deepened 2026-09-13 21:20 UTC — the blocking premise is gone; re-scoped
  as a two-line fix, no routing decision needed.** Re-read `AppShell.jsx`
  end to end rather than trusting this entry's own 2026-08-25 note. The hard
  redirect that note described (`AppShell.jsx:57-59`, unauthenticated visitor
  → `/auth/login`) no longer exists anywhere in the file. In its place,
  `AppShell.jsx:118-130` carries a block comment titled "NO SIGN-IN GATE"
  that states the removal as a deliberate, already-shipped decision: "the
  redirect that used to sit here guarded no data... every visitor, reviewer
  and crawler unwilling to sign in first[paid a steep price]... Sign-in stays
  available and becomes load-bearing the day state moves server-side. Until
  then it must not stand in the doorway." `git log -p -S"NO SIGN-IN GATE" --
  src/shells/AppShell.jsx` shows this comment already present in the v0.69.1
  release commit (2026-09-10), so the gate has been gone for several days —
  this file simply never got told. Live-checked to be sure the comment
  matches behavior, not just intent: `ToolDetail`/`Compare` are still nested
  under `<Route path="/app" element={<AppShell />}>` (`App.jsx:127`, with
  `Compare`/`ToolDetail` at `App.jsx:132-133`), and nothing above that route
  or inside `AppShell` calls `navigate()` on a missing session — the only
  `navigate('/pay', ...)` in the file fires solely for a real, non-simulated
  signed-in session with an inactive paid entitlement (`AppShell.jsx:89-96`),
  which does not apply to a signed-out crawler or guest.
  This means the two-line fix this entry's own "smallest useful version"
  scoped back on 2026-08-25 is now buildable exactly as originally written,
  with no route change: `ToolDetail.jsx` and `Compare.jsx` each get one
  `import { useHead } from '../../utils/head'` and one `useHead({ title,
  description, path, jsonLd })` call, matching the pattern already live in
  `CategoryLanding.jsx`/`Pricing.jsx`/`About.jsx`/`NewTools.jsx`/
  `SharedStack.jsx` — `ToolDetail.jsx` already has every field this needs in
  scope at render time (`tool.name`, `tool.blurb`, `tool.price`,
  `tool.category`), so this is copy-the-pattern work, not new design.
  A second, independent reason this is now worth doing rather than a nice-
  to-have: `PublicCompare.jsx:44`, `SharedStack.jsx:41`, `CategoryLanding.jsx:59`,
  and `NewTools.jsx:38` — four pages that are already public, prerendered,
  and SHIPPED with real JSON-LD — all cite `${SITE}/app/tools/${t.slug}` as
  the canonical `url` for every tool they list, in structured data a crawler
  is meant to trust. Right now that URL, when actually visited, carries the
  homepage's generic title/description, no canonical of its own, and no
  JSON-LD — Toolnaut's own shipped structured data is pointing crawlers at
  704 pages that fail the exact per-page SEO hygiene this backlog already
  built and shipped everywhere else. Fixing `ToolDetail.jsx` closes that
  inconsistency, not just a standalone nice-to-have.
  **What this does NOT fix, named honestly:** `ToolDetail`/`Compare` are
  still absent from `scripts/prerender.mjs`'s `ROUTES` list and from
  `public/sitemap.xml`. `useHead()` alone helps a JS-executing crawler
  (Google, and per this repo's own `robots.txt` reasoning, likely Bing) but
  does nothing for a crawler that does not render JS before reading a page's
  `<title>`/meta, the same limitation this gap's base entry already named for
  social unfurlers. Prerendering all ~700 `ToolDetail` slugs is a materially
  bigger, slower build step than this file's S-sizing bias fits in one run
  (`prerender.mjs` drives a real headless browser per route; 6 category
  pages today vs. 700+ tool pages is a different order of build-time cost,
  worth measuring before committing to it) and a full sitemap for all 704
  slugs needs the generator this backlog has now flagged as missing five
  separate times (this entry's own cross-references: the Alternatives-pages
  entry above, the RSS-feed entry, the source-categories entry, the
  page-title-forward "changelog" entry) without ever building it — that
  generator is the next real gap once this two-line fix ships, not part of
  it.
  **Also stale from the same cause, for whoever picks up the entries below:**
  the "Per-tool 'Alternatives' SEO pages" entry (this file, "Gap" section)
  and the JSON-LD entry's "What this would NOT include" both justify
  skipping `ToolDetail` with "still behind AppShell's session guard" —
  same stale premise, not yet corrected in either entry's own text to keep
  this deepening in one place rather than three near-duplicate edits.
  **Build size of the reopened follow-up:** S — two `useHead()` call sites
  using data already in scope, zero routing change, zero new file. Ships
  independently of the sitemap/prerender follow-up named above.

### Pro chat assistant & the entire Team tier are unbacked and unbuildable client-side
- **Status:** OPEN (Gap 1 only) — PARTIALLY REOPENED 2026-09-01 15:20 UTC. Gap
  1's blocking reason ("no `api/` directory, no serverless function, no
  server-held key") is now false — see the deepening below. **Gap 2 (the
  Team tier) is unaffected and stays REJECTED**: re-checked `authStore.js`
  this run, still zero team/org/seat modeling.
- **Original rejection (now stale for Gap 1 only, kept for history):**
  REJECTED — needs a backend/multi-user system; logged so future research
  hours don't re-spend an hour rediscovering this, and so it's visible to a
  human rather than silently sitting on the pricing page.
- **Seen in:** not a competitor pattern — this entry exists because
  re-auditing `planData.js` for other unbacked rows (after the favorites and
  PDF-export gaps, both found the same way) turned up two more categories of
  false claim, one bigger than either of those.
- **Gap 1 — "AI-powered chat assistant (Claude-powered Q&A)" (Pro tier,
  `planData.js:44`, repeated at `planData.js:84`):** `src/components/app/
  ChatPanel.jsx` exists and is wired into the app (persistent panel, opens
  from `AppShell`, context-aware greeting using the user's persona name), but
  it is an explicit, self-labelled stub — its own header renders "Preview —
  replies are canned" (`ChatPanel.jsx:53`) and every reply is the same
  hardcoded string regardless of what's typed (`ChatPanel.jsx:41-45`: "I come
  online with the backend integration..."). The code is honest about this to
  the user in-product; the pricing page is not — `/pricing` sells it as a
  live Claude-powered feature with no such caveat.
- **Gap 2 — the whole Team tier (`planData.js:52-76`, `pandava` plan, $50/mo,
  repeated across 7 rows of the comparison table at `planData.js:88-92`):**
  every one of "Team stack standardization," "Role-based team onboarding,"
  "Team analytics dashboard," "Collaborative tool-evaluation workspace,"
  "Admin controls + member management," "Shared progress + team
  leaderboards," "Quarterly AI stack audit reports," and "API access for
  integrations" requires the thing this codebase fundamentally does not have:
  a multi-user account system. Confirmed by reading `src/state/authStore.js`
  and `src/utils/toolsCatalog.js` — there is no team/org entity, no seats, no
  server-side user record at all; "login" is local-only (grepped
  `team|seat|org|member` across `src/state`, zero hits beyond the `pandava`
  plan copy itself). None of these are gaps a client-side SPA change can
  close — they need real accounts, a database, and a permissions model.
- **Why this is REJECTED rather than logged OPEN like the favorites/PDF
  gaps:** those two were closeable with a `localStorage` store and a
  `window.print()` call — genuinely client-only. This isn't: a real chat
  assistant needs a server-held Anthropic API key (an API key shipped in a
  `VITE_`-prefixed client bundle is a public secret — `radar/.env.example`'s
  own comment on `src/.env.example` warns "these are baked into the client
  bundle... only ever put PUBLIC values here"), which means a Vercel
  serverless function under a new `api/` directory (none exists today —
  `vercel.json` has no `functions` config, confirmed) plus a secret only a
  human with Vercel project access can set. The Team tier needs actual
  backend accounts. Both are exactly the shape this file's own ranking rule
  says to reject: "A gap that needs a backend is usually REJECTED."
- **What would actually be honest to ship, if anyone wants to close this
  later (not proposed as this run's build — flagged for whoever owns pricing
  copy):** the cheapest real fix is a copy correction, not a feature build —
  either soften "Claude-powered Q&A" to something like "AI copilot (preview)"
  until the backend lands, or gate the whole claim behind a "Coming soon"
  qualifier the way `HeroSection.jsx`'s "✦ LAUNCHING SOON ✦" tape-label
  already does elsewhere on this site. Same for the Team tier: either build
  the minimum real slice (which is out of scope for any single feature run
  under this backlog's own S/M sizing) or mark it "Coming soon" until it's
  real. This backlog's job is to find buildable product gaps, not rewrite
  pricing copy unasked, so no edit was made — this is a finding, not a fix.
- **Build size:** L (chat: needs a serverless function + secret Vercel-side
  config outside this repo's reach; Team tier: needs full multi-user
  accounts) — out of scope for this backlog's client-only SPA model.
- **Found:** 2026-08-25 15:35 UTC
- **Deepened 2026-09-01 15:20 UTC — Gap 1's own blocker no longer exists:**
  the payments work that reopened the weekly-alerts gap above (same
  precedent, different feature) also built an `api/` directory — it has 12
  serverless functions now, not zero — and one of them, `api/chat.js`, is a
  live, working Vercel function that calls an LLM server-side with a secret
  key (`FEATHERLESS_API_KEY`) that is already configured in production,
  since the `/goal` onboarding flow depends on it today (`src/utils/
  goalChat.js` calls it to classify free-text quiz replies). Read
  `api/chat.js` in full: it already has everything Gap 1 was rejected for
  lacking — origin allowlisting scoped to this project's own domains
  (`originAllowed()`), a per-IP sliding-window rate limit, strict payload-size
  and field-length caps, a hard timeout with a graceful `source: 'unconfigured'
  | 'upstream_error' | 'timeout'` fallback so a slow/broken model never
  strands the caller, and a JSON-only prompt contract. That is a proven,
  production-hardened template for "expose an LLM call to the browser
  safely" — reusing it is materially smaller than building the same safety
  scaffolding from zero, which is what made this an "L" in the original
  entry.
  **What `api/chat.js` is NOT, so this isn't already done:** it's scoped
  narrowly to one job — classify a free-text quiz reply into one of that
  question's option keys ("you are not choosing tools, only understanding
  the person," per its own system prompt) — and is called from nowhere but
  `GoalChat.jsx`. `ChatPanel.jsx` (the Pro-tier "AI Copilot," confirmed still
  self-labelled "Preview — replies are canned" at `ChatPanel.jsx:53`, its
  `send()` still a hardcoded string with zero `fetch` calls) is a completely
  separate, unwired component. Building Gap 1 means a **second**, differently
  -prompted endpoint, not flipping a switch on the first one.
  **Smallest useful version:** new `api/copilot.js`, copying `api/chat.js`'s
  security scaffolding verbatim (origin allowlist, rate limiter, size caps,
  timeout+fallback) but with its own prompt: given the caller's resolved
  stack (tool names + categories, sourced the same way `Stack.jsx` already
  builds that list at `Stack.jsx:116-119` — slugs only, resolved server-side
  or client-side via `getTool()`, never trust free-text tool names from the
  client) plus a short message history, answer a freeform question in 1-3
  sentences; return `{ reply, source }` (`source` mirrors `api/chat.js`'s
  vocabulary) instead of a classification key. New `src/utils/copilotChat.js`
  mirroring `goalChat.js`'s `askServer` shape (POST, catch network errors,
  return a typed result). Wire `ChatPanel.jsx`'s `send()` to call it,
  appending the real reply on `source: 'llm'` and falling back to a plain
  "I'm not able to answer that right now" message on anything else — same
  never-strand-the-user contract `api/chat.js` already guarantees for the
  quiz flow. Drop the "Preview — replies are canned" header once wired.
  **One thing this does NOT fix, flagged so nobody assumes it does:** the
  pricing copy specifically says "Claude-powered Q&A" (`planData.js:44`), but
  the only LLM path proven to exist and work in this codebase — `api/chat.js`
  — calls Featherless-hosted open models (Qwen2.5-7B-Instruct), the same
  choice `radar/`'s own enrichment made for cost/latency reasons documented
  in that file. Building this gap with the same provider makes the feature
  real but leaves "Claude-powered" still false; that's a one-line copy fix
  for whoever ships this, not a reason to hold the build, and not something
  this research pass is doing unasked (same stance this file already took on
  the Team-tier copy below).
  **Build size, corrected:** M — one new serverless function (largely copied
  scaffolding, new prompt + response shape), one new client util, wiring
  `ChatPanel.jsx`'s existing `send()` to it. Down from the original "L": the
  hard parts (secret management, abuse limits, origin checks, a Vercel
  function that actually works in production) are now a proven pattern in
  this exact repo, not new infrastructure.
- **Deepened 2026-09-03 12:20 UTC — Gap 2's own rejection reasoning has one
  stale line; the verdict itself is unchanged.** Checking whether the same
  payments work that reopened Gap 1 also touches Gap 2, since both were
  rejected in the same original entry for adjacent reasons. Re-read
  `src/state/authStore.js` in full against its state as of the original
  2026-08-25 rejection: when Supabase is configured, `signIn('google')` now
  goes through a real `supabase.auth.signInWithOAuth()` flow, and
  `watchSession()` mirrors a genuine `auth.users` row (`user.id`, a real
  Google-verified `email`) into the app's session — confirmed this is the
  same identity `api/entitlement`, `user_entitlements`, and the alerts
  backend already key off. So the specific clause "no server-side user
  record at all" this entry's Gap 2 originally rejected on is no longer
  literally true — there is one, per individual, and it has existed since
  the same 2026-08-31/09-01 payments work Gap 1's own deepening already
  cites.
  This does **not** reopen Gap 2. Checked `supabase/migrations/` in full
  (7 files, `0001`–`0007`) and grepped `team|seat|org` across all of them:
  the only hit is a plan **label** — `('pandava', 'Team', ...)` in
  `0005_reconcile_payment_schema.sql:59`, a price-tier name, not a schema.
  There is still no org/team entity, no seat count, no membership or invite
  table, and no permissions model of any kind — every one of Gap 2's seven
  named capabilities ("Team stack standardization," admin/seat management,
  shared leaderboards, etc.) needs a *group* of users related to each
  other, and individual accounts, however real, don't provide that. The
  accurate framing going forward: Gap 2 no longer needs a backend from
  zero (one already exists, and already has real per-user identity to
  build on), but it still needs a real multi-user *data model* — at
  minimum an `orgs`/`teams` table, a membership join table, and RLS
  policies scoped to it — which is new schema design and a permissions
  surface, not a slice of what already shipped. That keeps this at
  L / REJECTED for a single feature run's S/M sizing bias, just for a
  narrower and now-accurate reason than "no accounts exist."
  **Build size, Gap 2 (still rejected, reasoning corrected):** L — needs a
  new `orgs`/`memberships` schema and permissions model. Individual
  Supabase accounts (real, already shipped) are a precondition this gap can
  now build on, not a substitute for it.
- **Deepened 2026-09-23 12:20 UTC — re-verified Gap 1 against current src;
  its own headline premise is now stale, and a live cross-cutting risk
  surfaced.** This is the oldest untouched OPEN entry (last touched
  2026-09-03), so re-checked every cited fact rather than adding a new gap.
  **Everything substantive still holds:** `ChatPanel.jsx` is still the same
  honest stub — header still reads "Preview — replies are canned"
  (now line 53, unchanged position), `send()` still appends the identical
  hardcoded string (lines 41-45) with zero `fetch` calls. `api/chat.js`
  (248 lines, unchanged in substance) still has the full security
  scaffolding this entry's build plan reuses: `originAllowed()` (line 54),
  `rateLimit()` from `_security.js` (line 22/184), the `LIMITS` payload
  caps, and the graceful `source: 'unconfigured' | 'upstream_error' |
  'timeout'` fallback contract. `api/copilot.js` still does not exist
  (checked `ls api/` — 17 files, no copilot). `Stack.jsx`'s
  `getTool`/`slugs` pattern this entry's plan cites is still exactly
  shaped as described (now `Stack.jsx:101-123`, shifted from 116-119).
  **One citation drifted and one was missing:** `planData.js:44` is now
  `planData.js:116` (file grew); the entry never mentioned that the same
  string is *also* a `COMPARISON` row — `['AI chat assistant', false,
  'planned', 'planned']` at `planData.js:168` — which matters for the next
  finding.
  **The entry's own headline premise no longer holds.** Gap 1 was logged
  because "the pricing page sells it as a live Claude-powered feature with
  no such caveat" (original 2026-08-25 finding). Traced every render path
  for that copy today and none of them do that anymore:
  `PricingPillar.jsx:96` (`plan.features.filter((f) => f.status !==
  'planned')`) filters every planned feature — including this one — out of
  the visible per-plan checklist entirely; it never renders the string "AI
  chat assistant" by name at all, folding it into an unlabelled "N more
  features on the roadmap" line (`PricingPillar.jsx:110-118`). The
  toggleable full comparison table on the same page (`PricingSection.jsx`,
  reading the `COMPARISON` row found above) renders it through `Cell()`
  (`PricingSection.jsx:10-24`), whose `'planned'` branch outputs an
  explicit gray pill reading "planned" with `aria-label="planned, not yet
  built"` — the opposite of an unqualified live claim.
  `CapabilityMatrix.jsx`/`capabilityMatrix.js` (the other honesty
  breakdown also mounted on `/pricing`) doesn't mention chat at all. So as
  of today, nowhere on the site claims this feature is live — the
  marketing-honesty violation this entry was originally opened to fix has
  already been closed by the unrelated planned-badge work that shipped
  around the same 2026-08-31/09-01 payments push this entry's own Gap 1
  deepening already cites. What's left to build is a genuinely useful,
  already-honestly-labelled feature, not a lie to correct — reframes this
  from "compliance fix" to "ship a nice-to-have," which changes how urgent
  it is relative to gaps that are still active false claims.
  **Minor code-quality note, not fixed here (no visible defect, would be a
  drive-by change):** `PricingPillar.jsx:97,99` still check
  `f.status === 'planned'` inside the `.map()` that line 96 already
  filtered to exclude that exact status — dead branches that can never
  execute. Flagged for whoever next touches that file; not this run's job
  per this backlog's own no-drive-by-cleanup rule.
  **New cross-cutting risk, worth knowing before anyone builds this:**
  `api/chat.js` reads `process.env.FEATHERLESS_API_KEY` (line 186) with no
  fallback provider — confirmed by grepping the file for
  `ANTHROPIC_API_KEY|NVIDIA_API_KEY|OPENAI_API_KEY|OPENROUTER_API_KEY`,
  zero hits. That is the *same* Featherless account issue #63 has open
  right now for the radar pipeline (overdue invoice, every call 403s).
  `e72ad27`, the fix issue #63 references, only wired the fallback
  secrets into `radar.yml` (a GitHub Actions job) — it never touched
  `api/` (Vercel functions), so `api/chat.js` has no failover today. Two
  consequences: (1) the live `/goal` quiz's server-side classification
  (`goalChat.js`'s `askServer`) is *also* silently degraded in production
  right now, not just the radar catalog — it fails closed to the offline
  `matchFreeText` matcher by design (`goalChat.js:285-289`), so nothing is
  visibly broken, but the "smart" free-text path has been unavailable for
  as long as issue #63 has been open; (2) if `api/copilot.js` were built
  exactly as this entry's own plan specs (copying `api/chat.js`'s