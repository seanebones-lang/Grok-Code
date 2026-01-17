import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Octokit } from '@octokit/rest'

/**
 * GitHub Tree API
 * Fetches repository file tree using GITHUB_TOKEN
 */

const treeSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Get GitHub token from header or env
    const githubToken = request.headers.get('X-Github-Token') || process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token required. Please configure it in the setup screen.', requestId },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsed = treeSchema.safeParse({
      owner: searchParams.get('owner'),
      repo: searchParams.get('repo'),
      branch: searchParams.get('branch'),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues, requestId },
        { status: 400 }
      )
    }

    const { owner, repo, branch } = parsed.data
    const octokit = new Octokit({ auth: githubToken })
    
    // Get the tree recursively
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: '1',
    })

    return NextResponse.json({
      success: true,
      tree: data.tree,
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Failed to fetch tree:`, error)
    
    if (error.status === 404) {
      return NextResponse.json(
        { 
          error: 'Repository or branch not found',
          details: error.message,
          requestId,
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch file tree',
        details: error.message || 'Unknown error',
        requestId,
      },
      { status: error.status || 500 }
    )
  }
}
