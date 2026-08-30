// Single source of truth for the brand. Change here to rebrand everywhere.
export const BRAND = 'Toolnaut'
export const BRAND_SHORT = 'Toolnaut'

// Where to reach a human. One place, so the footer, the legal pages and the
// methodology page cannot drift apart on it.
export const CONTACT_EMAIL = 'hello@toolnaut.app'

// Public profiles, rendered in the contact section in this order.
//
// EMPTY ON PURPOSE. Inventing handles would put dead links on a live page and
// send people to accounts that are not yours — the fastest way to lose the
// trust the rest of the page is built to earn. The section renders the email
// alone until real URLs land here, and each entry needs only { id, label, url }.
//   id     picks the icon below (x, instagram, linkedin, github, youtube, discord)
//   label  read out by screen readers
//   url    the real profile
export const SOCIALS = [
  { id: 'instagram', label: 'Toolnaut on Instagram', url: 'https://www.instagram.com/toolnaut.xyz/' },
  { id: 'facebook', label: 'Toolnaut on Facebook', url: 'https://www.facebook.com/profile.php?id=61592833317860' },
  { id: 'x', label: 'Toolnaut on X', url: 'https://x.com/toolnaut' },
  { id: 'linkedin', label: 'Toolnaut on LinkedIn', url: 'https://www.linkedin.com/company/toolnaut-xyz' },
]
