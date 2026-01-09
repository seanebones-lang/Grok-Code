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
  
  // Rate limiting disabled - single user app
  // Just add security headers to API routes
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
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
