import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Security headers for all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Rate limiting disabled - single user app
// const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
// const RATE_LIMIT_WINDOW = 60 * 1000
// const RATE_LIMIT_MAX = 60

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // CRITICAL: Always allow NextAuth routes to pass through without interference
  // This includes /api/auth/* routes (signin, callback, signout, etc.)
  if (pathname.startsWith('/api/auth/')) {
    const response = NextResponse.next()
    // Add security headers but don't block the route
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
  
  // Rate limiting disabled - single user app
  // Just add security headers to other API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
  
  // Protected routes that require authentication
  const protectedPaths = ['/api/github/push']
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    // Check for session cookie (basic check, full auth in route handler)
    const sessionCookie = request.cookies.get('next-auth.session-token') ||
                          request.cookies.get('__Secure-next-auth.session-token')
    
    if (!sessionCookie) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
        }
      )
    }
  }
  
  // Add security headers to all responses
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
