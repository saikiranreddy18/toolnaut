// Synthetic User Feedback System
// Generates 1000+ realistic personas, simulates their interaction with Toolnaut,
// and collects aggregate feedback on pain points, feature requests, and behavior patterns

const PERSONA_TEMPLATES = {
  roles: [
    'Product Manager', 'Startup Founder', 'Freelancer', 'Marketing Manager',
    'Software Engineer', 'Data Analyst', 'Designer', 'Content Creator',
    'Operations Manager', 'Sales Manager', 'Student', 'Consultant'
  ],
  experience: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
  budgets: [100, 500, 1000, 5000, 10000, 50000],
  goals: [
    'Increase productivity',
    'Build faster',
    'Collaborate better',
    'Save time',
    'Reduce costs',
    'Improve quality',
    'Scale operations',
    'Learn new skills'
  ]
}

const PAIN_POINTS = [
  'Too many tools to choose from',
  'Integration between tools is difficult',
  'High learning curve',
  'Expensive for small teams',
  'Poor documentation',
  'Limited customization',
  'Slow performance',
  'Poor customer support',
  'Outdated features',
  'Doesn\'t fit our workflow',
  'Data privacy concerns',
  'Steep subscription costs',
  'Difficult onboarding',
  'No mobile app',
  'Switching costs too high'
]

const FEATURE_REQUESTS = [
  'Better tool comparison',
  'Custom workflow builder',
  'Team collaboration features',
  'Budget calculator',
  'ROI calculator',
  'Integration marketplace',
  'AI-powered recommendations',
  'Migration assistance',
  'Training resources',
  'Community marketplace',
  'API access',
  'White-label options',
  'Advanced filtering',
  'Saved comparisons',
  'Tool trial orchestration'
]

class SyntheticUserSimulator {
  constructor() {
    this.personas = []
    this.feedbackData = []
    this.insights = {}
  }

  generatePersona(id) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const randomBudget = PERSONA_TEMPLATES.budgets[
      Math.floor(Math.random() * PERSONA_TEMPLATES.budgets.length)
    ]

    return {
      id,
      name: `User${id}`,
      role: pick(PERSONA_TEMPLATES.roles),
      experience: pick(PERSONA_TEMPLATES.experience),
      budget: randomBudget,
      goals: [pick(PERSONA_TEMPLATES.goals), pick(PERSONA_TEMPLATES.goals)],
      teamSize: Math.floor(Math.random() * 100) + 1,
      industry: pick(['Tech', 'Finance', 'Healthcare', 'E-commerce', 'Education', 'Media']),
      painPoints: [],
      selectedTools: [],
      feedbackScore: 0,
      timeSpent: Math.floor(Math.random() * 600) + 30, // 30-630 seconds
      satisfaction: Math.random() * 100
    }
  }

  generatePersonas(count = 1000) {
    this.personas = Array.from({ length: count }, (_, i) => this.generatePersona(i + 1))
    return this.personas
  }

  simulateUserInteraction(persona) {
    const interaction = {
      personaId: persona.id,
      role: persona.role,
      experience: persona.experience,
      budget: persona.budget,
      selectedPainPoints: this.getRandomItems(PAIN_POINTS, 2),
      selectedFeatureRequests: this.getRandomItems(FEATURE_REQUESTS, 2),
      toolsSelected: Math.floor(Math.random() * 8) + 2,
      completedQuiz: Math.random() > 0.1, // 90% complete quiz
      likelyToPay: persona.satisfaction > 60,
      timeSpent: persona.timeSpent,
      satisfaction: persona.satisfaction,
      feedbackText: this.generateFeedback(persona)
    }
    return interaction
  }

  getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  generateFeedback(persona) {
    const feedbacks = [
      `As a ${persona.role}, I found the tool comparison confusing. Need better filtering.`,
      `Great concept, but the UI could be simpler for non-technical users like me.`,
      `Would love to see ROI calculations for each tool stack.`,
      `The tool recommendations are decent, but integrations matter more.`,
      `Budget $${persona.budget}/month but most recommended tools are over budget.`,
      `Too many choices. Would prefer AI to narrow down to top 3 tools.`,
      `Integration capabilities should be shown upfront.`,
      `Would pay for a personalized consultation service.`,
      `Team collaboration features are missing from recommendations.`,
      `Switching from current stack is too expensive. Need migration help.`
    ]
    return feedbacks[Math.floor(Math.random() * feedbacks.length)]
  }

  simulateAll(personaCount = 1000) {
    if (this.personas.length === 0) {
      this.generatePersonas(personaCount)
    }

    this.feedbackData = this.personas.map(persona => this.simulateUserInteraction(persona))
    this.analyzeInsights()
    return this.feedbackData
  }

  analyzeInsights() {
    const data = this.feedbackData

    // Most common pain points
    const painPointFreq = {}
    data.forEach(d => {
      d.selectedPainPoints.forEach(pp => {
        painPointFreq[pp] = (painPointFreq[pp] || 0) + 1
      })
    })

    // Most requested features
    const featureFreq = {}
    data.forEach(d => {
      d.selectedFeatureRequests.forEach(fr => {
        featureFreq[fr] = (featureFreq[fr] || 0) + 1
      })
    })

    // Insights by role
    const roleInsights = {}
    data.forEach(d => {
      if (!roleInsights[d.role]) {
        roleInsights[d.role] = {
          count: 0,
          avgSatisfaction: 0,
          avgBudget: 0,
          conversionRate: 0
        }
      }
      roleInsights[d.role].count++
      roleInsights[d.role].avgSatisfaction += d.satisfaction
      roleInsights[d.role].avgBudget += d.budget
      roleInsights[d.role].conversionRate += d.likelyToPay ? 1 : 0
    })

    // Average insights
    Object.keys(roleInsights).forEach(role => {
      const r = roleInsights[role]
      r.avgSatisfaction = Math.round(r.avgSatisfaction / r.count)
      r.avgBudget = Math.round(r.avgBudget / r.count)
      r.conversionRate = Math.round((r.conversionRate / r.count) * 100)
    })

    this.insights = {
      totalUsers: data.length,
      avgSatisfaction: Math.round(data.reduce((sum, d) => sum + d.satisfaction, 0) / data.length),
      completionRate: Math.round(
        (data.filter(d => d.completedQuiz).length / data.length) * 100
      ),
      avgTimeSpent: Math.round(data.reduce((sum, d) => sum + d.timeSpent, 0) / data.length),
      likelyConverts: Math.round(
        (data.filter(d => d.likelyToPay).length / data.length) * 100
      ),
      topPainPoints: Object.entries(painPointFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([point, count]) => ({ point, count, percentage: Math.round((count / data.length) * 100) })),
      topFeatureRequests: Object.entries(featureFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([feature, count]) => ({ feature, count, percentage: Math.round((count / data.length) * 100) })),
      roleInsights
    }
  }

  getInsights() {
    return this.insights
  }

  getFeedbackByRole(role) {
    return this.feedbackData.filter(d => d.role === role)
  }

  getFeedbackByBudget(minBudget, maxBudget) {
    return this.feedbackData.filter(d => d.budget >= minBudget && d.budget <= maxBudget)
  }

  exportData() {
    return {
      personas: this.personas,
      feedback: this.feedbackData,
      insights: this.insights
    }
  }

  downloadAsJSON() {
    const data = this.exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `synthetic-feedback-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
}

export const syntheticUserSimulator = new SyntheticUserSimulator()
