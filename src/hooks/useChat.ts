import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { Message, GrokStreamChunk } from '@/types'
import type { ChatMode } from '@/components/InputBar'

interface UseChatOptions {
  onError?: (error: Error) => void
  onMessageComplete?: (message: Message) => void
  maxHistoryLength?: number
}

interface UseChatReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  currentMode: ChatMode
  sendMessage: (content: string, mode?: ChatMode) => Promise<void>
  clearMessages: () => void
  cancelRequest: () => void
  retryLastMessage: () => void
  setMode: (mode: ChatMode) => void
}

/**
 * Custom hook for managing chat state and API interactions
 * Handles SSE streaming, error recovery, message management, and chat modes
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onError, onMessageComplete, maxHistoryLength = 20 } = options
  
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMode, setCurrentMode] = useState<ChatMode>('default')
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastUserMessageRef = useRef<{ content: string; mode: ChatMode } | null>(null)

  // Build conversation history for API
  const conversationHistory = useMemo(() => {
    return messages
      .slice(-maxHistoryLength)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }, [messages, maxHistoryLength])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Parse SSE chunk safely
   */
  const parseSSEChunk = useCallback((data: string): GrokStreamChunk | null => {
    try {
      return JSON.parse(data) as GrokStreamChunk
    } catch {
      return null
    }
  }, [])

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(async (content: string, mode: ChatMode = 'default') => {
    if (!content.trim() || isLoading) return
    
    setError(null)
    lastUserMessageRef.current = { content, mode }
    setCurrentMode(mode)
    
    // Create user message with mode metadata
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      metadata: mode !== 'default' ? { mode } : undefined,
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    // Create abort controller
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
          history: conversationHistory.slice(0, -1), // Exclude the message we just added
        }),
        signal: abortControllerRef.current.signal,
      })
      
      // Handle non-streaming errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed: ${response.status}`)
      }
      
      if (!response.body) {
        throw new Error('No response body')
      }
      
      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Stream the response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
          
          const data = trimmedLine.slice(6)
          if (data === '[DONE]') {
            setIsLoading(false)
            onMessageComplete?.(assistantMessage)
            return
          }
          
          const parsed = parseSSEChunk(data)
          if (!parsed) continue
          
          if (parsed.error) {
            setError(parsed.error)
            continue
          }
          
          if (parsed.content) {
            assistantMessage.content += parsed.content
            setMessages(prev => {
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
      
      onMessageComplete?.(assistantMessage)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      
      // Add error message to chat
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
        metadata: { error: true },
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isLoading, parseSSEChunk, onError, onMessageComplete, conversationHistory])

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    if (isLoading) {
      abortControllerRef.current?.abort()
    }
    setMessages([])
    setError(null)
    setIsLoading(false)
    lastUserMessageRef.current = null
  }, [isLoading])

  /**
   * Cancel the current request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  /**
   * Retry the last user message
   */
  const retryLastMessage = useCallback(() => {
    if (lastUserMessageRef.current && !isLoading) {
      // Remove the last error message if present
      setMessages(prev => prev.filter(m => !m.metadata?.error))
      sendMessage(lastUserMessageRef.current.content, lastUserMessageRef.current.mode)
    }
  }, [isLoading, sendMessage])

  /**
   * Set the current chat mode
   */
  const setMode = useCallback((mode: ChatMode) => {
    setCurrentMode(mode)
  }, [])

  return {
    messages,
    isLoading,
    error,
    currentMode,
    sendMessage,
    clearMessages,
    cancelRequest,
    retryLastMessage,
    setMode,
  }
}
