# Toolnaut — Application Audit

**Audited:** 29 August 2026 · **Commit:** `dd0f0d7` · **Version:** 0.31.0
**Live:** https://toolnaut.xyz · **Method:** repository inspection, local production build, headless browser, live HTTP probes

Every claim below is tagged:

- **[V] Verified** — reproduced in code, in a browser, or against the live site. Command or file:line given.
- **[L] Likely** — strongly implied by evidence but not directly executed.
- **[U] Unverified** — could not be tested; the reason is stated.

---

## 1. Executive summary

Toolnaut is a **client-rendered React SPA with no user database**. Authentication is real; persistence is not. The product is well-built at the component level and unusually honest in its own comments, but three foundations are missing before any subscription can be sold: durable user data, analytics, and a trustworthy tool-data model.

**The single most important finding:** an account exists in `auth.users`, but **nothing an account does is attached to it**. Stack, saved tools, quiz answers, roadmap, progress, streak and avatar are all `localStorage`. Signing in synchronises nothing, because there is nothing on a server to synchronise. **[V]**

A sync layer and schema were written during this audit cycle and are committed, but **inert**: the required tables do not exist in the Supabase project. Live probe confirms `POST /rest/v1/rpc/sync_available` → **HTTP 404**. **[V]**

**Analytics collect nothing.** `VITE_GA4_ID` is unset in production, so `initAnalytics()` never loads gtag. Every funnel event in `analyticsEvents.js` fires into a `dataLayer` that is never transmitted. There is no data with which to evaluate any product decision. **[V]**

**There is no payment integration of any kind.** No Stripe, Paddle, Lemon Squeezy or equivalent appears in `package.json`. Pricing is a marketing page; checkout does not exist. **[V]**

### Readiness

| Dimension | State |
|---|---|
| Discovery / catalogue | **Strong** — 781 tools, prerendered, indexable |
| Guest experience | **Strong** — no gate, honest about local storage |
| Accessibility | **Good** — skip link, 0 nested interactives on Find, focus styles |
| Rendering / SEO | **Good** — 14 routes prerendered with per-route canonicals |
| Durable user data | **Absent** — local only |
| Analytics | **Absent** — configured but never enabled |
| Tool-data trust model | **Weak** — no integrations, privacy, sources or verification dates |
| Subscription readiness | **Not ready** — no billing, no recurring value, no durable state |

---

## 2. Verified application overview

Toolnaut lets a visitor browse 781 AI tools, answer a nine-question conversational intake, receive a persona and a scored shortlist, add tools to a stack, save a shortlist, follow a four-week roadmap, and view a community feed. **[V]**

All of it works without an account. **[V]** — verified live: `GET /app` with cleared storage lands on `/app/stack`, renders 22,027 characters, no redirect to `/auth/login`.

---

## 3. Architecture map

| Area | Files / directories | Purpose | Notes / risk |
|---|---|---|---|
| App entry | `src/main.jsx`, `src/App.jsx` | Boot, router, route effects | SPA only; no SSR framework |
| Routes | `src/App.jsx:80–124` | 20 route definitions | Flat, all client-side |
| Auth | `src/state/authStore.js`, `src/utils/supabase.js`, `src/components/auth/SignInModal.jsx` | Supabase OAuth + magic link | **Auth only — no data tables** |
| State stores | `src/state/*.js` (13 files) | All app state | `localStorage`, now uid-scoped |
| Storage scoping | `src/state/scopedStorage.js` | Per-account key namespacing | Added this cycle |
| Sync layer | `src/state/sync.js` | Server mirror | **Inert — tables absent** |
| Tool catalogue | `src/utils/toolsCatalog.js` (704), `public/tools.json` (77) | Static catalogue | No database; 275KB in bundle |
| Catalogue pipeline | `radar/` | Nightly discovery, 102 tests | Only tested code in the repo |
| Landing | `src/pages/Landing.jsx`, `src/components/sections/*` | Marketing | Prerendered |
| Styling | `src/index.css`, Tailwind v4 via `@tailwindcss/vite` | Design system | Custom arcade tokens, 4 themes |
| Prerender | `scripts/prerender.mjs`, `scripts/verify-prerender.mjs` | 14 static routes | Non-fatal; self-reports |
| Tests | `radar/test/*` | 102 tests | **Zero tests cover `src/`** |
| Deployment | `vercel.json`, Vercel Git integration | Static + rewrites | SPA fallback → `_shell.html` |
| Analytics | `src/utils/analyticsEvents.js` | GA4 wrapper | **Never initialised in prod** |
| Serverless | `api/chat.js` | Intake free-text matching | Correctly holds the only secret |

