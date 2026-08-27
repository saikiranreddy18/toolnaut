// Role cards for the landing page's RolesSection.
// `domain` maps each role to its closest CATEGORY_META key (toolsCatalog.js)
// so the card can link to a real `/tools/:domain` listing — a judgment call,
// since the quiz's own `domain` answer is independent of `role` and picks no
// canonical mapping itself. Each of the 6 domains is used exactly once.

export const ROLES = [
  { name: 'Student', color: '#fb7185', domain: 'learning', pts: [[18, 55], [40, 30], [64, 48], [82, 24]] },
  { name: 'PM', color: '#f59e0b', domain: 'automation', pts: [[20, 30], [46, 52], [70, 26], [84, 56], [50, 20]] },
  { name: 'Designer', color: '#ec4899', domain: 'design', pts: [[16, 40], [38, 18], [58, 46], [80, 30], [66, 62]] },
  { name: 'Marketer', color: '#06b6d4', domain: 'writing', pts: [[22, 24], [44, 50], [68, 34], [86, 58]] },
  { name: 'Engineer', color: '#84cc16', domain: 'code', pts: [[16, 30], [36, 54], [56, 26], [76, 50], [90, 28], [50, 66]] },
  { name: 'Founder', color: '#7c3aed', domain: 'data', pts: [[20, 48], [42, 24], [62, 50], [84, 34], [56, 66]] },
]
