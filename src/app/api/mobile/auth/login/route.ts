import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { completeOAuthFlow } from '@/lib/auth'

/**
 * Mobile Authentication Login Endpoint
 * Handles OAuth callback (GET) and code exchange (POST)
 * Returns JWT tokens for mobile apps
 */

const loginSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  redirectUri: z.string().url('Invalid redirect URI').optional(),
})

/**
 * GET: OAuth callback handler
 * Mobile apps redirect here after GitHub OAuth
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const code = request.nextUrl.searchParams.get('code')
    
    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_CODE',
            message: 'No authorization code provided',
          },
          requestId,
        },
        { status: 400 }
      )
    }

    // Complete OAuth flow: exchange code → get user → sign JWT
    const { token, user } = await completeOAuthFlow(code)

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user,
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
    console.error(`[${requestId}] Mobile OAuth callback error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to authenticate with GitHub',
        },
        requestId,
      },
      { status: 401 }
    )
  }
}

/**
 * POST: Code exchange handler
 * Mobile apps can POST the code directly
 */
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

    const { code } = parseResult.data

    // Complete OAuth flow: exchange code → get user → sign JWT
    const { token, user } = await completeOAuthFlow(code)

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user,
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
          code: 'AUTHENTICATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to authenticate with GitHub',
        },
        requestId,
      },
      { status: 401 }
    )
  }
}
