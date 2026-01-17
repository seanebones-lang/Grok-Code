import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

/**
 * GitHub Repos API
 * Fetches user's repositories using GITHUB_TOKEN
 */

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

    const octokit = new Octokit({ auth: githubToken })
    
    // Fetch user's repositories
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      type: 'all',
    })

    return NextResponse.json({
      success: true,
      repos: repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        private: repo.private,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
      })),
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Failed to fetch repos:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch repositories',
        details: error.message || 'Unknown error',
        requestId,
      },
      { status: error.status || 500 }
    )
  }
}
