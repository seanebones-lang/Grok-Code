/**
 * Error Handling Utilities
 * Common error handling patterns and utilities
 */

import { isRetryableError, formatError, NetworkError } from '@/types/errors'

/**
 * Check if an error is a network error
 * 
 * @param error - Error to check
 * @returns True if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return isRetryableError(error) || error instanceof TypeError
}

/**
 * Check if an error is retryable
 * 
 * @param error - Error to check
 * @returns True if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  return isRetryableError(error)
}

/**
 * Format error for display
 * 
 * @param error - Error to format
 * @param context - Optional context string
 * @returns Formatted error message
 */
export function formatErrorForDisplay(error: unknown, context?: string): string {
  return formatError(error, context)
}

/**
 * Create error response object
 * 
 * @param error - Error to create response from
 * @param context - Optional context string
 * @returns Error response object
 */
export function createErrorResponse(
  error: unknown,
  context?: string
): { success: false; output: string; error: string } {
  return {
    success: false,
    output: '',
    error: formatErrorForDisplay(error, context),
  }
}

/**
 * Handle fetch error with proper typing
 * 
 * @param error - Error from fetch operation
 * @param defaultMessage - Default error message
 * @returns Formatted error message
 */
export function handleFetchError(error: unknown, defaultMessage: string): string {
  if (error instanceof NetworkError) {
    return error.message
  }
  
  if (error instanceof TypeError) {
    return 'Network error: Please check your connection'
  }
  
  return formatErrorForDisplay(error, defaultMessage)
}
