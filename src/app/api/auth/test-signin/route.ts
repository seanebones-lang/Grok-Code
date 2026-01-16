import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authOptions } from '../[...nextauth]/route'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://grok-code2.vercel.app'
  const githubProvider = authOptions.providers?.find(p => p.id === 'github')
  
  // Build what the OAuth URL should look like
  const callbackUrl = `${baseUrl}/api/auth/callback/github`
  
  return NextResponse.json({
    baseUrl,
    callbackUrl,
    hasGitHubProvider: !!githubProvider,
    githubProviderId: githubProvider?.id,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      GITHUB_ID: process.env.GITHUB_ID ? 'SET' : 'NOT SET',
      GITHUB_SECRET: process.env.GITHUB_SECRET ? 'SET' : 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    },
    expectedCallbackUrl: 'https://grok-code2.vercel.app/api/auth/callback/github',
    match: callbackUrl === 'https://grok-code2.vercel.app/api/auth/callback/github',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