**Stack [V]:** React 19.0, Vite, react-router-dom 7.18, framer-motion 12, three 0.177 + @react-three/fiber 9, @supabase/supabase-js 2.112, lenis 1.3. JavaScript throughout — **no TypeScript**. npm.

---

## 4. Route map

| Route | Guest | Signed-in | Data source | States | Findings |
|---|:--:|:--:|---|---|---|
| `/` | ✅ | ✅ | Static + `tools.json` | n/a | Prerendered, 46KB HTML **[V]** |
| `/pricing` | ✅ | ✅ | `planData.js` | n/a | No checkout exists **[V]** |
| `/about`, `/methodology`, `/example` | ✅ | ✅ | Static | n/a | Prerendered **[V]** |
| `/privacy`, `/terms` | ✅ | ✅ | Static | n/a | Prerendered **[V]** |
| `/new` | ✅ | ✅ | `newTools.js` | Empty handled | Prerendered, 57KB **[V]** |
| `/tools/:domain` | ✅ | ✅ | `toolsCatalog` | Empty handled | 6 domains prerendered, JSON-LD **[V]** |
| `/s/:slugs` | ✅ | ✅ | URL-encoded slugs | Degrades on bad slug | Not prerendered (correct) |
| `/goal` | ✅ | ✅ | `quizStore` + `api/chat` | Typing indicator | Fixed-height chat frame **[V]** |
| `/quiz/result` | ✅ | ✅ | `personaGenerator` | — | — |
| `/auth/login` | ✅ | redirects | Supabase | Error copy present | Google + magic link **[V]** |
| `/app` → `/app/stack` | ✅ | ✅ | localStorage | Full first-run state | **No gate** **[V]** |
| `/app/discover` | ✅ | ✅ | `toolsCatalog` | Empty/no-results | Paginated at 24 **[V]** |
| `/app/favorites` | ✅ | ✅ | `favoritesStore` | Empty + starter picks | **[V]** |
| `/app/learning` | ✅ | ✅ | `roadmapStore` | Needs-persona state | **[V]** |
| `/app/community` | ✅ | ✅ | 8 seeded threads | Empty handled | Seed data labelled **[V]** |
| `/app/settings` | ✅ | ✅ | All stores | Guest card | Two-column on xl **[V]** |
| `/app/tools/:slug` | ✅ | ✅ | `toolsCatalog` | Not-found state | **[V]** |
| `/app/compare?tools=` | ✅ | ✅ | URL params | Empty handled | Max 4 **[V]** |
| `/app/community/:id` | ✅ | ✅ | `communityStore` | — | — |
| `*` | ✅ | ✅ | — | Renders Landing | **No real 404 page** — see UX-004 |

**Missing routes:** `/auth/signup` (sign-in is unified), `/app/find`, `/app/saved`, `/app/learn`, `/app/squad`, `/app/me` — the nav *labels* are FIND/SAVED/LEARN/SQUAD/ME but the *URLs* are `/discover`, `/favorites`, `/learning`, `/community`, `/settings`. **[V]** `src/shells/AppShell.jsx:18–24`. Cosmetic, but it makes analytics paths and shared links read inconsistently with the UI.

---

## 5. Authentication findings

