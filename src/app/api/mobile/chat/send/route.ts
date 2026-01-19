import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verify } from 'jsonwebtoken'

/**
 * Mobile Chat Send Endpoint
 * Mobile-optimized chat endpoint with JWT authentication
 */

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(50000, 'Message too long'),
  conversationId: z.string().uuid().optional(),
  mode: z.enum(['default', 'refactor', 'orchestrate', 'debug', 'review', 'agent']).optional(),
})

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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Verify authentication
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

    // Parse and validate request body
    const body = await request.json()
    const parseResult = chatSchema.safeParse(body)
    
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

    const { message, conversationId, mode } = parseResult.data

    // Forward to main chat endpoint with user context
    // In production, this would call the chat service directly
    const chatResponse = await fetch(`${request.nextUrl.origin}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        conversationId,
        mode,
        userId: decoded.userId,
      }),
    })

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHAT_ERROR',
            message: errorData.error || 'Failed to process chat message',
          },
          requestId,
        },
        { status: chatResponse.status }
      )
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Chat message sent successfully',
          conversationId: conversationId || crypto.randomUUID(),
        },
        requestId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(`[${requestId}] Mobile chat error:`, error)
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
