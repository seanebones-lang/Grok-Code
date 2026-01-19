import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

/**
 * Mobile Agents List Endpoint
 * Returns simplified list of available agents for mobile apps
 */

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Verify authentication (optional for agents list, but recommended)
    const token = getTokenFromRequest(request)
    if (token) {
      const decoded = verifyJWT(token)
      if (!decoded) {
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
    }

    // Format agents for mobile consumption (simplified)
    const agents = Object.values(SPECIALIZED_AGENTS).map(agent => ({
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      desc: agent.description,
      expertise: agent.expertise.slice(0, 3), // First 3 expertise areas
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