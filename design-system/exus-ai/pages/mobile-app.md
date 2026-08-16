# Mobile App Overrides (launch target: mobile-only)

> ⚠️ Rules here **override** `MASTER.md`. The product launches on mobile only —
> every screen is designed for 375–430px first; desktop is a dev convenience.

---

## Design Direction

**Feel:** every app open = re-entering space. Never a flat, static utility screen.

| Surface | Ambience |
|---------|----------|
| Landing `/` | Live WebGL galaxy, `mode="mobile"` tier (24k-point galaxy, 1200 stars, rotation ON, dpr ≤1.5, antialias off) |
| Quiz / Auth | CSS `.starfield` (drifting + twinkling stars, zero GPU) |
| App `/app/*` | Same `.starfield` — WebGL never mounts inside the app |
| Reduced motion | All drift/twinkle/rotation off; static nebula composition |

## Hard Rules

- **Touch targets ≥44px** (`min-h-11`+ on chips, `min-h-12`+ on primary buttons, `min-h-16` bottom nav items).
- **Press feedback everywhere:** `.press` utility (scale 0.96, 150ms) on every tappable element. No hover-dependent affordances.
- **Bottom nav:** exactly 5 items, icon + 11px label, active tab gets the cyan glow bar (`layoutId="nav-glow"` shared-element slide).
- **Safe areas:** top bars `pt-[max(1rem,env(safe-area-inset-top))]`, bottom nav `pb-[env(safe-area-inset-bottom)]`, FAB sits above the nav.
- **Screen transitions:** warp-in (opacity 0, y 14, scale 0.985 → identity, 280ms, ease `[0.16,1,0.3,1]`) keyed by pathname.
- **Filter rows swipe horizontally** (`overflow-x-auto no-scrollbar`, edge-bleed `-mx-5 px-5`), never wrap into tall blocks on mobile.
- **Chat = bottom sheet** (75dvh) on mobile, never a side column.
- **Inputs ≥16px font** (iOS zoom prevention) — already global.
- **Tap-highlight off, `touch-action: manipulation`** — global in index.css.
- **No pure-black backgrounds** (`#0a0a0f` base), no layout-shifting press states.

## Exploration Mechanics (retention)

- **Today's discovery** on My Stack: date-seeded rotation through the user's top-12 matched, not-yet-added tools. Same pick all day, new pick tomorrow.
- **Time-of-day greeting** above the persona name.
- **Staggered card entrances** (50ms/card, ≤8 cards animated).
- Discover results ranked by match score — the top of the list changes as the stack grows.

## Meta / Platform

- `viewport-fit=cover`, `theme-color #060609`, apple/mobile web-app-capable meta set in index.html (PWA manifest still TODO).