| Area | Behaviour | Evidence | Risk | Recommendation |
|---|---|---|---|---|
| Provider | Supabase Auth; Google + email magic link | `authStore.js:103,137` | — | — |
| Enabled providers | `google: true`, `email: true`, `github: false` | Live `/auth/v1/settings` **[V]** | — | GitHub button removed this cycle |
| Client init | Single client, guarded on env presence | `utils/supabase.js:28` | Low | — |
| Session read | Synchronous mirror in `localStorage` | `authStore.js:53–60` | Low | Documented, deliberate |
| Restore on boot | `watchSession` via `getSession` + `onAuthStateChange` | `authStore.js:65–85` | Low | — |
| Route guards | **None** | `AppShell.jsx:65–75` | Intentional | Guest mode by design |
| Null safety | `session?.plan`, `session?.user` optional-chained | `AppShell.jsx:128`, `Settings.jsx` | Low | Fixed this cycle |
| `next` preservation | Read, then `postAuthDestination()` | `Login.jsx:24`, `postAuth.js` | **Medium** | See SEC-001 |
| Sign-out | Clears only `exus_session_v1` | `authStore.js:147–152` | Low *now* | Safe since scoping; was a leak |
| Server persistence | **None enabled** | `sync_available` → 404 **[V]** | **Critical** | Run migration |
| Privileged keys | None client-side | grep: no `SERVICE_ROLE` in `src/` **[V]** | — | Correct |
| Password rules / reset | N/A — passwordless | — | — | Correct posture |
| Rate limiting | Delegated to Supabase | **[U]** | Low | Supabase defaults apply |

**Sign-in was not executed end to end [U].** Completing real Google OAuth would create an account in the production project; I did not do that. Configuration was verified instead: `POST /auth/v1/authorize?provider=google` returns `302` to `accounts.google.com` with a valid client ID.

---

## 6. Data and persistence findings

### 6.1 Ownership table

| Entity | Storage | Guest | Server-backed | Cross-device | Risk | Next step |
|---|---|:--:|:--:|:--:|---|---|
| Stack | `exus_stack_v1` | ✅ | ❌ | ❌ | **High** | Run `0002` |
| Saved tools | `exus_favorites_v1` | ✅ | ❌ | ❌ | **High** | Run `0002` |
| Quiz answers | `exus_quiz_v1` | ✅ | ❌ | ❌ | **High** | Run `0002` |
| Roadmap progress | `exus_roadmap_v1` | ✅ | ❌ | ❌ | **High** | Run `0002` |
| Tool progress | `exus_progress_v1` | ✅ | ❌ | ❌ | Medium | Phase 2 |
| Streak | `exus_streak_v1` | ✅ | ❌ | ❌ | Low | Phase 2 |
| Avatar | `exus_avatar_v1` | ✅ | ❌ | ❌ | Low | Covered by `0002` |
| Threads/replies/upvotes | `exus_threads_v1` etc. | ✅ | ❌ | ❌ | Medium | Needs real backend |
| **Subscription plan** | Hardcoded `'shishya'` | ✅ | ❌ | ❌ | **See SEC-002** | Server-owned entitlement |
| Alerts | Does not exist | — | — | — | — | Not built |
| Theme / moon / quality | `localStorage` | ✅ | ❌ | ❌ | None | Correct — device-scoped |

**18 `localStorage` keys total [V].** Nine stores route through `scopedStorage.js`; three device-preference stores deliberately do not.

### 6.2 Direct answers

- **Local-first, server-none.** Not hybrid — there is no server tier for user data. **[V]**
- **Can a signed-in user reach their data on another device?** **No.** **[V]**
- **After clearing storage?** Everything is gone permanently. No recovery path. **[V]**
- **After logout/login?** Data survives under `<key>::<uid>` and returns to that account. Since scoping, a *different* account correctly sees nothing. **[V]** — tested with `uid-AAA` / `uid-BBB`.
- **If `localStorage` is corrupt/unavailable?** Every read is `try/catch` with a typed fallback. `scopedStorage.js:44–52`. Verified by inspection **[V]**; not tested under a blocked-storage browser **[U]**.
- **When a guest signs up?** `GuestImportPrompt` offers to adopt local data, naming what it found. Declining **clears** it so the next account cannot inherit it. **[V]**
- **Can guest data be lost?** Yes — clearing the browser, or choosing "Start fresh". No server copy exists as a fallback. **[V]**
- **Is any local value used for authorization?** `plan` is read from the session mirror and rendered. It is not enforced against anything, because nothing is gated. **This becomes a critical flaw the moment a paywall ships** — see SEC-002.

