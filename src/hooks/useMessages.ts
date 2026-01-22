/**
 * useMessages Hook
 * Manages message state, session persistence, and auto-scroll
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { sessionManager, type ChatSession } from '@/lib/session-manager'
import { debounce } from '@/lib/utils'
import { useToastActions } from '@/components/Toast'
import type { Message } from '@/types'

const SESSION_UPDATE_DEBOUNCE_MS = 500

/**
 * Options for the useMessages hook
 */
export interface UseMessagesOptions {
  /** Initial session ID to load */
  sessionId?: string | null
  /** Callback when session changes */
  onSessionChange?: (sessionId: string) => void
  /** GitHub repository context */
  repository?: {
    owner: string
    repo: string
    branch?: string
  }
}

/**
 * Return type for the useMessages hook
 */
export interface UseMessagesReturn {
  /** Array of chat messages */
  messages: Message[]
  /** Setter for messages array */
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  /** Add a new message to the array */
  addMessage: (message: Message) => void
  /** Update the last message using an updater function */
  updateLastMessage: (updater: (msg: Message) => Message) => void
  /** Clear all messages and create a new session */
  clearMessages: () => void
  /** Ref to the messages end element for auto-scroll */
  messagesEndRef: React.RefObject<HTMLDivElement>
  /** Function to scroll to the bottom of messages */
  scrollToBottom: () => void
  /** Current session ID */
  currentSessionId: string | null
  /** Setter for current session ID */
  setCurrentSessionId: (id: string | null) => void
}

/**
 * Hook for managing chat messages with session persistence
 * 
 * @param options - Configuration options for the hook
 * @returns Object with message state and management functions
 * 
 * @example
 * ```tsx
 * const { messages, addMessage, clearMessages } = useMessages({
 *   repository: { owner: 'user', repo: 'repo' },
 *   onSessionChange: (id) => console.log('New session:', id)
 * })
 * ```
 */
export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const { sessionId: initialSessionId, onSessionChange, repository } = options
  const [messages, setMessages] = useState<Message[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToastActions()

  // Initialize or load session
  useEffect(() => {
    const session = sessionManager.getCurrent()
    setCurrentSessionId(session.id)
    if (session.messages.length > 0) {
      setMessages(session.messages)
    }
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

  // Listen for session events
  useEffect(() => {
    const handleNewSession = (e: CustomEvent<{ message?: string; forceNew?: boolean; agentId?: string }>) => {
      const { forceNew, agentId } = e.detail || {}
      
      if (forceNew || !currentSessionId || messages.length > 0) {
        const newSession = sessionManager.create({
          agentId,
          metadata: {
            repository: repository ? { ...repository, branch: repository.branch || 'main' } : undefined,
            model: undefined,
            environment: 'cloud',
          },
        })
        setCurrentSessionId(newSession.id)
        setMessages([])
        onSessionChange?.(newSession.id)
        window.dispatchEvent(new CustomEvent('sessionUpdated'))
      }
    }

    const handleLoadSession = (e: CustomEvent<{ session: ChatSession }>) => {
      const { session } = e.detail
      setCurrentSessionId(session.id)
      setMessages(session.messages)
      onSessionChange?.(session.id)
    }

    window.addEventListener('newSession', handleNewSession as EventListener)
    window.addEventListener('loadSession', handleLoadSession as EventListener)
    
    return () => {
      window.removeEventListener('newSession', handleNewSession as EventListener)
      window.removeEventListener('loadSession', handleLoadSession as EventListener)
    }
  }, [currentSessionId, messages.length, onSessionChange, repository])

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Helper function to add a message
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  // Helper function to update last assistant message
  const updateLastMessage = useCallback((updater: (msg: Message) => Message) => {
    setMessages((prev) => {
      const updated = [...prev]
      const lastIndex = updated.length - 1
      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
        updated[lastIndex] = updater(updated[lastIndex])
      }
      return updated
    })
  }, [])

  // Helper function to clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
    const newSession = sessionManager.create({
      metadata: {
        repository: repository ? { ...repository, branch: repository.branch || 'main' } : undefined,
      },
    })
    setCurrentSessionId(newSession.id)
    onSessionChange?.(newSession.id)
    window.dispatchEvent(new CustomEvent('sessionUpdated'))
  }, [onSessionChange, repository])

  return {
    messages,
    setMessages,
    addMessage,
    updateLastMessage,
    clearMessages,
    messagesEndRef,
    scrollToBottom,
    currentSessionId,
    setCurrentSessionId,
  }
}
