# EXUS AI — Application Page Workflow & System Design

> Companion to `MASTER.md` (visual rules). This file defines **routes, shells, guards,
> state, and page-to-page workflow**. Source: the 11-phase app flow diagram (2026-07-12).
> Current code reality: `src/App.jsx` is a single-route landing page; quiz + galaxy
> explorer are modal overlays. This document defines the target routed architecture.

---

## 1. The Three App Shells

Every page lives inside exactly one shell. Shells own persistent UI; pages only render content.

| Shell | Routes | Persistent UI | Background |
|-------|--------|---------------|------------|
| **PublicShell** | `/`, `/pricing`, `/blog/*`, `/discover` (guest) | Top nav (logo, How it works, Pricing, CTA), footer | 3D galaxy scene (or StaticSky fallback) |
| **OnboardingShell** | `/quiz`, `/quiz/result`, `/auth/*` | Progress indicator, "Skip" escape link, minimal logo | Dimmed galaxy / portal ambience |
| **AppShell** | `/app/*` | Left sidebar (nav + persona badge), right AI-chat panel (collapsible), top bar (search, notifications) | Flat `#0B0A14` — **no 3D scene** (perf: the WebGL canvas unmounts once inside the app) |

Rule: the single `<Canvas>` lives in PublicShell/OnboardingShell only. Entering `/app` disposes it. Never two canvases.

---

## 2. Route Map

| Route | Page | Shell | Guard | Diagram phase |
|-------|------|-------|-------|---------------|
| `/` | Landing (3D) | Public | none | 1 |
| `/pricing` | Plans | Public | none | 1, 9 |
| `/discover` | Tool directory (SEO, limited for guests) | Public | none | 1, 6 |
| `/blog/*` | Content funnel | Public | none | 1 |
| `/quiz` | Onboarding quiz (steps 1–7 as sub-state, `?step=n`) | Onboarding | none — guests allowed | 3 |
| `/quiz/result` | Persona reveal + starter stack | Onboarding | requires completed quiz in store | 4 |
| `/auth/login` | Social + magic link + email | Onboarding | redirect to `/app` if already authed | 2 |
| `/auth/signup` | Registration (pre-filled from quiz) | Onboarding | same | 2 |
| `/auth/verify` | Email/magic-link verification | Onboarding | none | 2 |
| `/app` | → redirects to `/app/stack` | App | **authed** | 5 |
| `/app/stack` | My Stack dashboard (default view) | App | authed | 5 |
| `/app/discover` | Full discovery engine (search, filters) | App | authed | 6 |
| `/app/tools/:slug` | Tool detail (tabs: overview/features/pricing/reviews/tutorials/alternatives) | App | authed; deep-linkable | 6 |
| `/app/compare?tools=a,b` | Compare mode | App | authed, **Pro+** | 6 |
| `/app/learning` | Roadmap timeline | App | authed | 7 |
| `/app/learning/:milestoneId` | Milestone detail (tutorials, projects) | App | authed | 7 |
| `/app/community` | Forum home | App | authed | 8 |
| `/app/community/:threadId` | Thread | App | authed; deep-linkable | 8 |
| `/app/team` | Team workspace | App | authed, **Team plan** | 8 |
| `/app/settings/profile` | Profile & persona edit | App | authed | 10 |
| `/app/settings/notifications` | Notification prefs | App | authed | 10 |
| `/app/settings/data` | Export / privacy / API keys | App | authed | 10 |
| `/app/settings/billing` | Plan & invoices (Stripe portal) | App | authed | 9, 10 |
| `/admin/*` | Analytics, tool DB admin | App (admin variant) | **role: admin** | 11 |
| `*` | 404 → suggests `/app/discover` search | Public | none | — |

Deep-linking rule (from flow diagram + UX `deep-linking`): every route above is shareable.
Quiz steps use query params so refresh/back restores position. Tool detail pages are the
SEO surface — they render meta tags for social shares.

---

## 3. Core Page Workflows

### 3.1 First-time visitor (the money path)

```
/                    Landing: 3D scene, "Enter the Universe" CTA
  │  CTA click (analytics: quiz_start)
  ▼
/quiz?step=1         Role question ──► adapts branch per answer
  │  ... steps 2–7 (experience, budget, goals, stack, style, team)
  │  quiz state saved to localStorage after EVERY answer (guest has no server)
  ▼
/quiz/result         Persona reveal + 3–5 starter tools + 4-week roadmap preview
  │                  ← This is the emotional peak. Signup CTA lives HERE,
  │                    after value is shown, per Immersive pattern rule.
  ▼
/auth/signup         Social / magic link. On success:
  │                  quiz answers + persona POSTed from localStorage → server
  ▼
/app/stack           Dashboard, pre-populated. Zero-empty-state first session.
```

