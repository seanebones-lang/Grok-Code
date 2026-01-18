import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executeFullStackWorkflow } from '@/lib/full-stack-orchestrator'

/**
 * Full Stack Workflow Orchestrator API
 * End-to-end workflow: description → repo → code → commit → push → deploy
 */

const workflowSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  repositoryName: z.string().optional(),
  branch: z.string().default('main'),
  deploymentTarget: z.enum(['vercel', 'railway', 'aws', 'none']).default('vercel'),
  autoDeploy: z.boolean().default(true),
  generateInitialFiles: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    const body = await request.json()
    const parseResult = workflowSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.issues,
          requestId,
        },
        { status: 400 }
      )
    }

    const options = parseResult.data

    console.log(`[${requestId}] Starting full-stack workflow: ${options.description.slice(0, 50)}...`)

    // Execute workflow
    const result = await executeFullStackWorkflow(options)

    const duration = Date.now() - startTime
    console.log(`[${requestId}] Workflow completed in ${duration}ms: ${result.success ? 'SUCCESS' : 'FAILED'}`)

    return NextResponse.json({
      success: result.success,
      result,
      duration,
      requestId,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] Workflow failed after ${duration}ms:`, error)

    return NextResponse.json(
      {
        error: error.message || 'Workflow execution failed',
        requestId,
      },
      { status: error.status || 500 }
    )
  }
}
