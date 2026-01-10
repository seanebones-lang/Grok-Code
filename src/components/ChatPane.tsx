'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, WifiOff, Wand2, GitBranch, Bug, FileSearch, Bot, ArrowLeft } from 'lucide-react'
import { ChatMessage } from '@/components/ChatMessage'
import { InputBar, type ChatMode } from '@/components/InputBar'
import { AgentRunner } from '@/components/AgentRunner'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/ui/button'
import { sessionManager, type ChatSession } from '@/lib/session-manager'
import { getAgent } from '@/lib/specialized-agents'
import type { Message } from '@/types'

// SSE chunk schema for type-safe parsing
interface SSEChunk {
  content?: string
  error?: string
  code?: string
  retryable?: boolean
  detectedMode?: 'agent' | 'refactor' | 'debug' | 'review' | 'orchestrate'
  message?: string
}

function parseSSEChunk(data: string): SSEChunk | null {
  try {
    return JSON.parse(data) as SSEChunk
  } catch {
    return null
  }
}

// Mode icons for display
const MODE_ICONS = {
  agent: Bot,
  refactor: Wand2,
  orchestrate: GitBranch,
  debug: Bug,
  review: FileSearch,
} as const

interface ChatPaneProps {
  repository?: {
    owner: string
    repo: string
    branch?: string
  }
  newSessionMessage?: string | null
  onNewSessionHandled?: () => void
}

