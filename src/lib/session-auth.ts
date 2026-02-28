/**
 * Session auth - disabled for local single-user use.
 * API uses API keys / headers (GitHub token, Grok token) only.
 */

import { NextRequest, NextResponse } from 'next/server'

export function isPublicEndpoint(_pathname: string): boolean {
  return true
}

export function authenticateRequest(_request: NextRequest): NextResponse | null {
  return null
}

export async function getSessionUser() {
  return null
}

export async function getGitHubToken(): Promise<string | null> {
  return null
}
