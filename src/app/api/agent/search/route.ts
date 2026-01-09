import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { Octokit } from '@octokit/rest'

/**
 * Code Search API for Agentic Operations
 * Uses GitHub Code Search API for powerful semantic code search
 */

// ============================================================================
// Schemas
// ============================================================================

const codeSearchSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  query: z.string().min(1),
  language: z.string().optional(),
  path: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

async function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

// ============================================================================
// GET - Search code
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
    const parsed = codeSearchSchema.safeParse({
      owner: searchParams.get('owner'),
      repo: searchParams.get('repo'),
      query: searchParams.get('query'),
      language: searchParams.get('language') || undefined,
      path: searchParams.get('path') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues, requestId },
        { status: 400 }
      )
    }

    const { owner, repo, query, language, path, limit = 10 } = parsed.data
    const octokit = await getOctokit(accessToken)

    // Build search query
    let searchQuery = `${query} repo:${owner}/${repo}`
    if (language) {
      searchQuery += ` language:${language}`
    }
    if (path) {
      searchQuery += ` path:${path}`
    }

    // Search code
    const { data } = await octokit.search.code({
      q: searchQuery,
      per_page: limit,
    })

    return NextResponse.json({
      success: true,
      results: data.items.map(item => ({
        name: item.name,
        path: item.path,
        url: item.html_url,
        repository: {
          fullName: item.repository.full_name,
          url: item.repository.html_url,
        },
        score: item.score,
        textMatches: item.text_matches?.map(match => ({
          fragment: match.fragment,
          matches: match.matches?.map(m => ({
            text: m.text,
            indices: m.indices,
          })),
        })),
      })),
      totalCount: data.total_count,
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] Code search error:`, error)
    
    // GitHub search API might not be available for all repos
    if (error.status === 422 || error.message?.includes('validation')) {
      return NextResponse.json(
        { 
          error: 'Search not available for this repository',
          details: 'GitHub Code Search requires the repository to be indexed. This may take a few minutes for new repositories.',
          requestId,
        },
        { status: 422 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to search code',
        details: error.message || 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}
