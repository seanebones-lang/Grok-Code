/**
 * Web Browse API Route
 * Fetches and extracts readable content from web pages
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Extract readable text from HTML
 */
function extractText(html: string, maxLength = 10000): string {
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  
  // Extract text from common content tags
  const contentRegex = /<(?:h[1-6]|p|div|article|section|main|header|footer|li|td|th|span)[^>]*>([\s\S]*?)<\/[^>]+>/gi
  const contentMatches: string[] = []
  let match
  
  while ((match = contentRegex.exec(text)) !== null) {
    const innerText = match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (innerText.length > 20) {
      // Only include substantial text blocks
      contentMatches.push(innerText)
    }
  }
  
  // If we found structured content, use it
  if (contentMatches.length > 0) {
    text = contentMatches.join('\n\n')
  } else {
    // Fallback: remove all HTML tags
    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  
  // Limit length
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '... (content truncated)'
  }
  
  return text
}

/**
 * POST /api/agent/web-browse
 * Fetch and extract content from a web page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Security: Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      )
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrokCode/1.0; +https://github.com/seanebones-lang/Grok-Code)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // Timeout after 20 seconds
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          success: false,
        },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      const json = await response.json()
      return NextResponse.json({
        success: true,
        content: JSON.stringify(json, null, 2).slice(0, 10000),
        type: 'json',
      })
    } else if (contentType.includes('text/plain') || contentType.includes('text/csv')) {
      const text = await response.text()
      return NextResponse.json({
        success: true,
        content: text.slice(0, 10000),
        type: 'text',
      })
    } else if (contentType.includes('text/html')) {
      const html = await response.text()
      const extractedText = extractText(html, 10000)
      
      // Try to extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : null
      
      return NextResponse.json({
        success: true,
        content: title ? `Title: ${title}\n\n${extractedText}` : extractedText,
        type: 'html',
        title: title || undefined,
      })
    } else {
      // For other content types, try to get as text
      const text = await response.text()
      return NextResponse.json({
        success: true,
        content: text.slice(0, 10000),
        type: 'other',
        contentType,
      })
    }
  } catch (error) {
    console.error('Web browse error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Request timeout - the URL took too long to respond',
          success: false,
        },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Web browse failed',
        success: false,
      },
      { status: 500 }
    )
  }
}
