'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToastMessage } from '@/types'

/**
 * Toast Notification System
 * Provides a context-based toast notification system with animations
 */

// ============================================================================
// Context
// ============================================================================

interface ToastContextValue {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ============================================================================
// Hook
// ============================================================================

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Convenience methods
export function useToastActions() {
  const { addToast } = useToast()
  
  return {
    success: (title: string, description?: string) => 
      addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) => 
      addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) => 
      addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) => 
      addToast({ type: 'info', title, description }),
  }
}

// ============================================================================
// Provider
// ============================================================================

interface ToastProviderProps {
  children: ReactNode
  maxToasts?: number
  defaultDuration?: number
}

export function ToastProvider({ 
  children, 
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>): string => {
    const id = crypto.randomUUID()
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration,
    }
    
    setToasts(prev => {
      const updated = [newToast, ...prev]
      // Limit number of toasts
      return updated.slice(0, maxToasts)
    })
    
    return id
  }, [defaultDuration, maxToasts])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Toast Component
// ============================================================================

interface ToastProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

function Toast({ toast, onRemove }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Auto-dismiss
  useEffect(() => {
    if (toast.duration && toast.duration > 0 && !isHovered) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)
      
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, isHovered, onRemove])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const colors = {
    success: {
      bg: 'bg-green-500/10 border-green-500/20',
      icon: 'text-green-400',
      progress: 'bg-green-400',
    },
    error: {
      bg: 'bg-red-500/10 border-red-500/20',
      icon: 'text-red-400',
      progress: 'bg-red-400',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: 'text-amber-400',
      progress: 'bg-amber-400',
    },
    info: {
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: 'text-blue-400',
      progress: 'bg-blue-400',
    },
  }

  const Icon = icons[toast.type]
  const color = colors[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-lg border shadow-lg pointer-events-auto",
        "bg-[#1a1a2e] backdrop-blur-sm",
        color.bg
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", color.icon)} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm text-[#9ca3af]">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4 text-[#9ca3af]" />
        </button>
      </div>
      
      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && !isHovered && (
        <motion.div
          className={cn("absolute bottom-0 left-0 h-1", color.progress)}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

// ============================================================================
// Standalone Toast Function (for use outside React)
// ============================================================================

let toastFn: ((toast: Omit<ToastMessage, 'id'>) => string) | null = null

export function setToastFunction(fn: (toast: Omit<ToastMessage, 'id'>) => string) {
  toastFn = fn
}

export function toast(options: Omit<ToastMessage, 'id'>): string | null {
  if (toastFn) {
    return toastFn(options)
  }
  console.warn('Toast function not initialized. Make sure ToastProvider is mounted.')
  return null
}

toast.success = (title: string, description?: string) => 
  toast({ type: 'success', title, description })

toast.error = (title: string, description?: string) => 
  toast({ type: 'error', title, description })

toast.warning = (title: string, description?: string) => 
  toast({ type: 'warning', title, description })

toast.info = (title: string, description?: string) => 
  toast({ type: 'info', title, description })
