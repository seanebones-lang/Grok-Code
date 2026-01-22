/**
 * useChatStream Hook
 * Handles streaming chat responses, SSE parsing, and abort control
 */

import { useRef, useCallback, useEffect } from 'react'
import type { Message } from '@/types'

// SSE chunk schema for type-safe parsing
export interface SSEChunk {
  content?: string
  error?: string
  code?: string
  retryable?: boolean
  detectedMode?: 'agent' | 'refactor' | 'debug' | 'review' | 'orchestrate'
  message?: string
}

export function parseSSEChunk(data: string): SSEChunk | null {
  try {
    return JSON.parse(data) as SSEChunk
  } catch {
    return null
  }
}

export interface UseChatStreamOptions {
  onStreamChunk: (chunk: SSEChunk, assistantMessage: Message, originalContent: string) => boolean | void
  onStreamStart: () => Message
  onStreamComplete: () => void
  onStreamError: (error: Error, isRetryable: boolean) => void
}

export interface UseChatStreamReturn {
  abortControllerRef: React.RefObject<AbortController | null>
  startStream: (
    url: string,
    payload: string,
    headers?: Record<string, string>
  ) => Promise<void>
  abort: () => void
}

/**
 * Hook for managing streaming chat responses
 */
export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const { onStreamChunk, onStreamStart, onStreamComplete, onStreamError } = options
  const abortControllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async (
    url: string,
    payload: string,
    headers: Record<string, string> = {}
  ) => {
    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: payload,
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      const assistantMessage = onStreamStart()
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
            onStreamComplete()
            return
          }

          const parsed = parseSSEChunk(data)
          if (!parsed) continue

          // Handle stream chunk using callback
          const shouldReturn = onStreamChunk(parsed, assistantMessage, payload)
          if (shouldReturn === true) {
            return // Early return requested
          }
        }
      }

      onStreamComplete()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled by user - this is expected, not an error
        console.log('Request cancelled by user')
        return
      }

      const error = err instanceof Error ? err : new Error('An unexpected error occurred')
      
      // Determine if error is retryable (network errors are usually retryable)
      const isRetryable = err instanceof TypeError || 
                         (err instanceof Error && (
                           err.message.includes('fetch') || 
                           err.message.includes('network') ||
                           err.message.includes('Failed to fetch')
                         ))
      
      onStreamError(error, isRetryable)
    } finally {
      // Always cleanup AbortController
      abortControllerRef.current = null
    }
  }, [onStreamChunk, onStreamStart, onStreamComplete, onStreamError])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    abortControllerRef,
    startStream,
    abort,
  }
}
