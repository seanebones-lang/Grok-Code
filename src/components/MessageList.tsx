/**
 * MessageList Component
 * Renders the list of chat messages with auto-scroll
 */

'use client'

import { memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChatMessage } from '@/components/ChatMessage'
import type { Message } from '@/types'

/**
 * Props for the MessageList component
 */
export interface MessageListProps {
  /** Array of messages to display */
  messages: Message[]
  /** Optional retry handler for failed messages */
  onRetry?: () => void
  /** Ref to the end of messages for auto-scroll */
  messagesEndRef: React.RefObject<HTMLDivElement>
}

/**
 * Component for rendering chat messages with animations
 * 
 * @param props - Component props
 * @returns JSX element
 * 
 * @example
 * ```tsx
 * <MessageList 
 *   messages={messages}
 *   onRetry={handleRetry}
 *   messagesEndRef={messagesEndRef}
 * />
 * ```
 */
/**
 * Memoized MessageList component to prevent unnecessary re-renders
 * Only re-renders when messages array reference changes or onRetry changes
 * 
 * Performance optimizations:
 * - Memoized to prevent re-renders
 * - Only renders visible messages (future: virtual scrolling)
 * - Optimized AnimatePresence usage
 */
export const MessageList = memo(function MessageList({ messages, onRetry, messagesEndRef }: MessageListProps) {
  // Limit visible messages for performance (show last 100 messages)
  // Future: Implement virtual scrolling for better performance with 100+ messages
  const visibleMessages = messages.length > 100 
    ? messages.slice(-100) 
    : messages

  return (
    <div 
      className="flex-1 overflow-y-auto py-6 space-y-6 relative"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length > 100 && (
        <div className="text-xs text-[#9ca3af] px-4 py-2 text-center">
          Showing last 100 messages ({messages.length - 100} older messages hidden)
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {visibleMessages.length === 0 ? null : (
          visibleMessages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message}
              onRetry={message.metadata?.error ? onRetry : undefined}
            />
          ))
        )}
      </AnimatePresence>
      
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if messages array reference changed or length changed
  // This prevents re-renders when messages content updates but array reference is same
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.onRetry === nextProps.onRetry
  )
})
