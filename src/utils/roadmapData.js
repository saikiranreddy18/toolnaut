// Hand-authored, highest-priority first — the customer-facing translation of
// this project's own docs/research-backlog.md (plain language, no shas, no
// file paths, no ETAs: dates on unshipped work invite exactly the kind of
// broken promise this backlog spends most of its length correcting).
//
// Update whenever a listed item ships: remove it here, add its
// changelogData.js entry instead — one array shrinks, the other grows, in
// the same commit.
export const ROADMAP = [
  {
    title: "A live count of who's actually using each tool",
    note: "Instead of a curated pick, show how many Toolnaut members currently have a tool in their own stack — real usage, not an editorial ranking.",
  },
  {
    title: 'Browse stacks other people built',
    note: "An opt-in gallery of stacks real users shared, so you can see what a founder's or designer's stack actually looks like before building your own.",
  },
  {
    title: "Check a tool without leaving the page you're on",
    note: 'A lightweight browser extension that looks up whatever AI tool you\'re reading about elsewhere, right from a right-click menu.',
  },
  {
    title: 'Guides for the task, not just the tool',
    note: "A small library of how-to guides for things like \"automate video editing with AI\" — for when you don't know which tool to use yet, not just a comparison once you do.",
  },
]
