'use client'

import { useRef, useState, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMode } from '@/components/InputBar'

// Extend window for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface InputBarProps {
  /** Whether the input is loading/disabled */
  isLoading: boolean
  /** Whether the user is online */
  isOnline: boolean
  /** Callback when message is sent */
  onSendMessage: (content: string, mode: ChatMode) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional className */
  className?: string
}

/**
 * InputBar Component
 *
 * Simple input bar for chat messages, similar to Claude Code.
 * Handles Enter key submission and basic validation.
 */
export function InputBar({
  isLoading,
  isOnline,
  onSendMessage,
  placeholder = "Reply...",
  className = ""
}: InputBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  return (
    <div className={`border-t border-[#1a1a1a] bg-[#0f0f23] px-4 py-3 ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder:text-[#6b7280] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const value = (e.target as HTMLInputElement).value.trim()
              if (value && !isLoading) {
                onSendMessage(value, 'default')
                ;(e.target as HTMLInputElement).value = ''
              }
            }
          }}
          disabled={isLoading || !isOnline}
        />
      </div>
    </div>
  )
}