### 6.3 Migration plan

`supabase/migrations/0002_user_state.sql` is written and committed. Three tables — `profiles`, `tool_refs` (`kind = stack|saved`), `roadmap_progress` — with RLS enabled and separate SELECT/INSERT/UPDATE/DELETE policies keyed on `auth.uid()`.

**Deliberate deviation from the six-table proposal.** `stacks` / `stack_items` / `roadmaps` model *multiple named stacks per user*. Toolnaut has one stack, an array of slugs. Shipping `stacks.title` now encodes a product decision that does not exist yet. Adding it later is a nullable `stack_id` on `tool_refs`, not a rewrite.

- **Idempotency:** composite PK `(user_id, tool_slug, kind)` — retry conflicts rather than duplicating.
- **Conflict policy:** tool lists are delete-then-insert (local is truth for that user); progress is upsert-only and merges, so furthest progress wins without a prompt.
- **Rollback:** `drop table` on the three tables restores today's behaviour exactly — the client feature-detects and goes inert.
- **Test plan:** guest builds stack → sign in → import → verify rows; second browser → pull; clear storage → pull; sign in as B → confirm zero rows readable; attempt cross-user read with a forged `user_id` → expect RLS denial.

---

## 7. Tool-data model findings

**Fields present [V]** (`toolsCatalog.js`): `slug, name, category, sourceCategory, price, pricing, level, blurb, audience, dev, year, website, status, note, tags`.

| Field | Exists | Source | Structured | Last verified | User-visible | Risk |
|---|:--:|---|:--:|:--:|:--:|---|
| Canonical ID / slug | ✅ | `toolsCatalog.js` | ✅ | ❌ | ❌ | — |
| Name / URL | ✅ | same | ✅ | ❌ | ✅ | — |
| Category | ✅ | same | ⚠️ single string | ❌ | ✅ | No many-to-many |
| Use cases | ❌ | — | — | — | — | Cannot answer "tools for X task" |
| Pricing | ⚠️ | `price` + free-text `pricing` | ❌ | ❌ | ✅ | **Unsourced, undated** |
| Free plan / trial | ❌ | — | — | — | — | Key filter missing |
| **Integrations** | ❌ | — | — | — | — | **Cannot answer "works with n8n?"** |
| API / webhooks | ❌ | — | — | — | — | Missing |
| Self-hosting | ❌ | — | — | — | — | Missing |
| Open source | ❌ | — | — | — | — | Missing |
| **Privacy / training** | ❌ | — | — | — | — | **Missing** |
| Retention / deletion | ❌ | — | — | — | — | Missing |
| Security / compliance | ❌ | — | — | — | — | Missing |
| Evidence / source URLs | ❌ | — | — | — | — | **No provenance** |
| **`last_verified_at`** | ❌ | — | — | — | — | **Freshness unknowable** |
| Status | ✅ | `status` | ⚠️ free text | ❌ | ✅ | Not enumerated |
| Sponsored / affiliate | ❌ | — | — | — | — | **No disclosure field** |
| Limitations | ⚠️ | `note` | ❌ | ❌ | ⚠️ | Unstructured |

**This is the weakest area of the product.** Pricing is shown as fact with no source and no date. `discoveredAt` exists but records when *Toolnaut found the tool*, not when a claim was last checked — it cannot support a "verified on" label.

**Recommended freshness cadence:** status/homepage monthly; pricing monthly or on detected change; integrations 60–90 days; privacy/security 90 days; editorial 6–12 months. Where a fact is unknown the UI must say **"Not verified"**, never omit-and-imply.

---

## 8. UI/UX findings

**UX-001 · Severity: High · Area: Conversion / Me**
**Evidence:** `src/components/sections/StatsSection.jsx:35–50`; live landing page.
**Now:** The Explorers tile is hidden because `explorer_count()` returns 404. Community row shows only seeded Subscribers/Conversion under a "preview figures" chip.
**Harm:** The landing page's only social proof is two figures openly labelled as previews. That is honest but weak.
**Fix:** Run `0001`. If the true number reads small, lead with the counted **781 tools mapped** instead.
**Effort:** S · **Depends on:** migration.

