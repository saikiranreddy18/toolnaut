import { useState, useRef, useEffect } from 'react'
import { getAIAgent } from '../../utils/aiAgent'

export default function AIRobot({ onClose, compact = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(!compact)
  const messagesEndRef = useRef(null)
  const agent = getAIAgent()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Hi! I\'m Toolnaut\'s AI assistant. I can help you discover the right AI tools for your needs. What are you looking to build or improve?',
        timestamp: Date.now(),
      }
      setMessages([greeting])
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await agent.chat(input)

      const assistantMessage = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: response.content,
        timestamp: response.timestamp,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)

      const errorMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'system',
        content: `Sorry, I encountered an error: ${error.message}. The Nvidia LLM backend might not be configured yet.`,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    agent.clearHistory()
    setMessages([
      {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Conversation cleared. How can I help you?',
        timestamp: Date.now(),
      },
    ])
  }

  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-pink-500 shadow-lg hover:scale-110 transition-transform"
        title="Open AI Robot"
      >
        <img
          src="/logo.webp"
          width={32}
          height={32}
          className="rounded-lg"
          alt="AI Robot"
        />
      </button>
    )
  }

  return (
    <div className={`${compact ? 'fixed bottom-4 right-4 z-50 h-96 w-80' : 'h-full flex flex-col'} bg-[#0a0a0d] border border-white/10 rounded-lg shadow-xl flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src="/logo.webp"
            width={28}
            height={28}
            className="rounded-lg"
            alt="AI Robot"
          />
          <div>
            <h3 className="text-sm font-semibold text-white">Toolnaut AI</h3>
            <p className="text-xs text-zinc-400">
              {isLoading ? 'Thinking...' : 'Online'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 2h10v10H5V4z" />
            </svg>
          </button>
          {compact && (
            <button
              onClick={() => {
                setIsOpen(false)
                onClose?.()
              }}
              className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
              title="Close chat"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : msg.role === 'system'
                    ? 'bg-red-900/30 text-red-200 rounded-bl-none'
                    : 'bg-white/10 text-white rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-3 py-2 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-100" />
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about AI tools..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

// Floating widget version
export function AIRobotWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 h-96 w-80 shadow-2xl">
          <AIRobot compact={false} onClose={() => setIsOpen(false)} />
        </div>
      )}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-pink-500 shadow-lg hover:scale-110 transition-transform"
          title="Open AI Robot"
          aria-label="Open AI Robot"
        >
          <img
            src="/logo.webp"
            width={32}
            height={32}
            className="rounded-lg"
            alt="AI Robot"
          />
        </button>
      )}
    </>
  )
}
