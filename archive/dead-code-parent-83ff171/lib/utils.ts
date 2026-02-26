import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 * 
 * Combines clsx for conditional classes and tailwind-merge for
 * intelligent Tailwind class merging (later classes override earlier ones)
 * 
 * @param inputs - Class values to merge (strings, objects, arrays, etc.)
 * @returns Merged class string with Tailwind conflicts resolved
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * 
 * // Conditional classes
 * cn('base', isActive && 'active', isDisabled && 'disabled')
 * 
 * // Object syntax
 * cn({ 'bg-red-500': hasError, 'bg-green-500': isSuccess })
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with thousands separators
 * 
 * @param num - Number to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567) // => '1,234,567'
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string (e.g., '1.5 MB')
 * 
 * @example
 * formatBytes(1536) // => '1.5 KB'
 * formatBytes(1048576) // => '1 MB'
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Truncate a string to a maximum length with ellipsis
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 50)
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated string
 * 
 * @example
 * truncate('Hello World', 8) // => 'Hello...'
 */
export function truncate(
  str: string, 
  maxLength: number = 50, 
  suffix: string = '...'
): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Debounce a function
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel method
 * 
 * @example
 * const debouncedSearch = debounce(search, 300)
 * debouncedSearch('query')
 * debouncedSearch.cancel() // Cancel pending execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  
  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
  
  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  return debouncedFn
}

/**
 * Throttle a function
 * 
 * @param fn - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 * 
 * @example
 * const throttledScroll = throttle(handleScroll, 100)
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 * 
 * @example
 * await sleep(1000) // Wait 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if code is running on the server
 */
export const isServer = typeof window === 'undefined'

/**
 * Check if code is running on the client
 */
export const isClient = !isServer

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (isClient) return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}
