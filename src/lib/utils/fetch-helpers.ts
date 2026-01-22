/**
 * Fetch Helper Utilities
 * Common fetch patterns and utilities
 */

import type { ApiResponse, FetchResponse, ApiRequestOptions } from '@/types/api'
import { handleFetchError, createErrorResponse } from './error-handling'

/**
 * Safe fetch wrapper with error handling
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise resolving to typed response
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<FetchResponse<T>> {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })

    const data = await parseJsonResponse<T>(response)

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : (data as ApiResponse<T>).error || response.statusText,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      error: handleFetchError(error, 'Failed to fetch'),
    }
  }
}

/**
 * Parse JSON response with error handling
 * 
 * @param response - Fetch response object
 * @returns Promise resolving to parsed JSON
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T | ApiResponse<T>> {
  try {
    const text = await response.text()
    if (!text) {
      return {} as T
    }
    return JSON.parse(text) as T | ApiResponse<T>
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${handleFetchError(error, 'Parse error')}`)
  }
}

/**
 * Handle fetch error response
 * 
 * @param response - Fetch response object
 * @param defaultError - Default error message
 * @returns Error response object
 */
export async function handleFetchErrorResponse(
  response: Response,
  defaultError: string
): Promise<{ success: false; output: string; error: string }> {
  try {
    const data = await response.json()
    return createErrorResponse(
      new Error((data as ApiResponse).error || defaultError),
      defaultError
    )
  } catch {
    return createErrorResponse(
      new Error(`${defaultError}: ${response.status} ${response.statusText}`),
      defaultError
    )
  }
}

/**
 * Create fetch request with standardized error handling
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise resolving to tool execution result
 */
export async function fetchWithErrorHandling(
  url: string,
  options: ApiRequestOptions = {}
): Promise<{ success: boolean; output: string; error?: string }> {
  const response = await safeFetch(url, options)

  if (!response.ok) {
    return {
      success: false,
      output: '',
      error: response.error || `Request failed with status ${response.status}`,
    }
  }

  return {
    success: true,
    output: typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data),
  }
}