**UX-002 · Severity: High · Area: Conversion**
**Evidence:** `src/pages/Pricing.jsx`; `package.json` dependencies.
**Now:** Pricing presents plans with no checkout anywhere in the codebase.
**Harm:** Every upgrade intent dead-ends. Any measured "pricing viewed" is unactionable.
**Fix:** Either wire a payment provider or relabel plans as a roadmap with a waitlist.
**Effort:** L · **Depends on:** business decision.

**UX-003 · Severity: Medium · Area: Navigation**
**Evidence:** `AppShell.jsx:18–24` vs `App.jsx:108–116`.
**Now:** Labels FIND/SAVED/LEARN/SQUAD/ME map to `/discover`, `/favorites`, `/learning`, `/community`, `/settings`.
**Harm:** Shared URLs and analytics paths do not match the words users saw.
**Fix:** Alias new paths, 301 the old ones.
**Effort:** M.

**UX-004 · Severity: Medium · Area: Navigation**
**Evidence:** `App.jsx:124` — `<Route path="*" element={<Landing />} />`.
**Now:** Every unmatched URL renders the landing page at HTTP 200.
**Harm:** A typo'd link looks like the homepage; crawlers see infinite duplicate content at 200.
**Fix:** Real 404 with search and popular categories.
**Effort:** S.

**UX-005 · Severity: Medium · Area: Trust**
**Evidence:** `toolsCatalog.js` — no source or date fields.
**Now:** Pricing and status presented as current fact with no provenance.
**Harm:** One stale price destroys trust in the whole catalogue; this is the core promise.
**Fix:** Add `last_verified_at` + `source_url`; show "Pricing verified 26 Aug 2026" or "Not verified".
**Effort:** L.

**UX-006 · Severity: Low · Area: Squad**
**Evidence:** `src/utils/communityData.js` — 8 `seed()` threads.
**Now:** Community feed is seeded content from invented handles.
**Harm:** Reads as a real community; a returning user notices nothing ever changes.
**Fix:** Label as examples, as the leaderboard already does.
**Effort:** S.

### First-time visitor flow

Understandable in 10 seconds **[V]** — `/` h1 reads "BUILD THE AI WORKFLOW FOR YOUR JOB". CTA is specific ("60 seconds"). First value arrives **before** sign-up: guests reach the full app. **Activation event** should be defined as *intake completed + one of (tool saved, comparison opened, roadmap step ticked)* — currently unmeasurable.

### Guest-to-account flow

Honest **[V]** — sidebar says "Browsing as guest — saved to this browser." ME states signing in "does not sync anything yet". Import prompt preserves guest work. **But there is currently no benefit to signing in**, and the copy correctly admits it. This is the conversion blocker, and it is a data problem, not a copy problem.

---

## 9. Accessibility findings

| Issue | WCAG | Severity | Route/component | Evidence | Fix |
|---|---|---|---|---|---|
| No `<h1>` | 1.3.1 | ~~High~~ **Fixed** | `/pricing` | Was headingless; `titleAs` added | Done |
| Nested interactives | 4.1.2 | ~~Critical~~ **Fixed** | Find | 3,004 → **0** | Done |
| Skip link | 2.4.1 | ✅ Present | `AppShell.jsx:100` | Verified | — |
| Touch targets | 2.5.8 | ~~Medium~~ **Fixed** | Mobile | 15px → 43px | Done |
| Heading count | 1.3.1 | ✅ | Find | 1 → 27 | — |
| Reduced motion | 2.3.3 | ✅ | Global | `MotionConfig reducedMotion="user"`, CSS guards | — |
| Focus visible | 2.4.7 | ✅ | Global | `:focus-visible` at `index.css:228` | — |
| Dialog focus mgmt | 2.4.3 | ⚠️ **Open** | `GuestImportPrompt` | `role="dialog"`/`aria-modal` set; **no focus trap, no initial focus, no Escape** | Add trap + Escape · S |
| Live regions | 4.1.3 | ✅ | Find, Sync | `aria-live="polite"` | — |
| Colour contrast | 1.4.3 | **[U]** | Global | Not measured — no contrast tooling run | Run axe · S |
| Horizontal overflow | 1.4.10 | ✅ | 375px | `scrollWidth === 375` | — |

