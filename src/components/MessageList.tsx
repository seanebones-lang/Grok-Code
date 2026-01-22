/**
 * MessageList Component
 * Renders the list of chat messages with auto-scroll
 */

'use client'

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
export function MessageList({ messages, onRetry, messagesEndRef }: MessageListProps) {
  return (
    <div 
      className="flex-1 overflow-y-auto py-6 space-y-6 relative"
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
              onRetry={message.metadata?.error ? onRetry : undefined}
            />
          ))
        )}
      </AnimatePresence>
      
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  )
}
