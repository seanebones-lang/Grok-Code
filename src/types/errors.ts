/**
 * Error Type Definitions
 * Comprehensive error types for type-safe error handling
 */

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
  requestId?: string
}

/**
 * Stream error response structure
 */
export interface StreamErrorResponse {
  error: string
  code?: string
  retryable?: boolean
}

/**
 * Network error with retry information
 */
export class NetworkError extends Error {
  readonly type = 'network' as const
  readonly retryable: boolean

  constructor(message: string, retryable = true) {
    super(message)
    this.name = 'NetworkError'
    this.retryable = retryable
  }
}

/**
 * Tool execution error with context
 */
export class ToolExecutionError extends Error {
  readonly toolName: string
  readonly arguments: Record<string, unknown>

  constructor(
    message: string,
    toolName: string,
    toolArguments: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ToolExecutionError'
    this.toolName = toolName
    this.arguments = toolArguments
  }
}

/**
 * API authentication error
 */
export class AuthenticationError extends Error {
  readonly type = 'authentication' as const
  readonly statusCode: number

  constructor(message: string, statusCode = 401) {
    super(message)
    this.name = 'AuthenticationError'
    this.statusCode = statusCode
  }
}

/**
 * Type guard: Check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * Type guard: Check if error is a ToolExecutionError
 */
export function isToolExecutionError(error: unknown): error is ToolExecutionError {
  return error instanceof ToolExecutionError
}

/**
 * Type guard: Check if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError
}

/**
 * Type guard: Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return error.retryable
  }
  
  if (error instanceof TypeError) {
    return true // Network errors are usually retryable
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('timeout')
    )
  }
  
  return false
}

/**
 * Format error for display
 */
export function formatError(error: unknown, context?: string): string {
  if (error instanceof Error) {
    return context ? `${context}: ${error.message}` : error.message
  }
  
  if (typeof error === 'string') {
    return context ? `${context}: ${error}` : error
  }
  
  return context ? `${context}: An unexpected error occurred` : 'An unexpected error occurred'
}