**A11y-001 · Medium** — `GuestImportPrompt.jsx` is a modal with no focus trap, no autofocus, and no Escape handler. A keyboard user can tab behind it. **Effort: S.**

Contrast was **not** measured **[U]** — the browser pane could not composite frames for pixel sampling, so no automated axe/contrast pass ran. Recommend `@axe-core/playwright` in CI.

---

## 10. Performance, SEO and rendering findings

| Area | State | Evidence | Impact | Recommendation | Priority |
|---|---|---|---|---|---|
| Rendering | **Prerendered, 14 routes** | `_prerender-status.txt` → `14 routes written` **[V]** | Crawlers see content | — | Done |
| `/` initial HTML | 46,562 bytes, real `<h1>` | curl, no JS **[V]** | Indexable | — | Done |
| `/tools/design` | 143,476 bytes, 20,140 chars | curl **[V]** | Strong organic asset | — | Done |
| Canonicals | Per-route, self-referencing | curl **[V]** | Was homepage on every page | — | Done |
| Titles / OG | Per-route | curl **[V]** | — | — | Done |
| Structured data | `CollectionPage`/`ItemList` on 6 category pages | **[V]** | — | Add `WebSite` to `/` | P2 |
| `robots.txt` / sitemap | `Allow: /` + sitemap | **[V]** | — | — | — |
| SPA fallback | `_shell.html`, clean | `vercel.json` **[V]** | No landing flash | — | Done |
| **three.js** | **836KB**, not on landing critical path | **[V]** | Lazy only | Keep off `/` | — |
| **Entry chunk** | **710KB** | **[V]** | Loaded on every route | Split `lenis` + Supabase | **P1** |
| Total `dist` | 3.0MB | **[V]** | — | — | — |
| Catalogue in bundle | 275KB `toolsCatalog.js` | **[V]** | Parsed on every visit | Move to fetched JSON | P2 |
| Security headers | **Only `Cache-Control`** | `curl -I` **[V]** | No CSP/HSTS/XFO | Add headers | **P1** |
| Core Web Vitals | **[U]** | Not measured | — | Run Lighthouse in CI | P2 |

**PERF-001 · P1** — the 710KB entry chunk ships the Supabase client and lenis to every visitor including those who never sign in. Route-splitting the auth client behind the first session read would cut first-load meaningfully.

---

## 11. Security findings

| Issue | Severity | Evidence | Impact | Mitigation | Priority |
|---|---|---|---|---|---|
| **SEC-001 Open redirect** | **Medium** | `SignInModal.jsx:87,112` — `window.location.assign(dest)`; `Login.jsx:24` reads `next` with **no validation** | `?next=https://evil.com` redirects off-site after sign-in. On prod the OAuth path prefixes `origin`, blunting it; the **simulated path and magic-link path assign `dest` raw** | Reject any `next` not matching `^/(?!/)` | **P1** |
| **SEC-002 Client-side plan** | **High (latent)** | `authStore.js:46` — `plan: 'shishya'` hardcoded client-side | Harmless today (nothing gated). **The moment a paywall ships, entitlement is a localStorage string** any user can edit | Plan must come from a server table with RLS; never trust the mirror | **P0 before billing** |
| No service-role key in client | ✅ | grep `SERVICE_ROLE` in `src/` → none **[V]** | — | Correct | — |
| Secret isolation | ✅ | `FEATHERLESS_API_KEY` only in `api/chat.js` **[V]** | — | Correct | — |
| `envPrefix` hardening | ✅ | `vite.config.js` excludes `SUPABASE_` deliberately to avoid bundling service-role | — | Well reasoned | — |
| XSS | ✅ | No `dangerouslySetInnerHTML`, no `innerHTML =` in `src/` **[V]** | — | — | — |
| **Missing security headers** | **Medium** | `curl -I` returns only `Cache-Control` **[V]** | No CSP, HSTS, X-Content-Type-Options, Referrer-Policy | Add to `vercel.json` | **P1** |
| RLS on new tables | ✅ (as written) | `0002_user_state.sql` — RLS + 4 policies per table | **[U]** — untestable until applied | Test allow/deny after migration | P0 |
| Sensitive data in localStorage | Low | Session mirror holds name/email, no tokens | Standard | — | — |
| Dependency CVEs | **[U]** | `npm audit` not run | — | Add to CI | P2 |

