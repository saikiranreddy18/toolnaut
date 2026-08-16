# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** EXUS AI
**Generated:** 2026-07-11 23:30:14
**Category:** Podcast Platform
**Design Dials:** Variance 7/10 (Balanced / Modern) | Motion 8/10 (Complex) | Density 5/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#7C3AED` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Primary (text on dark) | `#A78BFA` | `--color-primary-text` |
| Secondary | `#A78BFA` | `--color-secondary` |
| Accent/CTA | `#22D3EE` | `--color-accent` |
| On Accent | `#0B0A14` | `--color-on-accent` |
| Background | `#0B0A14` | `--color-background` |
| Surface/Card | `#14121F` | `--color-surface` |
| Surface Elevated | `#1D1A2E` | `--color-surface-elevated` |
| Foreground | `#EDEBFA` | `--color-foreground` |
| Muted Foreground | `#9D97BD` | `--color-muted-foreground` |
| Border | `#2A2740` | `--color-border` |
| Destructive | `#F87171` | `--color-destructive` |
| Ring | `#A78BFA` | `--color-ring` |

**Color Notes:** AI purple + cyan interactions, mapped to a dark-first (OLED-safe) surface scale. Background is deep indigo-black `#0B0A14` — never pure `#000000` (OLED smear per style guide). Use `#A78BFA` for purple text/links on dark (7.5:1); reserve `#7C3AED` for filled buttons with white text. CTA cyan `#22D3EE` takes dark text (`#0B0A14`), ~10:1. Muted foreground `#9D97BD` clears 4.5:1 on the background.

**Glow accents (use sparingly):** `box-shadow: 0 0 24px rgba(124,58,237,0.35)` for primary focal elements; `text-shadow: 0 0 10px rgba(167,139,250,0.4)` for hero headings only.

### Typography

- **Heading Font:** Space Grotesk
- **Body Font:** DM Sans
- **Mood:** tech, startup, modern, innovative, bold, futuristic
- **Google Fonts:** [Space Grotesk + DM Sans](https://fonts.google.com/share?selection.family=DM+Sans:wght@400;500;700|Space+Grotesk:wght@400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 5/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

*Dark-mode note: shadows read poorly on `#0B0A14` — elevation is conveyed primarily by surface color steps (`#0B0A14` → `#14121F` → `#1D1A2E`) and border lightening, with shadows as reinforcement.*

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.45)` | Cards, buttons |
| `--shadow-lg` | `0 10px 30px rgba(0,0,0,0.5)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 60px rgba(0,0,0,0.5)` | Hero images, featured cards |
| `--glow-primary` | `0 0 24px rgba(124,58,237,0.35)` | Focal 3D hub, primary CTA hover |
| `--glow-accent` | `0 0 20px rgba(34,211,238,0.35)` | Accent CTA hover |

---

## Component Specs

### Buttons

```css
/* Primary CTA Button — cyan, dark text */
.btn-primary {
  background: #22D3EE;
  color: #0B0A14;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.35);
}

/* Brand Button — purple fill, white text */
.btn-brand {
  background: #7C3AED;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

/* Secondary Button — outline on dark */
.btn-secondary {
  background: transparent;
  color: #A78BFA;
  border: 2px solid #A78BFA;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: rgba(167, 139, 250, 0.1);
}
```

### Cards

```css
.card {
  background: #14121F;
  border: 1px solid #2A2740;
  border-radius: 12px;
  padding: 24px;
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  border-color: #3D3760;
  background: #1D1A2E;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(124, 58, 237, 0.12);
}

/* Glass variant — for panels over the 3D scene */
.card-glass {
  background: rgba(20, 18, 31, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(167, 139, 250, 0.15);
  border-radius: 16px;
}
```

### Inputs

```css
.input {
  background: #14121F;
  color: #EDEBFA;
  padding: 12px 16px;
  border: 1px solid #2A2740;
  border-radius: 8px;
  font-size: 16px; /* never below 16px — prevents iOS auto-zoom */
  transition: border-color 200ms ease;
}

.input::placeholder {
  color: #9D97BD;
}

.input:focus {
  border-color: #A78BFA;
  outline: none;
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.25);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(5, 4, 10, 0.6); /* 40-60% scrim per style guide */
  backdrop-filter: blur(8px);
}

.modal {
  background: #1D1A2E;
  border: 1px solid #2A2740;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Modern Dark (Cinema Mobile)

**Keywords:** dark mode, cinematic, ambient light, glassmorphism, deep black, indigo, glow, blur, atmospheric, reanimated, haptic, premium, layered, frosted glass, linear gradient

**Best For:** Developer tools, pro productivity apps, fintech/trading dashboards, media/streaming platforms, AI tool interfaces, high-end gaming companion apps

**Key Effects:** Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)

### Page Pattern

**Pattern Name:** Immersive/Interactive Experience

- **Conversion Strategy:** 40% higher engagement. Performance trade-off. Provide skip option. Mobile fallback essential.
- **CTA Placement:** After interaction complete + Skip option for impatient users
- **Section Order:** 1. Full-screen interactive element, 2. Guided product tour, 3. Key benefits revealed, 4. CTA after completion

---

## Motion

**Hover Micro-interaction** (Complex) — Trigger: hover + mousemove | Duration: 300-500ms | Easing: `elastic.out(1,0.4)`

```js
const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'elastic.out(1,0.4)' }); const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'elastic.out(1,0.4)' }); el.addEventListener('mousemove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width/2) * 0.3); yTo((e.clientY - r.top - r.height/2) * 0.3); });
```

**Framework notes:** Debounce is not needed since quickTo interpolates; remove listeners on component unmount in React/Vue to avoid leaks

- ✅ Clamp the pull strength (e.g. * 0.3) so the element never fully leaves its hit box
- ❌ Don't apply magnetic effect to more than 1-2 focal elements per screen; it becomes noisy
- ⚡ Use will-change: transform on the target element for smoother compositing

---

## Anti-Patterns (Do NOT Use)

- ❌ Poor audio player
- ❌ Cluttered layout

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Dark mode: body text 4.5:1 minimum, secondary text 3:1 minimum (verify against `#0B0A14` and `#14121F`)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
