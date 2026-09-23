// Is a stack carrying two tools that do the same job? The catalog already
// tags every tool with a `sourceCategory` one level more specific than the
// six domain buckets — no price data or radar schema change needed, unlike
// the (separately blocked) cost-estimate gap this is the "is my stack even
// efficient" sibling to.
//
// Groups made up entirely of starter picks are skipped: personaGenerator
// deliberately spans different jobs when it builds the persona's three
// starter tools, so a same-category starter pair means a personaGenerator
// bug, not user redundancy — out of scope here.
export function findOverlaps(tools) {
  const groups = new Map()
  for (const tool of tools || []) {
    if (!tool?.sourceCategory) continue
    const group = groups.get(tool.sourceCategory) || []
    group.push(tool)
    groups.set(tool.sourceCategory, group)
  }

  const overlaps = []
  for (const [category, group] of groups) {
    if (group.length < 2) continue
    if (group.every((t) => t.starter)) continue
    overlaps.push({ category, tools: group })
  }
  return overlaps
}
