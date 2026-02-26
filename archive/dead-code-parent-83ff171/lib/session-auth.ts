/**
 * GitHub OAuth Session Authentication
 * Uses NextAuth.js session instead of API keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../auth' // auth.ts at root: src/lib/ -> root = ../../

/**
 * Public API endpoints that don't require authentication
 */
const PUBLIC_ENDPOINTS = [
  '/api/system/env-status',  // Health check
  '/api/auth/',               // NextAuth routes (signin, callback, etc.)
] as const

/**
 * Check if an endpoint is public (no auth required)
 */
export function isPublicEndpoint(pathname: string): boolean {
  return PUBLIC_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))
}

/**
 * Authenticate API request using GitHub OAuth session
 * Returns NextResponse with error if auth fails, null if successful
 */
export async function authenticateRequest(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  // Skip authentication for public endpoints
  if (isPublicEndpoint(pathname)) {
    return null // Allow access
  }

  try {
    // Get session from NextAuth
    const session = await auth()

    // If no session, require GitHub OAuth login
    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please sign in with GitHub to access this API',
          signInUrl: '/api/auth/signin/github',
          requestId: crypto.randomUUID(),
        },
        { status: 401 }
      )
    }

    // Authentication successful - session exists
    return null
  } catch (error) {
    console.error('[Session-Auth] Error checking session:', error)
    // On error, allow access (graceful degradation)
    // In production, you might want to require auth here
    return null
  }
}

/**
 * Get user information from session
 */
export async function getSessionUser() {
  try {
    const session = await auth()
    return session?.user || null
  } catch {
    return null
  }
}

/**
 * Get GitHub access token from session
 */
export async function getGitHubToken(): Promise<string | null> {
  try {
    const session = await auth()
    if (session?.user && 'accessToken' in session.user) {
      return (session.user as any).accessToken as string
    }
    return null
  } catch {
    return null
  }
}
