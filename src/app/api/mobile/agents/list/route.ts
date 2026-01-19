import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

/**
 * Mobile Agents List Endpoint
 * Returns list of available specialized agents for mobile apps
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

    // Format agents for mobile consumption
    const agents = Object.values(SPECIALIZED_AGENTS).map(agent => ({
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      description: agent.description,
      expertise: agent.expertise,
    }))

    return NextResponse.json(
      {
        success: true,
        data: {
          agents,
          count: agents.length,
        },
        requestId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      }
    )
  } catch (error) {
    console.error(`[${requestId}] Agents list error:`, error)
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
