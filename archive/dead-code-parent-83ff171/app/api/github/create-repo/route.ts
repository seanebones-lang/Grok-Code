import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import { z } from 'zod'

/**
 * GitHub Repository Creation API
 * Creates a new GitHub repository with optional initialization
 */

const createRepoSchema = z.object({
  name: z.string()
    .min(1, 'Repository name cannot be empty')
    .max(100, 'Repository name too long (max 100 characters)')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Repository name must contain only alphanumeric characters, dots, hyphens, and underscores')
    .refine(name => !name.startsWith('.') && !name.endsWith('.'), 'Repository name cannot start or end with a period')
    .refine(name => !name.startsWith('-') && !name.endsWith('-'), 'Repository name cannot start or end with a hyphen')
    .refine(name => !name.startsWith('_') && !name.endsWith('_'), 'Repository name cannot start or end with an underscore')
    .refine(name => name.toLowerCase() !== 'git', 'Repository name cannot be "git"')
    .refine(name => !name.includes('..'), 'Repository name cannot contain consecutive periods'),
  description: z.string().optional(),
  private: z.boolean().default(false),
  autoInit: z.boolean().default(true),
  licenseTemplate: z.string().optional(),
  gitignoreTemplate: z.string().optional(),
  readme: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = performance.now()
  
  try {
    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', requestId },
        { status: 400 }
      )
    }
    
    // Validate input
    const parseResult = createRepoSchema.safeParse(body)
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
    
    const { name, description, private: isPrivate, autoInit, licenseTemplate, gitignoreTemplate, readme } = parseResult.data

    // Validate GitHub token
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      console.error(`[${requestId}] GITHUB_TOKEN not configured`)
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }

    const octokit = new Octokit({
      auth: githubToken,
      userAgent: 'NextEleven-Code/1.0',
      timeoutMs: 30000,
    })

    console.log(`[${requestId}] Creating repository: ${name}`)

    // Create repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name,
      description: description || undefined,
      private: isPrivate,
      auto_init: autoInit,
      license_template: licenseTemplate || undefined,
      gitignore_template: gitignoreTemplate || undefined,
    })

    const duration = performance.now() - startTime
    console.log(`[${requestId}] Repository created in ${duration.toFixed(0)}ms: ${repo.full_name}`)

    return NextResponse.json({
      success: true,
      repository: {
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        private: repo.private,
        createdAt: repo.created_at,
      },
      requestId,
    })
  } catch (error: any) {
    const duration = performance.now() - startTime
    
    // Handle specific GitHub API errors
    if (error.status === 422) {
      const message = error.message || 'Repository creation failed'
      if (message.includes('name already exists')) {
        return NextResponse.json(
          { error: 'Repository name already exists', requestId },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: message, requestId },
        { status: 422 }
      )
    }
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'GitHub authentication failed - check GITHUB_TOKEN permissions', requestId },
        { status: 401 }
      )
    }

    console.error(`[${requestId}] Repository creation failed after ${duration.toFixed(0)}ms:`, error)
    return NextResponse.json(
      { 
        error: error.message || 'Repository creation failed', 
        requestId,
        details: error.response?.data || undefined,
      },
      { status: error.status || 500 }
    )
  }
}
