/**
 * ErrorDisplay Component
 * Shows error messages with retry functionality
 */

'use client'

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

export interface ErrorDisplayProps {
  error: {
    message: string
    retryable: boolean
  } | null
  onRetry?: () => void
  onDismiss: () => void
}

/**
 * Component for displaying error messages
 */
export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  if (!error) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{error.message}</span>
      </div>
      <div className="flex items-center gap-2">
        {error.retryable && onRetry && (
          <button 
            onClick={onRetry}
            className="text-red-400 hover:text-red-300 text-xs underline font-medium"
            aria-label="Retry request"
          >
            Retry
          </button>
        )}
        <button 
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300 text-xs underline"
          aria-label="Dismiss error"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}
