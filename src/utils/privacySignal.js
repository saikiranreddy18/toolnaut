// A tool self-identifies as privacy-conscious when it carries any tag that
// signals where user data actually ends up — distinct from accessMethod.js's
// "how much setup getting to the product takes" axis, which reads the same
// tags array to answer a different question.
const PRIVACY_TAGS = ['privacy', 'local-first', 'on-device', 'self-hosted', 'encryption']

export function isPrivacyConscious(tool) {
  return (tool.tags || []).some((t) => PRIVACY_TAGS.includes(t))
}
