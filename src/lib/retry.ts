/**
 * Retry utility for API calls with exponential backoff
 * Handles transient failures, rate limits, and network errors
 */

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  retryableStatuses?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableStatuses: number[]): boolean {
  // Network errors
  if (error.message && (
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.message.includes('ECONNRESET') ||
    error.message.includes('ETIMEDOUT')
  )) {
    return true
  }
  
  // HTTP status codes
  if (error.status && retryableStatuses.includes(error.status)) {
    return true
  }
  
  // Response status codes
  if (error.response?.status && retryableStatuses.includes(error.response.status)) {
    return true
  }
  
  return false
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1)
  return Math.min(exponentialDelay, maxDelayMs)
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry (should return Promise)
 * @param options - Retry configuration options
 * @returns Promise that resolves with function result or rejects after max retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if error is retryable
      const retryable = isRetryableError(error, opts.retryableStatuses)
      
      // Don't retry if not retryable or on last attempt
      if (!retryable || attempt === opts.maxRetries) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs)
      
      // Respect Retry-After header if present (for 429 rate limits)
      let actualDelay = delay
      if (error.response?.headers?.['retry-after']) {
        const retryAfter = parseInt(error.response.headers['retry-after'], 10)
        if (!isNaN(retryAfter)) {
          actualDelay = Math.max(delay, retryAfter * 1000)
        }
      }
      
      console.log(`[Retry] Attempt ${attempt}/${opts.maxRetries} failed, retrying after ${actualDelay}ms...`)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, actualDelay))
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError
}
