/**
 * MessageList Component
 * Renders the list of chat messages with auto-scroll
 */

'use client'

import { AnimatePresence } from 'framer-motion'
import { ChatMessage } from '@/components/ChatMessage'
import type { Message } from '@/types'

export interface MessageListProps {
  messages: Message[]
  onRetry?: () => void
  messagesEndRef: React.RefObject<HTMLDivElement>
}

/**
 * Component for rendering chat messages
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
