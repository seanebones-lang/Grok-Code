/**
 * Error Handler
 * Standardized error handling and response formatting
 */

import type { StreamErrorResponse, ApiErrorResponse } from '@/types/errors'
import { isRetryableError, formatError } from '@/types/errors'

// Re-export for backward compatibility
export type StreamError = StreamErrorResponse
export type ApiError = ApiErrorResponse

/**
 * Create a standardized error response for API routes
 * 
 * @param error - Error message or Error instance
 * @param code - Optional error code
 * @param details - Optional error details
 * @param requestId - Optional request ID for tracing
 * @returns Standardized API error response
 */
export function createApiError(
  error: string | Error,
  code?: string,
  details?: Record<string, unknown>,
  requestId?: string
): ApiErrorResponse {
  return {
    error: error instanceof Error ? error.message : error,
    code,
    details,
    requestId,
  }
}

/**
 * Create a standardized SSE error response
 * 
 * @param error - Stream error object
 * @returns Formatted SSE error string
 */
export function createStreamError(error: StreamErrorResponse): string {
  return `data: ${JSON.stringify(error)}\n\n`
}

/**
 * Handle and format errors consistently
 * 
 * @param error - Unknown error value
 * @param context - Optional context string
 * @param requestId - Optional request ID for tracing
 * @returns Formatted error information with status code
 */
export function handleError(
  error: unknown,
  context?: string,
  requestId?: string
): { message: string; code: string; status: number } {
  if (error instanceof Error) {
    // Known error types
    if (error.name === 'AbortError') {
      return {
        message: 'Request timeout',
        code: 'TIMEOUT',
        status: 408,
      }
    }

    if (error.message.includes('API key')) {
      return {
        message: 'API authentication failed',
        code: 'AUTH_ERROR',
        status: 401,
      }
    }

    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      status: 500,
    }
  }

  return {
    message: formatError(error, context),
    code: 'UNKNOWN_ERROR',
    status: 500,
  }
}

/**
 * Log error with context
 * 
 * @param error - Unknown error value
 * @param context - Error context string
 * @param requestId - Optional request ID for tracing
 */
export function logError(
  error: unknown,
  context: string,
  requestId?: string
): void {
  const errorInfo = handleError(error, context, requestId)
  const errorMessage = formatError(error, context)
  
  console.error(
    `[${requestId || 'NO_ID'}] ${context}:`,
    error instanceof Error ? error.stack : errorMessage,
    errorInfo
  )
}
