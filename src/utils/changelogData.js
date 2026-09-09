// Hand-authored, newest-first. Toolnaut ships almost every day; this is the
// customer-facing translation of that history (plain language, no shas, no
// commit messages) — DEVLOG.md and docs/research-backlog.md carry the
// engineering version of the same record for a human maintainer.
//
// Add one entry here whenever the daily feature run marks a backlog gap
// SHIPPED — pulled from that day's real commit, not invented.
export const CHANGELOG = [
  {
    date: '2026-09-05',
    title: 'Settings tells the truth about syncing',
    body: 'The Settings page used to say your data never leaves this device — it now correctly says when sign-in sync is on, since that backend already existed.',
  },
  {
    date: '2026-09-03',
    title: 'A real Support page',
    body: 'Questions, refund requests and account help now go to a proper /support page instead of a dead end.',
  },
  {
    date: '2026-09-02',
    title: '7-day free trial, then one payment — never a subscription',
    body: 'Full access is free for 7 days. After that it is a single one-time pass, not a recurring plan — nothing renews automatically.',
  },
  {
    date: '2026-09-02',
    title: 'Email alerts for new tools',
    body: 'Turn on notifications in Settings to hear about freshly discovered tools as the radar finds them.',
  },
  {
    date: '2026-09-01',
    title: 'Sort your search results',
    body: 'Discover now lets you sort by best match, newest, or A–Z instead of one fixed order.',
  },
  {
    date: '2026-08-31',
    title: 'Search without signing in',
    body: 'A new public search page lets anyone look up a tool by name before creating a stack.',
  },
  {
    date: '2026-08-28',
    title: 'Browse new tools without an account',
    body: 'Every tool the nightly radar finds is now visible on a public "new this month" page — no login required.',
  },
  {
    date: '2026-08-26',
    title: '"Best AI tools for X" pages',
    body: 'Each catalog domain — code, design, writing, data, automation, learning — now has its own browsable, linkable page.',
  },
  {
    date: '2026-08-23',
    title: 'Save tools to Favorites',
    body: 'Star any tool from Discover or a tool page and find it again later in Favorites.',
  },
  {
    date: '2026-08-22',
    title: 'Share, compare, and export your stack',
    body: 'Your personalized stack now has a shareable link, a side-by-side comparison view, and a plain-text export.',
  },
]
