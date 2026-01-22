/**
 * API Type Definitions
 * Type-safe API response and request types
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  code?: string
  requestId?: string
}

/**
 * Fetch response with typed data
 */
export interface FetchResponse<T = unknown> {
  ok: boolean
  status: number
  statusText: string
  data?: T
  error?: string
}

/**
 * JWT token payload structure
 */
export interface JWTTokenPayload {
  userId: string
  exp: number
  iat: number
  [key: string]: unknown // Allow additional claims
}

/**
 * GitHub token payload structure
 */
export interface GitHubTokenPayload {
  access_token: string
  token_type: string
  scope?: string
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: unknown
  signal?: AbortSignal
}

/**
 * Type guard: Check if value is a valid API response
 */
export function isApiResponse<T = unknown>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('data' in value || 'error' in value)
  )
}

/**
 * Type guard: Check if value is a valid JWT token payload
 */
export function isJWTTokenPayload(value: unknown): value is JWTTokenPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'userId' in value &&
    typeof (value as JWTTokenPayload).userId === 'string' &&
    'exp' in value &&
    typeof (value as JWTTokenPayload).exp === 'number' &&
    'iat' in value &&
    typeof (value as JWTTokenPayload).iat === 'number'
  )
}

/**
 * Type guard: Check if value is a valid GitHub token payload
 */
export function isGitHubTokenPayload(value: unknown): value is GitHubTokenPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'access_token' in value &&
    typeof (value as GitHubTokenPayload).access_token === 'string' &&
    'token_type' in value &&
    typeof (value as GitHubTokenPayload).token_type === 'string'
  )
}
