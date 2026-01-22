'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import FocusTrap from 'focus-trap-react'
import { WifiOff, ArrowLeft, X } from 'lucide-react'
import { AgentRunner } from '@/components/AgentRunner'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/ui/button'
import { getAgent } from '@/lib/specialized-agents'
import { agentMemory } from '@/lib/agent-memory'
import { useToastActions } from '@/components/Toast'
import type { Message } from '@/types'
import type { ChatMode } from '@/components/InputBar'
import { useMessages } from '@/hooks/useMessages'
import { useChatStream, parseSSEChunk, type SSEChunk } from '@/hooks/useChatStream'
import { useOrchestration } from '@/hooks/useOrchestration'
import { MessageList } from '@/components/MessageList'
import { StreamingIndicator } from '@/components/StreamingIndicator'
import { ErrorDisplay } from '@/components/ErrorDisplay'

// Constants
const MAX_HISTORY_MESSAGES = 20
const MEMORY_RELEVANCE_LIMIT = 5

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [currentMode, setCurrentMode] = useState<ChatMode>('default')
  const [showAgentMode, setShowAgentMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastRequestRef = useRef<{ content: string; mode: ChatMode } | null>(null)
  const toast = useToastActions()

  // Use extracted hooks
  const {
    messages,
    setMessages,
    addMessage,
    updateLastMessage,
    clearMessages,
    messagesEndRef,
    currentSessionId,
    setCurrentSessionId,
  } = useMessages({
    repository,
    onSessionChange: (sessionId) => {
      setCurrentSessionId(sessionId)
    },
  })

  const { orchestratorMode, prepareMessage } = useOrchestration({ messages })

  // Handle streaming response chunks
  const handleStreamChunk = useCallback((parsed: SSEChunk, assistantMessage: Message, originalContent: string): boolean => {
    // Handle auto-detected agent mode - switch to agent view
    if (parsed.detectedMode === 'agent') {
      setIsLoading(false)
      setShowAgentMode(true)
      // Store the original message for the agent
      lastRequestRef.current = { content: originalContent, mode: 'agent' }
      return true // Indicates early return
    }

    // Handle other detected modes (show notification but continue chat)
    if (parsed.detectedMode && parsed.message) {
      setCurrentMode(parsed.detectedMode)
      // Add mode notification to assistant message
      assistantMessage.content = parsed.message + '\n\n'
      updateLastMessage(() => assistantMessage)
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
      updateLastMessage(() => assistantMessage)
      return false // Continue processing
    }

    return false // No action needed
  }, [updateLastMessage])

  // Build request payload - memoized to prevent recreation
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
  
  // Memoize history slice to prevent recreation on every render
  const getHistorySlice = useCallback((msgs: Message[]) => {
    return msgs.slice(-MAX_HISTORY_MESSAGES).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
  }, [])

  // Store original content for stream chunk handler
  const currentRequestContentRef = useRef<string>('')

  // Use chat stream hook
  const { abortControllerRef, startStream, abort } = useChatStream({
    onStreamStart: () => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      addMessage(assistantMessage)
      return assistantMessage
    },
    onStreamChunk: (chunk, assistantMessage) => {
      return handleStreamChunk(chunk, assistantMessage, currentRequestContentRef.current)
    },
    onStreamComplete: () => {
      setIsLoading(false)
      currentRequestContentRef.current = ''
    },
    onStreamError: (error, isRetryable) => {
      setError({ message: error.message, retryable: isRetryable })
      
      // Only add non-retryable errors to chat (retryable errors show in banner)
      if (!isRetryable) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error: ${error.message}. Try refreshing the page or check your connection.`,
          timestamp: new Date(),
          metadata: { error: true, dismissible: true },
        }
        addMessage(errorMessage)
        toast.error('Error sending message', error.message)
      } else {
        toast.warning('Network error', 'Please check your connection and try again.')
      }
      setIsLoading(false)
      currentRequestContentRef.current = ''
    },
  })

  // Clear error on successful message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user' && error) {
      // Clear error when user sends a new message
      setError(null)
    }
  }, [messages, error])

  // Listen for session events (for agent selection)
  useEffect(() => {
    const handleNewSession = (e: CustomEvent<{ message?: string; forceNew?: boolean; agentId?: string }>) => {
      const { message, forceNew, agentId } = e.detail || {}
      
      // Extract agent ID from message if present
      const agentMatch = message?.match(/^\/agent\s+(\w+)/i)
      const detectedAgentId = agentMatch?.[1] || agentId
      const agent = detectedAgentId ? getAgent(detectedAgentId) : undefined
      
      // Create new session if forced or if agent specified
      if (forceNew || agent || !currentSessionId || messages.length > 0) {
        clearMessages()
        setError(null)
        setShowAgentMode(false)
      }
      
      window.dispatchEvent(new CustomEvent('sessionUpdated'))
    }

    window.addEventListener('newSession', handleNewSession as EventListener)
    
    return () => {
      window.removeEventListener('newSession', handleNewSession as EventListener)
    }
  }, [currentSessionId, messages.length, clearMessages])

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
        if (isLoading) {
          abort()
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
          clearMessages()
          setError(null)
          window.dispatchEvent(new CustomEvent('sessionUpdated'))
        }
      },
    },
  ])

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
    const { processedContent, userMessage } = prepareMessage(content, mode)

    addMessage(userMessage)
    setIsLoading(true)
    
    // Store original content for stream chunk handler
    currentRequestContentRef.current = content

    // Build conversation history for context (optimized with memoized function)
    const history = getHistorySlice(messages)

    // Get relevant memories for context (optimized)
    const relevantMemories = agentMemory.getRelevant(content, MEMORY_RELEVANCE_LIMIT)
    const criticalMemories = agentMemory.getCritical()
    const allRelevantMemories = [...new Set([...criticalMemories, ...relevantMemories])]
    const memoryContext = agentMemory.formatForPrompt(allRelevantMemories)

    // Get GitHub token from localStorage
    const githubToken = localStorage.getItem('nexteleven_github_token')
    
    // Start streaming
    await startStream(
      '/api/chat',
      buildRequestPayload(processedContent, mode, history, memoryContext),
      githubToken ? { 'X-Github-Token': githubToken } : {}
    )
  }, [isOnline, messages, prepareMessage, buildRequestPayload, addMessage, startStream, getHistorySlice])

  const handleRetry = useCallback(() => {
    if (lastRequestRef.current) {
      // Clear error state
      setError(null)
      // Remove error messages from chat
      setMessages(prev => prev.filter(m => !m.metadata?.error))
      // Retry the last request
      handleSendMessage(lastRequestRef.current.content, lastRequestRef.current.mode)
    }
  }, [handleSendMessage, setMessages])

  const handleClearChat = useCallback(() => {
    if (confirm('Clear current chat? This will remove all messages in this conversation.')) {
      clearMessages()
      setError(null)
      setCurrentMode('default')
      setShowAgentMode(false)
      lastRequestRef.current = null
      
      // Cleanup and abort any pending requests
      abort()
      
      window.dispatchEvent(new CustomEvent('sessionUpdated'))
      toast.success('Chat cleared', 'Started a new conversation.')
    }
  }, [clearMessages, abort, toast])

  // Handle new session message from sidebar (⭐️ = new session)
  useEffect(() => {
    if (newSessionMessage) {
      // Clear existing messages for new session
      clearMessages()
      setError(null)
      // Send the new session message
      handleSendMessage(newSessionMessage, 'default')
      onNewSessionHandled?.()
    }
  }, [newSessionMessage, handleSendMessage, onNewSessionHandled, clearMessages])

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
              addMessage(resultMessage)
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
      <ErrorDisplay 
        error={error}
        onRetry={error?.retryable && lastRequestRef.current ? handleRetry : undefined}
        onDismiss={() => setError(null)}
      />

      {/* Messages area with clear chat button */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 relative">
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

        <MessageList 
          messages={messages}
          onRetry={handleRetry}
          messagesEndRef={messagesEndRef}
        />
        
        {/* Loading indicator */}
        <StreamingIndicator 
          isLoading={isLoading}
          mode={currentMode}
          onCancel={() => abort()}
        />
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
