// Hydration utilities for SSR + client checks
import { useState, useEffect } from 'react'

export const isHydrated = typeof window !== 'undefined' && (window as any).__HYDRATED__ !== false

export const useIsMounted = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

export const formatRelativeTimeSafe = (date: Date | string | number): string => {
  try {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return 'Just now'
  }
}

export const hydrateClient = () => {
  if (typeof window !== 'undefined') {
    ;(window as any).__HYDRATED__ = true
  }
}
