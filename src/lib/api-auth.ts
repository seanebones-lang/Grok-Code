/**
 * API Authentication Utility
 * Provides API key authentication for NextEleven API routes
 * 
 * For single-user deployments: Uses API key from environment variable
 * For multi-user deployments: Can be extended to use database-backed keys
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Public API endpoints that don't require authentication
 */
const PUBLIC_ENDPOINTS = [
  '/api/system/env-status',  // Health check
] as const

/**
 * Check if an endpoint is public (no auth required)
 */
export function isPublicEndpoint(pathname: string): boolean {
  return PUBLIC_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))
}

/**
 * Extract API key from request headers
 * Supports both X-API-Key header and Authorization: Bearer token
 */
export function extractApiKey(request: NextRequest): string | null {
  // Try X-API-Key header first
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey) {
    return apiKey.trim()
  }

  // Try Authorization: Bearer token
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }

  return null
}

/**
 * Validate API key against configured key
 * 
 * @param providedKey - API key from request
 * @returns true if valid, false otherwise
 */
export function validateApiKey(providedKey: string): boolean {
  const configuredKey = process.env.NEXTELEVEN_API_KEY
  
  // If no API key configured, allow access (development mode)
  // In production, this should always be set
  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[API-Auth] NEXTELEVEN_API_KEY not set in production!')
      return false
    }
    console.warn('[API-Auth] NEXTELEVEN_API_KEY not set - allowing access (dev mode)')
    return true
  }

  // Use constant-time comparison to prevent timing attacks
  return safeCompare(providedKey, configuredKey)
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Authenticate API request
 * Returns NextResponse with error if auth fails, null if successful
 */
export function authenticateRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl

  // Skip authentication for public endpoints
  if (isPublicEndpoint(pathname)) {
    return null // Allow access
  }

  // Extract API key from request
  const apiKey = extractApiKey(request)

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        message: 'Provide API key via X-API-Key header or Authorization: Bearer token',
        requestId: crypto.randomUUID(),
      },
      { status: 401 }
    )
  }

  // Validate API key
  if (!validateApiKey(apiKey)) {
    return NextResponse.json(
      {
        error: 'Invalid API key',
        message: 'The provided API key is invalid',
        requestId: crypto.randomUUID(),
      },
      { status: 401 }
    )
  }

  // Authentication successful
  return null
}

/**
 * Get client identifier for rate limiting
 * Uses API key if available, otherwise falls back to IP address
 */
export function getClientIdentifier(request: NextRequest): string {
  const apiKey = extractApiKey(request)
  
  if (apiKey) {
    // Use hashed API key as identifier (don't expose full key in logs)
    const hash = Buffer.from(apiKey).toString('base64').substring(0, 16)
    return `api-key:${hash}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'

  return `ip:${ip}`
}
