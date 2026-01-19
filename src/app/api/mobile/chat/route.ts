import { NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyJWT } from '@/lib/auth'
import { streamGrokResponse } from '@/lib/grok'

/**
 * Mobile Chat Endpoint with Streaming
 * Handles chat messages and streams responses for mobile apps
 */

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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Verify authentication
    const token = getTokenFromRequest(request)
    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization token required',
          },
          requestId,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
          requestId,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = chatSchema.safeParse(body)
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: parseResult.error.issues,
          },
          requestId,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { message, conversationId, mode } = parseResult.data

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        try {
          // Stream Grok response
          await streamGrokResponse(
            [
              {
                role: 'system',
                content: 'You are Eleven, an advanced AI coding assistant. Provide helpful, accurate, and concise responses.',
              },
              {
                role: 'user',
                content: message,
              },
            ],
            (content: string) => {
              // Send chunk as plain text for mobile
              controller.enqueue(encoder.encode(content))
            },
            (error: Error) => {
              console.error(`[${requestId}] Stream error:`, error)
              controller.enqueue(
                encoder.encode(`\n\n[Error: ${error.message}]`)
              )
              controller.close()
            },
            {
              model: 'grok-4.1-fast',
              temperature: 0.7,
              maxTokens: 4000,
            }
          )
          
          controller.close()
        } catch (error) {
          console.error(`[${requestId}] Chat error:`, error)
          controller.enqueue(
            encoder.encode(
              `\n\n[Error: ${error instanceof Error ? error.message : 'Internal server error'}]`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Request-ID': requestId,
      },
    })
  } catch (error) {
    console.error(`[${requestId}] Mobile chat error:`, error)
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        requestId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}