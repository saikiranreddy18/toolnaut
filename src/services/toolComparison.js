// Tool Comparison & Integration Service
// Addresses: "Too many tools to choose from" (56%) & "Integration between tools is difficult" (59%)

class ToolComparisonService {
  constructor() {
    this.tools = []
    this.integrations = {}
    this.comparisons = []
  }

  // Integration compatibility matrix
  getIntegrationScore(tool1, tool2) {
    const key = [tool1, tool2].sort().join('|')
    if (this.integrations[key]) {
      return this.integrations[key]
    }
    // Mock score 0-100
    return Math.floor(Math.random() * 100) + 30 // 30-100
  }

  // Find tools that work well together
  findCompatibleTools(selectedTools, allTools, minScore = 70) {
    const compatible = allTools.filter(tool => {
      if (selectedTools.includes(tool)) return false

      let avgScore = 0
      selectedTools.forEach(selected => {
        avgScore += this.getIntegrationScore(tool, selected)
      })
      avgScore /= selectedTools.length || 1

      return avgScore >= minScore
    })

    return compatible.sort((a, b) => {
      const scoreA = selectedTools.reduce((sum, t) => sum + this.getIntegrationScore(a, t), 0) / selectedTools.length
      const scoreB = selectedTools.reduce((sum, t) => sum + this.getIntegrationScore(b, t), 0) / selectedTools.length
      return scoreB - scoreA
    })
  }

  // Compare multiple tools side-by-side
  compareTools(toolIds, attributes = ['price', 'ease', 'integrations', 'support', 'features']) {
    return {
      tools: toolIds,
      attributes: attributes.map(attr => ({
        name: attr,
        scores: toolIds.map(() => Math.floor(Math.random() * 100) + 20)
      })),
      integrationMatrix: this.buildIntegrationMatrix(toolIds),
      overallScore: this.calculateOverallScore(toolIds)
    }
  }

  buildIntegrationMatrix(toolIds) {
    const matrix = {}
    toolIds.forEach(tool1 => {
      matrix[tool1] = {}
      toolIds.forEach(tool2 => {
        if (tool1 !== tool2) {
          matrix[tool1][tool2] = this.getIntegrationScore(tool1, tool2)
        }
      })
    })
    return matrix
  }

  calculateOverallScore(toolIds) {
    let total = 0
    let count = 0

    for (let i = 0; i < toolIds.length; i++) {
      for (let j = i + 1; j < toolIds.length; j++) {
        total += this.getIntegrationScore(toolIds[i], toolIds[j])
        count++
      }
    }

    return count > 0 ? Math.round(total / count) : 100
  }

  // Suggest replacements for hard-to-integrate tools
  suggestReplacements(toolId, selectedTools, allTools) {
    const lowIntegrating = allTools.filter(tool => {
      if (tool === toolId || selectedTools.includes(tool)) return false
      return this.getIntegrationScore(toolId, tool) < 50
    })

    return allTools
      .filter(tool => !lowIntegrating.includes(tool) && tool !== toolId && !selectedTools.includes(tool))
      .map(tool => ({
        tool,
        intScore: selectedTools.reduce((s, t) => s + this.getIntegrationScore(tool, t), 0) / selectedTools.length
      }))
      .sort((a, b) => b.intScore - a.intScore)
      .slice(0, 5)
  }

  // Quick filters to reduce 700 tools → 10-20 options
  quickFilter(allTools, filters) {
    let filtered = allTools

    if (filters.budget) {
      filtered = filtered.filter(t => t.price <= filters.budget)
    }

    if (filters.ease) {
      // 1=hard, 5=easy
      filtered = filtered.filter(t => t.easeScore >= filters.ease)
    }

    if (filters.integrations) {
      filtered = filtered.filter(t => t.integrationCount >= filters.integrations)
    }

    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category)
    }

    // Rank by relevance
    return filtered
      .map(t => ({
        ...t,
        relevanceScore: (t.popularity || 50) + (filters.ease ? t.easeScore * 10 : 0)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20)
  }

  // Explain why tools don't integrate well
  explainIntegrationGap(tool1, tool2) {
    const issues = [
      'Different API architectures',
      'Limited webhook support',
      'No native integration available',
      'Requires custom development',
      'Data format incompatibility',
      'Authentication method mismatch'
    ]

    return {
      tool1,
      tool2,
      score: this.getIntegrationScore(tool1, tool2),
      issues: issues.slice(0, Math.floor(Math.random() * 3) + 1),
      workarounds: [
        'Use Zapier or Make.com',
        'Build custom integration via API',
        'Use native third-party connectors'
      ]
    }
  }
}

export const toolComparison = new ToolComparisonService()
