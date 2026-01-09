import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Octokit } from '@octokit/rest'

// Strict input validation with security constraints
const filePathSchema = z
  .string()
  .min(1, 'File path cannot be empty')
  .max(500, 'File path too long')
  .refine(
    path => !path.includes('..') && !path.startsWith('/'),
    'Invalid file path: must be relative and cannot contain ..'
  )
  .refine(
    path => !/[<>:"|?*\x00-\x1f]/.test(path),
    'Invalid characters in file path'
  )

const repoNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid repository name')

const ownerSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'Invalid owner name')

const branchSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9._/-]+$/, 'Invalid branch name')
  .refine(
    branch => !branch.startsWith('-') && !branch.endsWith('.lock'),
    'Invalid branch name format'
  )

const pushSchema = z.object({
  repo: repoNameSchema,
  owner: ownerSchema,
  branch: branchSchema.default('main'),
  files: z
    .array(
      z.object({
        path: filePathSchema,
        content: z.string().max(10 * 1024 * 1024, 'File content too large (max 10MB)'),
        mode: z.enum(['100644', '100755', '040000', '160000', '120000']).default('100644'),
      })
    )
    .min(1, 'At least one file is required')
    .max(100, 'Too many files (max 100)'),
  message: z
    .string()
    .min(1, 'Commit message cannot be empty')
    .max(500, 'Commit message too long')
    .default('Update files via GrokCode'),
})

// GitHub API error types
interface GitHubError {
  status: number
  message: string
  documentation_url?: string
}

function isGitHubError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  )
}

function handleGitHubError(error: unknown, requestId: string): NextResponse {
  if (isGitHubError(error)) {
    const statusMap: Record<number, { status: number; message: string }> = {
      401: { status: 401, message: 'GitHub authentication failed' },
      403: { status: 403, message: 'Access denied to repository' },
      404: { status: 404, message: 'Repository or branch not found' },
      409: { status: 409, message: 'Conflict: branch may have been updated' },
      422: { status: 422, message: 'Invalid request to GitHub API' },
    }
    
    const mapped = statusMap[error.status] || { 
      status: 502, 
      message: 'GitHub API error' 
    }
    
    console.error(`[${requestId}] GitHub error ${error.status}:`, error.message)
    
    return NextResponse.json(
      { 
        error: mapped.message, 
        details: error.message,
        requestId,
      },
      { status: mapped.status }
    )
  }
  
  console.error(`[${requestId}] Unknown error:`, error)
  return NextResponse.json(
    { error: 'Failed to push to GitHub', requestId },
    { status: 500 }
  )
}

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
    const parseResult = pushSchema.safeParse(body)
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
    
    const { repo, owner, branch, files, message } = parseResult.data

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
      userAgent: 'GrokCode/1.0',
      timeoutMs: 30000,
    })

    console.log(`[${requestId}] Pushing ${files.length} files to ${owner}/${repo}:${branch}`)

    // Get the current commit SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    })

    const currentSha = refData.object.sha

    // Get the tree SHA
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: currentSha,
    })

    const baseTreeSha = commitData.tree.sha

    // Create blobs for all files with proper base64 encoding
    const tree = await Promise.all(
      files.map(async (file) => {
        // Ensure content is properly base64 encoded
        const base64Content = Buffer.from(file.content, 'utf-8').toString('base64')
        
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: base64Content,
          encoding: 'base64',
        })

        return {
          path: file.path,
          mode: file.mode as '100644' | '100755' | '040000' | '160000' | '120000',
          type: 'blob' as const,
          sha: blobData.sha,
        }
      })
    )

    // Create a new tree
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    })

    // Create a new commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: treeData.sha,
      parents: [currentSha],
    })

    // Update the branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
    })

    const duration = performance.now() - startTime
    console.log(`[${requestId}] Push completed in ${duration.toFixed(0)}ms: ${commit.sha}`)

    return NextResponse.json({
      success: true,
      commit: {
        sha: commit.sha,
        message: commit.message,
        url: commit.html_url,
      },
      requestId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues, requestId },
        { status: 400 }
      )
    }

    return handleGitHubError(error, requestId)
  }
}
