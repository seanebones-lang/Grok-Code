import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'

/**
 * Mobile User Profile Endpoint
 * Returns user profile information for authenticated mobile users
 */

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

function verifyToken(token: string): any {
  try {
    return verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Get and verify token
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization token required',
          },
          requestId,
        },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.type !== 'access') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
          requestId,
        },
        { status: 401 }
      )
    }

    // Return user profile
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
          },
        },
        requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (error) {
    console.error(`[${requestId}] Profile fetch error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        requestId,
      },
      { status: 500 }
    )
  }
}
