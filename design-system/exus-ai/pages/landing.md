# Landing Page Overrides

> **PROJECT:** EXUS AI
> **Generated:** 2026-07-11 23:30:14
> **Page Type:** Landing / Marketing

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility
- **Sections:** 1. Full-screen interactive element, 2. Guided product tour, 3. Key benefits revealed, 4. CTA after completion

### Spacing Overrides

- **Content Density:** High — optimize for information display

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Immersive experience colors. Dark background for focus. Highlight interactive elements.

### Component Overrides

- Avoid: Static output only
- Avoid: Present AI as human
- Avoid: Load 50MB textures

---

## Page-Specific Components

### 3D Scene (React Three Fiber) — Hard Rules

- **Single renderer per page.** One `<Canvas>` for the lifetime of the landing page; swap scene content, never remount the Canvas between sections (multiple WebGL contexts crash mobile).
- **Cap pixel ratio:** `dpr={[1, 2]}` on the Canvas — never uncapped `devicePixelRatio`.
- **Particle ceiling:** starfield/particles start at 3,000; profile on a real mid-range phone before raising. Never ship 100k+ untested.
- **Touch parity:** every pointer interaction (planet hover, hub drag) must work via touch — use R3F pointer events (they normalize mouse+touch), test on 375px.
- **Mobile fallback is mandatory:** detect low-end devices (e.g. `navigator.hardwareConcurrency <= 4` or failed WebGL) and render a static gradient hero with the same CTA. The quiz must be reachable without the 3D scene ever loading.
- **Lazy load the scene:** dynamic-import the Canvas chunk; show the headline + CTA immediately, stream the 3D in behind it. Compress GLTF models (Draco/meshopt), no 50MB textures.
- **Skip option:** persistent "Skip to quiz →" link visible within 2s of load, per the Immersive pattern's conversion rule.
- **Reduced motion:** `prefers-reduced-motion` pauses planet orbit animation and disables camera drift; scene renders as a static composition.

### Tool Planet Hover Spec

- Hover/tap: scale 1.0 → 1.05 (spring, damping 20 / stiffness 90), emissive intensity up, glass tooltip card (`.card-glass`) with tool category name.
- Max 1 magnetic-cursor element on screen (the central hub CTA) — planets get simple scale/glow only.

---

## Recommendations

- Effects: Card hover effects (lift/scale), icon animations on scroll, feature toggle animations, smooth section transitions
- AI Interaction: Thumps up/down or 'Regenerate'
- AI Interaction: Clearly label AI generated content
- Sustainability: Compress and lazy load 3D models
- CTA Placement: After interaction complete + Skip option for impatient users