---

## 12. Analytics findings

**Nothing is collected. [V]**

`src/utils/analyticsEvents.js:55` reads `import.meta.env.VITE_GA4_ID`; grep of every live bundle chunk for `G-[A-Z0-9]{6,}` returns **zero matches**. `initAnalytics()` skips the gtag injection entirely. The 14 declared `EVENTS` constants push into a `dataLayer` that is never transmitted.

**Consequence:** no acquisition, activation, retention or conversion figure exists for any decision in this report.

Recommended: a single `track(event, props)` abstraction (the shape already exists in `hooks/useAnalytics.js`), with anonymous→identified aliasing on sign-in so guest activity connects to the account. Never send: emails, private notes, intake free-text, prompts, tokens.

**Minimum first six events**, in dependency order: `landing_viewed`, `onboarding_started`, `onboarding_completed`, `stack_generated`, `tool_saved`, `signup_completed`. Without these the activation rate cannot be computed at all.

---

## 13. Subscription readiness

**Not ready.** Three independent blockers, any one of which is disqualifying:

1. **No billing integration exists** **[V]** — nothing to charge with.
2. **No durable user data** **[V]** — you cannot sell "your stack, everywhere" when it dies with the browser cache.
3. **No analytics** **[V]** — you cannot tell whether anyone would pay.

Applying the test *"does this create new value next month?"*:

| Feature | Tier | Recurring? | Why |
|---|---|:--:|---|
| Browse catalogue, filters, tool pages | Free | ❌ | Acquisition; also the SEO engine |
| One personalised stack | Free | ⚠️ | Activation, one-time value |
| Cross-device sync + backup | **Pro** | ✅ | Value every time a device changes |
| Stack health / overlap / spend | **Pro** | ✅ | Changes as the stack changes |
| Price / feature / alternative alerts | **Pro** | ✅ | Strongest return trigger |
| Workflow templates | **Pro** | ✅ | Library grows monthly |
| Role learning paths + progress | **Pro** | ✅ | Unfolds over time |
| Shared stacks, approvals, governance | **Team** | ✅ | Ongoing team decisions |
| Social feed, gamification, 3D | **Postpone** | ❌ | No adoption evidence |

**The honest sequencing:** sync → analytics → tool-data trust → *then* packaging. Selling "saved stack" or "progress" today would be charging for state that vanishes when a browser clears its cache.

---

## 14. Issue backlog

| ID | P | Title | Files |
|---|:--:|---|---|
| DATA-001 | **P0** | User data has no server copy | `0002_user_state.sql` (unapplied) |
| SEC-002 | **P0*** | Plan/entitlement is client-side | `authStore.js:46` |
| ANL-001 | **P0** | Analytics collect nothing | Vercel env, `analyticsEvents.js:55` |
| SEC-001 | P1 | Open redirect via `next` | `SignInModal.jsx:87,112`, `Login.jsx:24` |
| SEC-003 | P1 | No security headers | `vercel.json` |
| PERF-001 | P1 | 710KB entry chunk | `vite.config.js` |
| TOOL-001 | P1 | No integrations / privacy / sources / verified dates | `toolsCatalog.js`, `radar/` |
| UX-002 | P1 | Pricing with no checkout | `Pricing.jsx` |
| TEST-001 | P1 | Zero tests cover `src/` | `radar/test/` only |
| UX-003 | P2 | Nav labels ≠ URLs | `AppShell.jsx:18–24` |
| UX-004 | P2 | `*` renders Landing at 200 | `App.jsx:124` |
| A11Y-001 | P2 | Modal without focus trap | `GuestImportPrompt.jsx` |
| A11Y-002 | P2 | Contrast never measured | CI |
| UX-006 | P3 | Seeded community unlabelled | `communityData.js` |

