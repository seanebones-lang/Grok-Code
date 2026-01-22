/**
 * StreamingIndicator Component
 * Shows loading state and streaming progress
 */

'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { ChatMode } from '@/components/InputBar'

export interface StreamingIndicatorProps {
  isLoading: boolean
  mode: ChatMode
  onCancel?: () => void
}

/**
 * Component for displaying streaming/loading state
 */
export function StreamingIndicator({ isLoading, mode, onCancel }: StreamingIndicatorProps) {
  if (!isLoading) return null

  const modeMessages: Record<ChatMode, string> = {
    default: 'Eleven is thinking...',
    agent: 'Agent is working autonomously...',
    refactor: 'Analyzing and planning refactor...',
    orchestrate: 'Orchestrating agents...',
    debug: 'Debugging and analyzing...',
    review: 'Reviewing code...',
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-[#9ca3af]"
      role="status"
      aria-label="Eleven is generating a response"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm text-[#9ca3af]">
        {modeMessages[mode]}
      </span>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-xs text-[#9ca3af] hover:text-white underline ml-2"
          aria-label="Cancel request"
        >
          Cancel
        </button>
      )}
    </motion.div>
  )
}
