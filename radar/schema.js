// Canonical schema for the radar pipeline. The tool record intentionally
// MATCHES the app's src/utils/toolsCatalog.js shape (so the app can read
// published records unchanged) and adds a provenance envelope the pipeline
// owns. Enums here are the single source of truth for the validate gate.

export const DOMAINS = ['code', 'design', 'writing', 'data', 'automation', 'learning']
export const PRICES = ['free', 'freemium', 'paid']
export const LEVELS = ['beginner', 'intermediate', 'advanced']
export const LIFECYCLE = ['staged', 'in_review', 'published', 'deprecated']

export const PRICE_LABELS = { free: 'Free / Open', freemium: 'Freemium', paid: 'Paid' }

// The 26 real categories from the app catalog, each mapped to one of the 6
// galaxy domains. Kept in sync with src/utils/toolsCatalog.js SOURCE_CATEGORIES.
export const SOURCE_CATEGORIES = [
  { id: 'AI Coding & Development', domain: 'code' },
  { id: 'ML Infrastructure & LLMOps', domain: 'code' },
  { id: 'Security', domain: 'code' },
  { id: 'AI Hardware & Devices', domain: 'code' },
  { id: 'Image Generation & Editing', domain: 'design' },
  { id: 'Video Generation & Avatars', domain: 'design' },
  { id: 'Audio, Music & Voice', domain: 'design' },
  { id: 'Presentations, Design & Websites', domain: 'design' },
  { id: '3D, Gaming & Simulation', domain: 'design' },
  { id: 'Marketing, SEO & Sales', domain: 'writing' },
  { id: 'LLMs & Chatbots', domain: 'writing' },
  { id: 'Writing & Editing', domain: 'writing' },
  { id: 'Legal', domain: 'writing' },
  { id: 'Companions & Characters', domain: 'writing' },
  { id: 'Translation & Dubbing', domain: 'writing' },
  { id: 'Search & Research', domain: 'data' },
  { id: 'Data & Analytics', domain: 'data' },
  { id: 'Healthcare & Wellness', domain: 'data' },
  { id: 'Finance & Accounting', domain: 'data' },
  { id: 'AI Detection & Moderation', domain: 'data' },
  { id: 'Science & Biotech', domain: 'data' },
  { id: 'Productivity & Meetings', domain: 'automation' },
  { id: 'AI Agents & Automation', domain: 'automation' },
  { id: 'HR, Recruiting & Careers', domain: 'automation' },
  { id: 'Customer Support & Voice Agents', domain: 'automation' },
  { id: 'Education & Learning', domain: 'learning' },
]
export const SOURCE_CATEGORY_IDS = new Set(SOURCE_CATEGORIES.map((c) => c.id))
export const DOMAIN_FOR_SOURCE_CATEGORY = Object.fromEntries(
  SOURCE_CATEGORIES.map((c) => [c.id, c.domain]),
)

// Content fields that define a tool's identity — hashed for change detection.
export const HASHED_FIELDS = ['name', 'category', 'sourceCategory', 'price', 'level', 'blurb', 'website', 'dev', 'tags']

// The gate's hard requirements: absent → reject.
export const REQUIRED_TOOL_FIELDS = ['slug', 'name', 'category', 'price', 'level', 'blurb', 'website']

export function makeToolRecord(partial = {}) {
  return {
    // --- content (mirrors src/utils/toolsCatalog.js) ---
    slug: '', name: '', category: '', sourceCategory: '',
    price: '', pricing: '', level: '', blurb: '', audience: '',
    dev: '', year: null, website: '', status: 'Active', note: '', tags: [],
    // --- provenance envelope (pipeline-owned) ---
    source: '', sourceUrl: '', discoveredAt: null, updatedAt: null,
    contentHash: '', confidence: 0, enrichedBy: '', lifecycle: 'staged', version: 1,
    ...partial,
  }
}

export function makeCourseRecord(partial = {}) {
  return {
    id: '', toolSlug: '', title: '',
    objectives: [], modules: [], skills: [], prerequisites: [],
    level: '', generatedBy: '', version: 1, updatedAt: null,
    ...partial,
  }
}

export function makeSkillRecord(partial = {}) {
  return {
    id: '', name: '', domain: '', level: '',
    toolsTeaching: [], courses: [], updatedAt: null,
    ...partial,
  }
}
