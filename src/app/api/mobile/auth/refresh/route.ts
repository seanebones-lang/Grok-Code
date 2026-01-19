import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sign, verify } from 'jsonwebtoken'

/**
 * Mobile Authentication Refresh Token Endpoint
 * Exchanges refresh token for new access token
 */

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required'),
})

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const ACCESS_TOKEN_EXPIRY = '1h'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const parseResult = refreshSchema.safeParse(body)
    
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

    const { refresh_token } = parseResult.data

    // Verify refresh token
    let decoded: any
    try {
      decoded = verify(refresh_token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired refresh token',
          },
          requestId,
        },
        { status: 401 }
      )
    }

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Token is not a refresh token',
          },
          requestId,
        },
        { status: 401 }
      )
    }

    // Generate new access token
    const accessToken = sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
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
    console.error(`[${requestId}] Token refresh error:`, error)
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