**Invariant:** signup is never demanded before `/quiz/result`. Guests keep full quiz access;
losing this breaks the "Friend Experience" funnel.

### 3.2 Returning user

```
/  ──► authed? ──yes──► auto-redirect banner "Continue to your stack →" (no forced redirect;
                         they may want the landing page)
/auth/login ──► authed ──► /app/stack (or `?next=` param if they hit a guarded route)
```

### 3.3 Guest hitting a wall (conversion points)

```
/discover (guest)      : browse 20 tools max ──► "Unlock 300+ tools" → /quiz (not /pricing!)
/app/* (unauthed)      : redirect /auth/login?next=<route>
/app/compare (Student) : Pro upsell modal, dismissible, link to /app/settings/billing
/app/team (non-Team)   : Team upsell page (not modal — it's a destination)
```

Upsell rule: guests are always routed **toward the quiz**, not the pricing page —
the quiz is the converter. Pricing is for people who already have a persona.

### 3.4 In-app AI chat (cross-cutting, not a route)

Chat panel state is global (open/collapsed/floating-bubble), persists across `/app/*`
navigation, and carries route context: on `/app/tools/:slug` it primes "Ask about {tool}".
On mobile it is a bottom sheet, never a third column.

---

## 4. Route Guards (single source of truth)

```
guard(route):
  session = authStore.session          // null | { user, plan: student|pro|team, role }
  if route.requiresAuth && !session        → /auth/login?next=route
  if route.minPlan && !planAtLeast(...)    → render <UpsellGate plan=...> (in place, keep URL)
  if route.requiresAdmin && role != admin  → 404 (don't reveal admin exists)
  if route is /auth/* && session           → /app/stack
  if route is /quiz/result && !quizStore.completed → /quiz?step=1
```

Plan gates render **in place** (URL unchanged) so upgrading returns you exactly where you were.

---

## 5. State Architecture

| Store | Lives | Persisted | Contents |
|-------|-------|-----------|----------|
| `authStore` | global | httpOnly cookie (session) + memory | user, plan, role |
| `quizStore` | global | **localStorage** (guest-safe) | answers, currentStep, completed, persona draft |
| `stackStore` | global | server (React Query cache) | user's tools, progress %, roadmap |
| `chatStore` | global | server (history) + memory (panel UI state) | messages, panel open/collapsed, route context |
| `uiStore` | global | localStorage | sidebar collapsed, sound on, reduced-motion override |
| `galaxyStore` (existing) | PublicShell only | memory | 3D scene interaction state |
| Page state (filters, search, tabs) | **URL query params** | — | shareable + back-button-safe per `state-preservation` |

Server data via React Query (or SWR): tools DB, community, roadmap, billing. Client stores
never duplicate server truth — they hold session/UI/draft state only.

Analytics: every route change fires `page_view`; guards fire `gate_hit` with reason.
Existing `useAnalytics` hook stays the single funnel.

---

## 6. Migration Plan (current code → this architecture)

1. **Add `react-router-dom`.** Wrap `main.jsx` in the router; current `App.jsx` becomes
   `pages/Landing.jsx` under PublicShell (3D scene, sections, explorer stay as-is).
2. **Promote quiz from modal to `/quiz` route.** Reuse `QuizPortal` internals; keep the
   portal-open animation as the route transition. Add localStorage persistence to
   `quizStore` (new — extract from component state + `quizLogic.js`).
3. **Build `/quiz/result`** from `personaGenerator.js` output — this page already has its
   logic written, it just needs a surface.
4. **Stub AppShell** with sidebar + empty `/app/stack` behind a fake-auth flag, so layout
   and guards are testable before real auth lands.
5. **Wire real auth** (Supabase/Firebase — pick when backend starts), replace fake flag,
   add the `?next=` redirect logic.
6. Discover / Learning / Community / Billing pages land in that order (mirrors the
   week-by-week build plan).

---

## 7. Non-negotiables carried from MASTER.md + flow diagram

- One WebGL canvas, PublicShell only; `/app` is canvas-free.
- Quiz reachable and completable with zero JS-heavy 3D (StaticSky path already exists — keep it).
- Every `/app` page: skeleton loading state, empty state with action, error state with retry.
- Mobile: sidebar → bottom nav (max 5: Stack, Discover, Learning, Community, More);
  chat panel → bottom sheet.
- Back button always works: filters/tabs/steps in URL, scroll restoration on.
