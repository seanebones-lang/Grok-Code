'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Loading Components
 * Consistent loading states across the application
 */

// ============================================================================
// Spinner
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

export const Spinner = memo(function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2 
      className={cn(
        "animate-spin text-[#6841e7]",
        spinnerSizes[size],
        className
      )}
      aria-hidden="true"
    />
  )
})

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  message?: string
  fullScreen?: boolean
  className?: string
}

export const LoadingOverlay = memo(function LoadingOverlay({ 
  message = 'Loading...', 
  fullScreen = false,
  className,
}: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex flex-col items-center justify-center bg-[#0f0f23]/80 backdrop-blur-sm",
        fullScreen ? "fixed inset-0 z-50" : "absolute inset-0",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Spinner size="xl" />
      <p className="mt-4 text-sm text-[#9ca3af]">{message}</p>
    </motion.div>
  )
})

// ============================================================================
// Skeleton
// ============================================================================

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton = memo(function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  return (
    <div
      className={cn(
        "bg-[#2a2a3e]",
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  )
})

// ============================================================================
// Loading Card
// ============================================================================

export const LoadingCard = memo(function LoadingCard() {
  return (
    <div className="p-4 rounded-lg bg-[#2a2a3e] border border-[#404050] space-y-3">
      <Skeleton height={20} width="60%" />
      <Skeleton height={16} width="100%" />
      <Skeleton height={16} width="80%" />
      <div className="flex gap-2 pt-2">
        <Skeleton height={32} width={80} />
        <Skeleton height={32} width={80} />
      </div>
    </div>
  )
})

// ============================================================================
// Loading Messages (for chat)
// ============================================================================

export const LoadingMessage = memo(function LoadingMessage() {
  return (
    <div className="flex gap-2">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="40%" />
        <Skeleton height={60} width="100%" />
      </div>
    </div>
  )
})

// ============================================================================
// Full Page Loading
// ============================================================================

interface PageLoadingProps {
  message?: string
}

export const PageLoading = memo(function PageLoading({ 
  message = 'Loading NextEleven Code...' 
}: PageLoadingProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0f0f23]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        {/* Logo animation */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          className="mb-6"
        >
          <Code2 className="h-16 w-16 text-[#6841e7]" />
        </motion.div>
        
        {/* Loading dots */}
        <div className="flex gap-1 mb-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[#6841e7]"
              animate={{
                y: [0, -8, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
        
        <p className="text-[#9ca3af] text-sm">{message}</p>
      </motion.div>
    </div>
  )
})

// ============================================================================
// Inline Loading
// ============================================================================

interface InlineLoadingProps {
  text?: string
  className?: string
}

export const InlineLoading = memo(function InlineLoading({ 
  text = 'Loading',
  className,
}: InlineLoadingProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[#9ca3af]", className)}>
      <Spinner size="sm" />
      <span>{text}</span>
    </span>
  )
})

// ============================================================================
// Button Loading State
// ============================================================================

interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
}

export const ButtonLoading = memo(function ButtonLoading({
  loading,
  children,
  loadingText = 'Loading...',
}: ButtonLoadingProps) {
  if (loading) {
    return (
      <>
        <Spinner size="sm" className="mr-2" />
        {loadingText}
      </>
    )
  }
  return <>{children}</>
})
