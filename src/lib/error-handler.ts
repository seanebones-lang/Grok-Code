/**
 * Error Handler
 * Standardized error handling and response formatting
 */

export interface StreamError {
  error: string
  code?: string
  retryable?: boolean
}

export interface ApiError {
  error: string
  code?: string
  details?: unknown
  requestId?: string
}

/**
 * Create a standardized error response for API routes
 */
export function createApiError(
  error: string | Error,
  code?: string,
  details?: unknown,
  requestId?: string
): ApiError {
  return {
    error: error instanceof Error ? error.message : error,
    code,
    details,
    requestId,
  }
}

/**
 * Create a standardized SSE error response
 */
export function createStreamError(error: StreamError): string {
  return `data: ${JSON.stringify(error)}\n\n`
}

/**
 * Handle and format errors consistently
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
    message: context || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    status: 500,
  }
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: string,
  requestId?: string
): void {
  const errorInfo = handleError(error, context, requestId)
  console.error(
    `[${requestId || 'NO_ID'}] ${context}:`,
    error instanceof Error ? error.stack : error,
    errorInfo
  )
}
