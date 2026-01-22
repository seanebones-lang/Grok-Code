/**
 * Web Search API Route
 * Provides web search functionality using DuckDuckGo (free, no API key)
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

interface SearchResult {
  title: string
  url: string
  snippet?: string
}

/**
 * POST /api/agent/web-search
 * Search the web using DuckDuckGo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, max_results = 5 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    // Use DuckDuckGo HTML search (free, no API key)
    // For production, consider using a proper search API (Google Custom Search, Bing, etc.)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrokCode/1.0; +https://github.com/seanebones-lang/Grok-Code)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`)
    }

    const html = await response.text()
    const results: SearchResult[] = []

    // Parse DuckDuckGo HTML results
    // DuckDuckGo uses specific class names for results
    const resultRegex = /<div[^>]+class="result[^"]*"[^>]*>[\s\S]*?<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>)?/g
    
    let match
    let count = 0
    
    while ((match = resultRegex.exec(html)) !== null && count < max_results) {
      const url = match[1]
      const title = match[2].trim().replace(/\s+/g, ' ')
      const snippet = match[3]?.trim().replace(/\s+/g, ' ') || ''
      
      // Skip if URL is invalid or is a DuckDuckGo internal link
      if (url && !url.startsWith('/') && !url.startsWith('#')) {
        results.push({
          title,
          url,
          snippet,
        })
        count++
      }
    }

    // Format results for output
    const formattedResults = results.length > 0
      ? results
          .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}${r.snippet ? `\n   ${r.snippet}` : ''}`)
          .join('\n\n')
      : 'No search results found'

    return NextResponse.json({
      success: true,
      results: formattedResults,
      count: results.length,
    })
  } catch (error) {
    console.error('Web search error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Web search failed',
        success: false,
      },
      { status: 500 }
    )
  }
}
