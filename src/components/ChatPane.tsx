'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, WifiOff, Wand2, GitBranch, Bug, FileSearch, Bot, ArrowLeft } from 'lucide-react'
import { ChatMessage } from '@/components/ChatMessage'
import { InputBar, type ChatMode } from '@/components/InputBar'
import { AgentRunner } from '@/components/AgentRunner'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/ui/button'
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
}

export function ChatPane({ repository }: ChatPaneProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [currentMode, setCurrentMode] = useState<ChatMode>('default')
  const [showAgentMode, setShowAgentMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<{ content: string; mode: ChatMode } | null>(null)

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
        // Clear chat
        if (!isLoading) {
          setMessages([])
          setError(null)
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

  // If in agent mode, show the AgentRunner
  if (showAgentMode) {
    // Get the initial task from the last user message or lastRequestRef
    const initialTask = lastRequestRef.current?.mode === 'agent' 
      ? lastRequestRef.current.content 
      : undefined

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
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
      className="flex flex-col h-full bg-[#0a0a0a] text-white"
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
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full text-center text-[#9ca3af]"
            >
              <h2 className="text-xl font-semibold mb-2 text-white">
                Welcome to NextEleven Code
              </h2>
              <p className="text-sm max-w-md text-[#9ca3af]">
                Ask me to help you write, edit, or understand code. I can work with files in your repository and help you build amazing things.
              </p>
              
              {/* Agent Mode - Featured */}
              <div className="mt-6 w-full max-w-md">
                <button
                  onClick={() => setShowAgentMode(true)}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-500/20 to-primary/20 rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-all group"
                >
                  <div className="p-3 rounded-full bg-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Bot className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Agent Mode</h3>
                    <p className="text-xs text-[#9ca3af]">Autonomous building - Let Eleven write, test, and fix code automatically</p>
                  </div>
                </button>
              </div>

              {/* Mode quick actions */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="flex flex-col items-center gap-2 p-3 bg-[#1a1a1a] rounded-lg border border-[#1a1a1a] hover:border-primary/50 transition-colors group"
                >
                  <Wand2 className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-white">Refactor</span>
                  <span className="text-[10px] text-[#9ca3af]">/refactor</span>
                </button>
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="flex flex-col items-center gap-2 p-3 bg-[#2a2a3e] rounded-lg border border-[#404050] hover:border-blue-500/50 transition-colors group"
                >
                  <GitBranch className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-white">Orchestrate</span>
                  <span className="text-[10px] text-[#9ca3af]">/orchestrate</span>
                </button>
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="flex flex-col items-center gap-2 p-3 bg-[#2a2a3e] rounded-lg border border-[#404050] hover:border-red-500/50 transition-colors group"
                >
                  <Bug className="h-5 w-5 text-red-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-white">Debug</span>
                  <span className="text-[10px] text-[#9ca3af]">/debug</span>
                </button>
                <button
                  onClick={() => inputRef.current?.focus()}
                  className="flex flex-col items-center gap-2 p-3 bg-[#2a2a3e] rounded-lg border border-[#404050] hover:border-green-500/50 transition-colors group"
                >
                  <FileSearch className="h-5 w-5 text-green-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-white">Review</span>
                  <span className="text-[10px] text-[#9ca3af]">/review</span>
                </button>
              </div>

              {/* Keyboard shortcuts */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#1a1a1a]">
                  <kbd className="font-mono text-primary">⌘+Enter</kbd>
                  <span className="ml-2">Send message</span>
                </div>
                <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#1a1a1a]">
                  <kbd className="font-mono text-primary">⌘+K</kbd>
                  <span className="ml-2">Focus input</span>
                </div>
                <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#1a1a1a]">
                  <kbd className="font-mono text-primary">Esc</kbd>
                  <span className="ml-2">Cancel request</span>
                </div>
                <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#1a1a1a]">
                  <kbd className="font-mono text-primary">⌘+⇧+L</kbd>
                  <span className="ml-2">Clear chat</span>
                </div>
              </div>
            </motion.div>
          ) : (
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
      
      <InputBar 
        ref={inputRef} 
        onSend={handleSendMessage} 
        isLoading={isLoading}
        disabled={!isOnline}
      />
    </div>
  )
}
