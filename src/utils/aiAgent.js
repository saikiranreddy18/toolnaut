// AI Agent service for Nvidia LLM integration
// This module handles communication with the AI backend

const AI_AGENT_CONFIG = {
  // Nvidia LLM endpoint (will be configured later)
  endpoint: process.env.VITE_NVIDIA_LLM_ENDPOINT || 'http://localhost:8000/api/chat',
  timeout: 30000, // 30s timeout
  maxRetries: 3,
  retryDelay: 1000, // 1s between retries
}

export class AIAgent {
  constructor(config = {}) {
    this.config = { ...AI_AGENT_CONFIG, ...config }
    this.conversationHistory = []
    this.isProcessing = false
  }

  // Add message to conversation history
  addMessage(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
    })
  }

  // Get conversation history
  getHistory() {
    return this.conversationHistory
  }

  // Clear conversation
  clearHistory() {
    this.conversationHistory = []
  }

  // Send message to AI backend and get response
  async chat(userMessage, options = {}) {
    if (this.isProcessing) {
      throw new Error('Agent is already processing a message')
    }

    this.isProcessing = true

    try {
      // Add user message to history
      this.addMessage('user', userMessage)

      // Build request payload
      const payload = {
        messages: this.conversationHistory,
        model: options.model || 'nvidia-llm',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1024,
        systemPrompt: options.systemPrompt || this.getDefaultSystemPrompt(),
      }

      // Send request with retry logic
      const response = await this._retryRequest(payload)

      if (!response || !response.content) {
        throw new Error('Invalid response from AI backend')
      }

      // Add AI response to history
      this.addMessage('assistant', response.content)

      return {
        content: response.content,
        metadata: response.metadata || {},
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('AI Agent error:', error)
      this.addMessage('system', `Error: ${error.message}`)
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  // Retry request logic for resilience
  async _retryRequest(payload, attempt = 1) {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._getAuthToken()}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        await new Promise((r) => setTimeout(r, this.config.retryDelay * attempt))
        return this._retryRequest(payload, attempt + 1)
      }
      throw error
    }
  }

  // Get auth token from cookies or session
  _getAuthToken() {
    try {
      const cookies = document.cookie.split(';')
      const authCookie = cookies.find((c) => c.trim().startsWith('tn_auth='))
      return authCookie ? authCookie.split('=')[1] : ''
    } catch {
      return ''
    }
  }

  // Default system prompt for the AI
  getDefaultSystemPrompt() {
    return `You are Toolnaut's AI assistant - a helpful AI agent designed to help users discover and master AI tools.

Your role is to:
1. Help users find the right AI tools for their specific needs
2. Explain how different tools work and what they're best at
3. Provide personalized recommendations based on user role and goals
4. Answer questions about AI tool features, pricing, and best practices
5. Guide users through learning paths and tool adoption

Be friendly, knowledgeable, and concise. When users ask about tools, reference the Toolnaut catalog.`
  }

  // Stream response from AI (for real-time updates)
  async *chatStream(userMessage, options = {}) {
    if (this.isProcessing) {
      throw new Error('Agent is already processing a message')
    }

    this.isProcessing = true

    try {
      this.addMessage('user', userMessage)

      const payload = {
        messages: this.conversationHistory,
        model: options.model || 'nvidia-llm',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1024,
        systemPrompt: options.systemPrompt || this.getDefaultSystemPrompt(),
        stream: true,
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._getAuthToken()}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullContent += chunk
        yield chunk
      }

      // Add complete response to history
      if (fullContent) {
        this.addMessage('assistant', fullContent)
      }
    } finally {
      this.isProcessing = false
    }
  }

  // Check if AI backend is available
  async ping() {
    try {
      const response = await fetch(`${this.config.endpoint}/health`, {
        timeout: 5000,
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Global singleton instance
let agentInstance = null

export function getAIAgent(config) {
  if (!agentInstance) {
    agentInstance = new AIAgent(config)
  }
  return agentInstance
}

export function createNewAgent(config) {
  agentInstance = new AIAgent(config)
  return agentInstance
}
