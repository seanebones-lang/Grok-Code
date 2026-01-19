import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sign } from 'jsonwebtoken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Mobile Authentication Login Endpoint
 * Handles OAuth callback and returns JWT tokens for mobile apps
 */

const loginSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  redirectUri: z.string().url('Invalid redirect URI'),
})

// JWT secret from environment
const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const ACCESS_TOKEN_EXPIRY = '1h'
const REFRESH_TOKEN_EXPIRY = '7d'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Parse and validate request body
    const body = await request.json()
    const parseResult = loginSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: parseResult.error.issues,
          },
          requestId,
        },
        { status: 400 }
      )
    }

    const { code, redirectUri } = parseResult.data

    // Exchange authorization code for session
    // In a real implementation, this would exchange the code with GitHub OAuth
    // For now, we'll use the existing NextAuth session if available
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Failed to authenticate with GitHub',
          },
          requestId,
        },
        { status: 401 }
      )
    }

    // Generate JWT tokens
    const userId = session.user.email || session.user.id || 'unknown'
    const userEmail = session.user.email || 'unknown@example.com'
    const userName = session.user.name || 'User'

    const accessToken = sign(
      {
        userId,
        email: userEmail,
        name: userName,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = sign(
      {
        userId,
        email: userEmail,
        type: 'refresh',
      },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600, // 1 hour in seconds
          user: {
            id: userId,
            email: userEmail,
            name: userName,
          },
        },
        requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error(`[${requestId}] Mobile login error:`, error)
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