export function ChatPane({ repository, newSessionMessage, onNewSessionHandled }: ChatPaneProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [currentMode, setCurrentMode] = useState<ChatMode>('default')
  const [showAgentMode, setShowAgentMode] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<{ content: string; mode: ChatMode } | null>(null)

  // Initialize or load session
  useEffect(() => {
    const session = sessionManager.getCurrent()
    setCurrentSessionId(session.id)
    if (session.messages.length > 0) {
      setMessages(session.messages)
    }
  }, [])

  // Save messages to session when they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      sessionManager.updateMessages(currentSessionId, messages)
      window.dispatchEvent(new CustomEvent('sessionUpdated'))
    }
  }, [messages, currentSessionId])

  // Listen for session events
  useEffect(() => {
    const handleNewSession = (e: CustomEvent<{ message?: string; forceNew?: boolean; agentId?: string }>) => {
      const { message, forceNew, agentId } = e.detail || {}
      
      // Extract agent ID from message if present
      const agentMatch = message?.match(/^\/agent\s+(\w+)/i)
      const detectedAgentId = agentMatch?.[1] || agentId
      const agent = detectedAgentId ? getAgent(detectedAgentId) : undefined
      
      // Create new session if forced or if agent specified
      if (forceNew || agent || !currentSessionId || messages.length > 0) {
        const newSession = sessionManager.create({
          agentId: agent?.id,
          agentName: agent?.name,
          metadata: { repository, model: undefined, environment: 'cloud' },
        })
        setCurrentSessionId(newSession.id)
        setMessages([])
        setError(null)
        setShowAgentMode(false)
      }
      
      window.dispatchEvent(new CustomEvent('sessionUpdated'))
    }

    const handleLoadSession = (e: CustomEvent<{ session: ChatSession }>) => {
      const { session } = e.detail
      setCurrentSessionId(session.id)
      setMessages(session.messages)
      setError(null)
      setShowAgentMode(false)
    }

    window.addEventListener('newSession', handleNewSession as EventListener)
    window.addEventListener('loadSession', handleLoadSession as EventListener)
    
    return () => {
      window.removeEventListener('newSession', handleNewSession as EventListener)
      window.removeEventListener('loadSession', handleLoadSession as EventListener)
    }
  }, [currentSessionId, messages.length, repository])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      handler: () => {
        inputRef.current?.focus()
      },
    },
    {
      key: 'Escape',
      handler: () => {
        // Cancel ongoing request
        if (isLoading && abortControllerRef.current) {
          abortControllerRef.current.abort()
          setIsLoading(false)
        }
        inputRef.current?.blur()
      },
    },
    {
      key: 'l',
      metaKey: true,
      shiftKey: true,
      handler: () => {
        // Clear chat and start new session
        if (!isLoading) {
          const newSession = sessionManager.create()
          setCurrentSessionId(newSession.id)
          setMessages([])
          setError(null)
          window.dispatchEvent(new CustomEvent('sessionUpdated'))
        }
      },
    },
  ])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleSendMessage = useCallback(async (content: string, mode: ChatMode = 'default') => {
    // If agent mode, switch to agent view
    if (mode === 'agent') {
      setShowAgentMode(true)
      return
    }

    if (!isOnline) {
      setError('You are offline. Please check your connection.')
      return
    }

    setError(null)
    setCurrentMode(mode)
    lastRequestRef.current = { content, mode }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      metadata: mode !== 'default' ? { mode } : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Build conversation history for context
    const history = messages.slice(-20).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              message: content,
              mode: mode !== 'default' ? mode : undefined,
              history,
              repository: repository ? {
                owner: repository.owner,
                repo: repository.repo,
                branch: repository.branch || 'main',
              } : undefined,
            }),
            signal: abortControllerRef.current.signal,
          })

      // Handle non-streaming error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
          
          const data = trimmedLine.slice(6)
          if (data === '[DONE]') {
            setIsLoading(false)
            return
          }

          const parsed = parseSSEChunk(data)
          if (!parsed) continue

          // Handle auto-detected agent mode - switch to agent view
          if (parsed.detectedMode === 'agent') {
            setIsLoading(false)
            setShowAgentMode(true)
            // Store the original message for the agent
            lastRequestRef.current = { content, mode: 'agent' }
            return
          }

          // Handle other detected modes (show notification but continue chat)
          if (parsed.detectedMode && parsed.message) {
            setCurrentMode(parsed.detectedMode)
            // Add mode notification to assistant message
            assistantMessage.content = parsed.message + '\n\n'
            setMessages((prev) => {
              const updated = [...prev]
              const lastIndex = updated.length - 1
              if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                updated[lastIndex] = { ...assistantMessage }
              }
              return updated
            })
            continue
          }

          if (parsed.error) {
            // Handle streaming error
            setError(parsed.error)
            if (!parsed.retryable) {
              setIsLoading(false)
              return
            }
            continue
          }

          if (parsed.content) {
            assistantMessage.content += parsed.content
            setMessages((prev) => {
              const updated = [...prev]
              const lastIndex = updated.length - 1
              if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                updated[lastIndex] = { ...assistantMessage }
              }
              return updated
            })
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled by user
        console.log('Request cancelled')
        return
      }

      console.error('Error sending message:', err)
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMsg)
      
      // Add error message to chat
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error: ${errorMsg}. Please try again.`,
        timestamp: new Date(),
        metadata: { error: true },
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isOnline, messages])

  const handleRetry = useCallback(() => {
    if (lastRequestRef.current) {
      // Remove the error message and retry
      setMessages(prev => prev.filter(m => !m.metadata?.error))
      handleSendMessage(lastRequestRef.current.content, lastRequestRef.current.mode)
    }
  }, [handleSendMessage])

  // Handle new session message from sidebar (⭐️ = new session)
  useEffect(() => {
    if (newSessionMessage) {
      // Clear existing messages for new session
      setMessages([])
      setError(null)
      // Send the new session message
      handleSendMessage(newSessionMessage, 'default')
      onNewSessionHandled?.()
    }
  }, [newSessionMessage, handleSendMessage, onNewSessionHandled])

  // If in agent mode, show the AgentRunner
  if (showAgentMode) {
    // Get the initial task from the last user message or lastRequestRef
    const initialTask = lastRequestRef.current?.mode === 'agent' 
      ? lastRequestRef.current.content 
      : undefined

  return (
      <div className="flex flex-col h-full bg-[#0f0f23] text-white">
        {/* Back button */}
        <div className="flex items-center gap-2 p-2 border-b border-[#404050]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAgentMode(false)
              lastRequestRef.current = null
            }}
            className="text-[#9ca3af] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Chat
          </Button>
        </div>
        <AgentRunner
          repository={repository}
          initialTask={initialTask}
          onComplete={(result) => {
            // Add result to chat and switch back
            const resultMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: result,
              timestamp: new Date(),
              metadata: { mode: 'agent' },
            }
            setMessages(prev => [...prev, resultMessage])
            setShowAgentMode(false)
            lastRequestRef.current = null
          }}
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div 
      className="flex flex-col h-full w-full bg-[#0f0f23] text-white"
      role="main"
      aria-label="Chat interface"
    >
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>You are offline. Messages will be sent when you reconnect.</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-xs underline"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto py-6 space-y-6"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? null : (
            messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                onRetry={message.metadata?.error ? handleRetry : undefined}
              />
            ))
          )}
        </AnimatePresence>
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-[#9ca3af]"
            role="status"
            aria-label="Eleven is generating a response"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm text-[#9ca3af]">
              {currentMode !== 'default' ? (
                <>
                  {currentMode === 'agent' && 'Agent is working autonomously...'}
                  {currentMode === 'refactor' && 'Analyzing and planning refactor...'}
                  {currentMode === 'orchestrate' && 'Orchestrating agents...'}
                  {currentMode === 'debug' && 'Debugging and analyzing...'}
                  {currentMode === 'review' && 'Reviewing code...'}
                </>
              ) : (
                'Eleven is thinking...'
              )}
            </span>
            <button
              onClick={() => abortControllerRef.current?.abort()}
              className="text-xs text-[#9ca3af] hover:text-white underline ml-2"
              aria-label="Cancel request"
            >
              Cancel
            </button>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
      
      {/* Bottom reply input - simple like Claude Code */}
      <div className="border-t border-[#1a1a1a] bg-[#0f0f23] px-4 py-3">
        <div className="relative">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            placeholder="Reply..."
            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder:text-[#9ca3af] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const value = (e.target as HTMLInputElement).value.trim()
                if (value && !isLoading) {
                  handleSendMessage(value, 'default')
                  ;(e.target as HTMLInputElement).value = ''
                }
              }
            }}
            disabled={isLoading || !isOnline}
          />
        </div>
      </div>
    </div>
  )
}
