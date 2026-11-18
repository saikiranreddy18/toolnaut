// MCP (Model Context Protocol) is a cross-cutting attribute, not a taxonomy
// level — tagged tools already span two different domains (code, automation)
// — so this is a predicate over the existing radar tag data, not a new field.
export function isMcpTool(tool) {
  return (tool?.tags || []).some((t) => /\bmcp\b/i.test(t))
}
