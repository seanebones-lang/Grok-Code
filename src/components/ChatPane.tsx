'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FocusTrap from 'focus-trap-react'
import { Loader2, AlertCircle, WifiOff, Wand2, GitBranch, Bug, FileSearch, Bot, ArrowLeft, X, Trash2 } from 'lucide-react'
import { ChatMessage } from '@/components/ChatMessage'
import { InputBar, type ChatMode } from '@/components/InputBar'
import { AgentRunner } from '@/components/AgentRunner'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/ui/button'
import { sessionManager, type ChatSession } from '@/lib/session-manager'
import { getAgent } from '@/lib/specialized-agents'
import { analyzeTask, generateOrchestratorPrompt, isOrchestratorModeEnabled, formatAnalysisForDisplay } from '@/lib/orchestrator'
import { agentMemory } from '@/lib/agent-memory'
import { debounce } from '@/lib/utils'
import { useToastActions } from '@/components/Toast'
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

// Constants
const MAX_HISTORY_MESSAGES = 20
const SESSION_UPDATE_DEBOUNCE_MS = 500
const MEMORY_RELEVANCE_LIMIT = 5

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

export function ChatPane({ repository, newSessionMessage, onNewSessionHandled }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [currentMode, setCurrentMode] = useState<ChatMode>('default')
  const [showAgentMode, setShowAgentMode] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [orchestratorMode, setOrchestratorModeState] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<{ content: string; mode: ChatMode } | null>(null)
  const toast = useToastActions()

  // Initialize or load session
  useEffect(() => {
    const session = sessionManager.getCurrent()
    setCurrentSessionId(session.id)
    if (session.messages.length > 0) {
      setMessages(session.messages)
    }
    // Load orchestrator mode
    setOrchestratorModeState(isOrchestratorModeEnabled())
  }, [])

  // Listen for orchestrator mode changes
  useEffect(() => {
    const handleOrchestratorChange = (e: CustomEvent<{ enabled: boolean }>) => {
      setOrchestratorModeState(e.detail.enabled)
    }
    window.addEventListener('orchestratorModeChanged', handleOrchestratorChange as EventListener)
    return () => window.removeEventListener('orchestratorModeChanged', handleOrchestratorChange as EventListener)
  }, [])

  // Debounced session update to prevent race conditions
  const debouncedUpdateSession = useMemo(
    () => debounce((sessionId: string, msgs: Message[]) => {
      try {
        sessionManager.updateMessages(sessionId, msgs)
        window.dispatchEvent(new CustomEvent('sessionUpdated'))
      } catch (err) {
        console.error('Failed to update session:', err)
        toast.error('Failed to save session', 'Your messages may not be persisted. Please try again.')
      }
    }, SESSION_UPDATE_DEBOUNCE_MS),
    [toast]
  )

  // Save messages to session when they change (debounced)
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      debouncedUpdateSession(currentSessionId, messages)
    }
    return () => {
      // Cancel debounced update on unmount or dependency change
      debouncedUpdateSession.cancel()
    }
  }, [messages, currentSessionId, debouncedUpdateSession])

  // Clear error on successful message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user' && error) {
      // Clear error when user sends a new message
      setError(null)
    }
  }, [messages, error])

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
          metadata: { 
            repository: repository ? { ...repository, branch: repository.branch || 'main' } : undefined, 
            model: undefined, 
            environment: 'cloud' 
          },
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

  // Helper function to update last assistant message (DRY)
  const updateLastAssistantMessage = useCallback((updater: (msg: Message) => Message) => {
    setMessages((prev) => {
      const updated = [...prev]
      const lastIndex = updated.length - 1
      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
        updated[lastIndex] = updater(updated[lastIndex])
      }
      return updated
    })
  }, [])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Prepare message content with orchestrator logic
  const prepareMessage = useCallback((content: string, mode: ChatMode): { processedContent: string; orchestratorPrefix: string; userMessage: Message } => {
    let processedContent = content
    let orchestratorPrefix = ''
    
    // Check if orchestrator mode is enabled and this is a new task (not already orchestrated)
    if (orchestratorMode && !content.startsWith('/agent') && messages.length === 0) {
      // Analyze the task
      const analysis = analyzeTask(content)
      
      // Show analysis to user
      orchestratorPrefix = `🎼 **Auto-Orchestrator Active**\n\n${formatAnalysisForDisplay(analysis)}\n\n---\n\n`
      
      // Route to the best agent
      if (analysis.suggestedAgents.length > 0) {
        const primaryAgent = analysis.suggestedAgents[0]
        processedContent = `/agent ${primaryAgent.agentId} ${content}`
        
        // Add orchestrator context
        orchestratorPrefix += `**Routing to ${primaryAgent.emoji} ${primaryAgent.agentName}**\n_${primaryAgent.reason}_\n\n---\n\n`
      }
    }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: orchestratorPrefix ? `${orchestratorPrefix}${content}` : content,
      timestamp: new Date(),
      metadata: mode !== 'default' ? { mode } : undefined,
    }

    return { processedContent, orchestratorPrefix, userMessage }
  }, [orchestratorMode, messages.length])

  // Build request payload
  const buildRequestPayload = useCallback((processedContent: string, mode: ChatMode, history: Array<{ role: string; content: string }>, memoryContext: string | undefined) => {
    return JSON.stringify({ 
      message: processedContent,
      mode: mode !== 'default' ? mode : undefined,
      history,
      memoryContext: memoryContext || undefined,
      repository: repository ? {
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch || 'main',
      } : undefined,
    })
  }, [repository])

  // Handle streaming response chunks
  const handleStreamChunk = useCallback((parsed: SSEChunk, assistantMessage: Message, content: string): boolean => {
    // Handle auto-detected agent mode - switch to agent view
    if (parsed.detectedMode === 'agent') {
      setIsLoading(false)
      setShowAgentMode(true)
      // Store the original message for the agent
      lastRequestRef.current = { content, mode: 'agent' }
      return true // Indicates early return
    }

    // Handle other detected modes (show notification but continue chat)
    if (parsed.detectedMode && parsed.message) {
      setCurrentMode(parsed.detectedMode)
      // Add mode notification to assistant message
      assistantMessage.content = parsed.message + '\n\n'
      updateLastAssistantMessage(() => assistantMessage)
      return false // Continue processing
    }

    if (parsed.error) {
      // Handle streaming error
      setError({ 
        message: parsed.error, 
        retryable: parsed.retryable ?? false 
      })
      if (!parsed.retryable) {
        setIsLoading(false)
        return true // Early return for non-retryable errors
      }
      return false // Continue for retryable errors
    }

    if (parsed.content) {
      assistantMessage.content += parsed.content
      updateLastAssistantMessage(() => assistantMessage)
      return false // Continue processing
    }

    return false // No action needed
  }, [updateLastAssistantMessage])

  const handleSendMessage = useCallback(async (content: string, mode: ChatMode = 'default') => {
    // If agent mode, switch to agent view
    if (mode === 'agent') {
      setShowAgentMode(true)
      return
    }

    if (!isOnline) {
      setError({ message: 'You are offline. Please check your connection.', retryable: true })
      return
    }

    setError(null)
    setCurrentMode(mode)
    lastRequestRef.current = { content, mode }
    
    // Prepare message with orchestrator logic
    const { processedContent, orchestratorPrefix, userMessage } = prepareMessage(content, mode)

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Build conversation history for context (optimized)
    const history = messages.slice(-MAX_HISTORY_MESSAGES).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Get relevant memories for context (optimized)
    const relevantMemories = agentMemory.getRelevant(content, MEMORY_RELEVANCE_LIMIT)
    const criticalMemories = agentMemory.getCritical()
    const allRelevantMemories = [...new Set([...criticalMemories, ...relevantMemories])]
    const memoryContext = agentMemory.formatForPrompt(allRelevantMemories)

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

        try {
          // Get GitHub token from localStorage (Grok API key is server-side via Vercel env vars)
          const githubToken = localStorage.getItem('nexteleven_github_token')
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(githubToken && { 'X-Github-Token': githubToken }),
            },
            body: buildRequestPayload(processedContent, mode, history, memoryContext),
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

          // Handle stream chunk using helper function
          const shouldReturn = handleStreamChunk(parsed, assistantMessage, content)
          if (shouldReturn) {
            return // Early return for agent mode or non-retryable errors
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled by user - this is expected, not an error
        console.log('Request cancelled by user')
        return
      }

      console.error('Error sending message:', err)
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
      
      // Determine if error is retryable (network errors are usually retryable)
      const isRetryable = err instanceof TypeError || 
                         (err instanceof Error && (
                           err.message.includes('fetch') || 
                           err.message.includes('network') ||
                           err.message.includes('Failed to fetch')
                         ))
      
      setError({ message: errorMsg, retryable: isRetryable })
      
      // Only add non-retryable errors to chat (retryable errors show in banner)
      if (!isRetryable) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error: ${errorMsg}. Try refreshing the page or check your connection.`,
          timestamp: new Date(),
          metadata: { error: true, dismissible: true },
        }
        setMessages((prev) => [...prev, errorMessage])
        toast.error('Error sending message', errorMsg)
      } else {
        toast.warning('Network error', 'Please check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
      // Always cleanup AbortController
      abortControllerRef.current = null
    }
  }, [isOnline, messages, prepareMessage, buildRequestPayload, handleStreamChunk, repository])

  const handleRetry = useCallback(() => {
    if (lastRequestRef.current) {
      // Clear error state
      setError(null)
      // Remove error messages from chat
      setMessages(prev => prev.filter(m => !m.metadata?.error))
      // Retry the last request
      handleSendMessage(lastRequestRef.current.content, lastRequestRef.current.mode)
    }
  }, [handleSendMessage])

  const handleClearChat = useCallback(() => {
    if (confirm('Clear current chat? This will remove all messages in this conversation.')) {
      setMessages([])
      setError(null)
      setCurrentMode('default')
      setShowAgentMode(false)
      lastRequestRef.current = null
      
      // Cleanup and abort any pending requests
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      
      // Create new session for clean state
      const newSession = sessionManager.create({
        metadata: {
          repository: repository ? { ...repository, branch: repository.branch || 'main' } : undefined,
        },
      })
      setCurrentSessionId(newSession.id)
      window.dispatchEvent(new CustomEvent('sessionUpdated'))
      toast.success('Chat cleared', 'Started a new conversation.')
    }
  }, [repository, toast])

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
      <FocusTrap>
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
      </FocusTrap>
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
            <span>{error.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {error.retryable && lastRequestRef.current && (
              <button 
                onClick={handleRetry}
                className="text-red-400 hover:text-red-300 text-xs underline font-medium"
                aria-label="Retry request"
              >
                Retry
              </button>
            )}
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 text-xs underline"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Messages area with clear chat button */}
      <div 
        className="flex-1 overflow-y-auto py-6 space-y-6 relative"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {/* Clear Chat Button - visible when messages exist */}
        {messages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 right-4 z-10"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="bg-[#1a1a1a]/90 hover:bg-[#2a2a2a] text-[#9ca3af] hover:text-white border border-[#1a1a1a] h-8 px-3 text-xs backdrop-blur-sm"
              title="Clear current chat"
            >
              <X className="h-3 w-3 mr-1.5" />
              Clear Chat
            </Button>
          </motion.div>
        )}

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
            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder:text-[#6b7280] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