\* P0 *before* any paywall; inert today.

---

## 15. Prioritised 30-day plan

| P | Task | Why | Files | Effort | Impact | Depends |
|---|---|---|---|---|---|---|
| P0 | Run `0001` + `0002` in Supabase | Unblocks everything | migrations | S | Enables sync + count | **Owner** |
| P0 | Verify sync end-to-end incl. RLS deny | Untested code is not shipped | `sync.js` | M | Durable data | migration |
| P0 | Set `VITE_GA4_ID` (or PostHog key) | Nothing is measurable | Vercel env | S | All decisions | **Owner** |
| P0 | Instrument the six core events | Activation rate | `useAnalytics.js` | M | Baseline | analytics key |
| P1 | Validate `next` is relative | Open redirect | `SignInModal.jsx` | S | Closes SEC-001 | — |
| P1 | Add CSP/HSTS/XFO/Referrer-Policy | Missing entirely | `vercel.json` | S | Hardening | — |
| P1 | Split Supabase + lenis out of entry | 710KB on every route | `vite.config.js` | M | LCP | — |
| P1 | `last_verified_at` + `source_url` per volatile claim | Core trust promise | `radar/`, `toolsCatalog.js` | L | Trust | — |
| P1 | First tests for `src/` (stores, scoping, import) | Riskiest code untested | new | M | Regression safety | — |
| P2 | Real 404 | SEO + UX | `App.jsx` | S | — | — |
| P2 | Focus trap in modal | WCAG 2.4.3 | `GuestImportPrompt.jsx` | S | — | — |
| P2 | axe + Lighthouse in CI | Unmeasured | `ci.yml` | M | — | — |
| P2 | Align nav URLs to labels | Consistency | `AppShell.jsx` | M | — | — |

---

## 16. Required product decisions

1. **Analytics provider** — GA4 (already coded) or PostHog (better funnels/aliasing, needs a small adapter)?
2. **Does Pricing stay live without checkout?** Present plans as a roadmap + waitlist, or build billing now?
3. **Small explorer count, or lead with 781 tools?** The honest number will be low.
4. **Is Squad a product or a placeholder?** Seeded threads need labelling or removing.
5. **Who verifies tool facts, and how often?** The freshness model needs an owner, not just a column.
6. **Multiple named stacks — real roadmap item or not?** Determines whether the schema grows a `stacks` table.

---

## 17. Open questions / unverified

- **Real OAuth sign-in end-to-end [U]** — would create a production account.
- **Colour contrast [U]** — no pixel sampling available in this environment.
- **Core Web Vitals [U]** — no Lighthouse run.
- **`npm audit` [U]** — not run.
- **RLS allow/deny [U]** — tables do not exist yet.
- **Blocked-storage browser [U]** — guards inspected, not executed.
- **Supabase rate limits [U]** — provider defaults assumed.

---

## 18. Appendix — commands run

```
npm test                          → 102 pass, 0 fail
npm run build                     → ✓ built; prerender 14 routes, 0 skipped
npm run smoke                     → 18 routes render clean
node scripts/verify-prerender.mjs → PRERENDER VERIFIED (18 assertions)
curl -I https://toolnaut.xyz/     → 200; only Cache-Control
curl .../rpc/sync_available       → 404  (sync inert — confirms §1)
curl .../auth/v1/settings         → google:true email:true github:false
grep -rn "\.from(" src/           → explorerCount.js:26, sync.js only
grep -rhoE "G-[A-Z0-9]{6,}" dist/ → (no matches — analytics dead)
```

Browser checks ran at 1440×900, 1600×900 and 375×812 against `vite preview` (production build) and against a local mirror of the live bundle. Screenshots were not capturable — the browser pane could not composite frames — so all layout findings are DOM measurements (`getBoundingClientRect`, `scrollWidth`, `getComputedStyle`) rather than pixel inspection.
