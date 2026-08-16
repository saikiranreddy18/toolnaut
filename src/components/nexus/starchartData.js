// STARCHART landing — data for the cinematic Nexus story ("Chaos, Charted").
// Colors reuse the FounderOS/Nexus dark token accents.

export const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Roles', href: '#roles' },
  { label: 'Radar', href: '#radar' },
  { label: 'Pricing', href: '#pricing' },
]

// The example "Resolve" constellation — a Builder's stack. Positions live in a
// 1000×600 chart space; the SVG overlay scales them to the viewport. Each star
// carries its category accent so the shape reads as a real star-chart legend.
export const CONSTELLATION = {
  archetype: 'THE BUILDER',
  stars: [
    { name: 'Claude Code', x: 175, y: 205, color: '#84cc16', mag: 1.0 },
    { name: 'Cursor', x: 340, y: 120, color: '#06b6d4', mag: 0.9 },
    { name: 'v0', x: 520, y: 105, color: '#84cc16', mag: 0.8 },
    { name: 'Copilot', x: 690, y: 165, color: '#06b6d4', mag: 0.85 },
    { name: 'Figma', x: 835, y: 250, color: '#ec4899', mag: 0.8 },
    { name: 'Linear', x: 700, y: 345, color: '#7c3aed', mag: 0.75 },
    { name: 'Supabase', x: 505, y: 335, color: '#84cc16', mag: 0.9 },
    { name: 'Vercel', x: 330, y: 305, color: '#e6edf3', mag: 0.8 },
  ],
  // edges as [fromIndex, toIndex] — a connected chart with one crossing
  edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [2, 6]],
}

export const HOW_IT_WORKS = [
  { step: '01', title: 'Take the survey', text: 'Sixty seconds, one question set. Your role becomes the map’s origin point.' },
  { step: '02', title: 'Get your chart', text: 'The noise recedes. Only the tools that earn a place in your stack stay lit — named and connected.' },
  { step: '03', title: 'Follow the course', text: 'Day-zero tutorials, waypointed from your first tool to the frontier of your field.' },
]

// Six roles, each previewing a distinct mini sub-constellation (points in a
// 100×80 box) in that persona’s dominant accent.
export const ROLES = [
  { name: 'Student', color: '#fb7185', pts: [[18, 55], [40, 30], [64, 48], [82, 24]] },
  { name: 'PM', color: '#f59e0b', pts: [[20, 30], [46, 52], [70, 26], [84, 56], [50, 20]] },
  { name: 'Designer', color: '#ec4899', pts: [[16, 40], [38, 18], [58, 46], [80, 30], [66, 62]] },
  { name: 'Marketer', color: '#06b6d4', pts: [[22, 24], [44, 50], [68, 34], [86, 58]] },
  { name: 'Engineer', color: '#84cc16', pts: [[16, 30], [36, 54], [56, 26], [76, 50], [90, 28], [50, 66]] },
  { name: 'Founder', color: '#7c3aed', pts: [[20, 48], [42, 24], [62, 50], [84, 34], [56, 66]] },
]

export const RADAR_ITEMS = [
  { name: 'Antigravity', color: '#84cc16', why: 'Agent-first IDE on Gemini 3 — charted for engineers.', ago: '2d' },
  { name: 'Dia', color: '#06b6d4', why: 'AI-first browser with a built-in assistant.', ago: '3d' },
  { name: 'Figma Make', color: '#ec4899', why: 'Prompt-to-prototype, straight in Figma.', ago: '4d' },
  { name: 'Comet', color: '#7c3aed', why: 'Perplexity’s agentic web browser.', ago: '5d' },
]

export const PRICING = [
  {
    name: 'Explorer',
    price: 'Free',
    note: 'For finding your coordinates',
    features: ['One full sky-survey chart', 'Personalized starter stack', 'Browse all 704 tools', 'Weekly Radar digest'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Navigator',
    price: '$19',
    note: 'per month — early-access price, locked for life',
    features: ['Unlimited re-charts', 'Live Radar alerts, daily', 'Day-zero learning paths', 'Full AI usage report', 'Priority access to new phases'],
    cta: 'Get early access',
    featured: true,
  },
]
