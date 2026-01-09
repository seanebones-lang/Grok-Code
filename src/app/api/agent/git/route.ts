import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { Octokit } from '@octokit/rest'

/**
 * Git Operations API for Agentic Operations
 * Allows Eleven to perform Git operations like creating branches, PRs, getting diffs, etc.
 */

// ============================================================================
// Schemas
// ============================================================================

const createBranchSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  fromBranch: z.string().optional(),
})

const createPRSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  head: z.string().min(1),
  base: z.string().min(1),
})

const getDiffSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  base: z.string().optional(),
  head: z.string().optional(),
  path: z.string().optional(),
})

const getCommitHistorySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().optional(),
  path: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

async function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

async function getDefaultBranch(octokit: Octokit, owner: string, repo: string): Promise<string> {
  const { data } = await octokit.repos.get({ owner, repo })
  return data.default_branch
}

// ============================================================================
// POST - Create branch
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      )
    }
    
    const accessToken = (session as { accessToken?: string }).accessToken
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No GitHub access token', requestId },
        { status: 401 }
      )
    }

    const body = await request.json()
    const action = body.action || 'create_branch'

    if (action === 'create_branch') {
      const parsed = createBranchSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, branch, fromBranch } = parsed.data
      const octokit = await getOctokit(accessToken)
      const sourceBranch = fromBranch || await getDefaultBranch(octokit, owner, repo)

      // Get the SHA of the source branch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${sourceBranch}`,
      })
      const sha = refData.object.sha

      // Create new branch
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha,
      })

      return NextResponse.json({
        success: true,
        branch: {
          name: branch,
          sha,
          url: `https://github.com/${owner}/${repo}/tree/${branch}`,
        },
        requestId,
      })
    } else if (action === 'create_pr') {
      const parsed = createPRSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, title, body, head, base } = parsed.data
      const octokit = await getOctokit(accessToken)

      const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title,
        body: body || '',
        head,
        base,
      })

      return NextResponse.json({
        success: true,
        pullRequest: {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          state: pr.state,
        },
        requestId,
      })
    } else {
      return NextResponse.json(
        { error: 'Unknown action', requestId },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error(`[${requestId}] Git operation error:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to perform git operation',
        details: error.message || 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Get diff or commit history
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      )
    }
    
    const accessToken = (session as { accessToken?: string }).accessToken
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No GitHub access token', requestId },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'get_diff'

    const octokit = await getOctokit(accessToken)

    if (action === 'get_diff') {
      const parsed = getDiffSchema.safeParse({
        owner: searchParams.get('owner'),
        repo: searchParams.get('repo'),
        base: searchParams.get('base') || undefined,
        head: searchParams.get('head') || undefined,
        path: searchParams.get('path') || undefined,
      })

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, base, head, path } = parsed.data
      const defaultBranch = await getDefaultBranch(octokit, owner, repo)
      const baseRef = base || defaultBranch
      const headRef = head || defaultBranch

      // Get comparison
      const { data: comparison } = await octokit.repos.compareCommits({
        owner,
        repo,
        base: baseRef,
        head: headRef,
      })

      // Filter by path if specified
      let files = comparison.files || []
      if (path) {
        files = files.filter(f => f.filename.includes(path))
      }

      return NextResponse.json({
        success: true,
        diff: {
          ahead: comparison.ahead_by,
          behind: comparison.behind_by,
          files: files.map(f => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch,
          })),
        },
        requestId,
      })
    } else if (action === 'get_commit_history') {
      const parsed = getCommitHistorySchema.safeParse({
        owner: searchParams.get('owner'),
        repo: searchParams.get('repo'),
        branch: searchParams.get('branch') || undefined,
        path: searchParams.get('path') || undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      })

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: parsed.error.issues, requestId },
          { status: 400 }
        )
      }

      const { owner, repo, branch, path, limit = 10 } = parsed.data
      const ref = branch || await getDefaultBranch(octokit, owner, repo)

      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo,
        sha: ref,
        path,
        per_page: limit,
      })

      return NextResponse.json({
        success: true,
        commits: commits.map(c => ({
          sha: c.sha,
          message: c.commit.message,
          author: {
            name: c.commit.author?.name,
            email: c.commit.author?.email,
            date: c.commit.author?.date,
          },
          url: c.html_url,
        })),
        requestId,
      })
    } else {
      return NextResponse.json(
        { error: 'Unknown action', requestId },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error(`[${requestId}] Git GET error:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to get git information',
        details: error.message || 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}
