import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authenticateRequest, getClientIdentifier, isPublicEndpoint } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/ratelimit'

// Security headers for all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.babylonjs.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.x.ai https://api.github.com https://api.vercel.com https://api.railway.app https://backboard.railway.app; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Authenticate request (skip for public endpoints)
    const authError = authenticateRequest(request)
    if (authError) {
      // Add security headers to error response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        authError.headers.set(key, value)
      })
      return authError
    }

    // Rate limiting (skip for public endpoints)
    if (!isPublicEndpoint(pathname)) {
      const clientId = getClientIdentifier(request)
      const rateLimitResult = await checkRateLimit(clientId)

      // Create response with security headers
      const response = NextResponse.next()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      // Add rate limit headers (RFC 6585)
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString())

      // Return 429 if rate limit exceeded
      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${rateLimitResult.limit} requests per hour. Try again after ${new Date(rateLimitResult.reset).toISOString()}`,
            requestId: crypto.randomUUID(),
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              ...Object.fromEntries(Object.entries(securityHeaders)),
              'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            },
          }
        )
      }

      return response
    }

    // Public endpoint - just add security headers
    const response = NextResponse.next()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
  
  // Non-API routes - just add security headers
  const response = NextResponse.next()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
}
