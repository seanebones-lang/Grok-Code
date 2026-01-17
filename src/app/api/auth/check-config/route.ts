import { NextResponse } from 'next/server'
import { authOptions } from '../[...nextauth]/route'

// Helper to normalize URLs (same as in route.ts)
function normalizeBaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.trim().replace(/\/+$/, '').replace(/\n/g, '').replace(/\r/g, '')
}

export async function GET() {
  const rawNextAuthUrl = process.env.NEXTAUTH_URL
  const normalizedNextAuthUrl = normalizeBaseUrl(rawNextAuthUrl)
  const authOptionsBaseUrl = (authOptions as any).baseUrl as string | undefined
  
  const config = {
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasGitHubId: !!process.env.GITHUB_ID,
    hasGitHubSecret: !!process.env.GITHUB_SECRET,
    nextAuthUrl: normalizedNextAuthUrl || 'NOT SET',
    nextAuthUrlRaw: rawNextAuthUrl || 'NOT SET',
    nextAuthUrlLength: normalizedNextAuthUrl?.length || 0,
    nextAuthUrlHasNewline: rawNextAuthUrl?.includes('\n') || rawNextAuthUrl?.includes('\r') || false,
    nodeEnv: process.env.NODE_ENV,
    authOptionsTrustHost: authOptions.trustHost,
    // CRITICAL: Check if baseUrl is set in authOptions (prevents 404 errors)
    authOptionsBaseUrl: authOptionsBaseUrl || 'NOT SET (this may cause 404 errors)',
    baseUrlMatches: normalizedNextAuthUrl === normalizeBaseUrl(authOptionsBaseUrl),
    providerCount: authOptions.providers?.length || 0,
    firstProviderType: authOptions.providers?.[0]?.id || 'none',
    // Calculate expected callback URL using normalized URL
    expectedCallbackUrl: normalizedNextAuthUrl 
      ? `${normalizedNextAuthUrl}/api/auth/callback/github`
      : 'NOT SET - NEXTAUTH_URL missing',
    // Health check summary
    healthCheck: {
      allEnvVarsSet: !!(process.env.NEXTAUTH_SECRET && process.env.GITHUB_ID && process.env.GITHUB_SECRET && normalizedNextAuthUrl),
      baseUrlConfigured: !!authOptionsBaseUrl,
      baseUrlNormalized: !!normalizedNextAuthUrl && normalizedNextAuthUrl === normalizeBaseUrl(authOptionsBaseUrl),
      trustHostEnabled: authOptions.trustHost === true,
      readyForOAuth: !!(process.env.NEXTAUTH_SECRET && process.env.GITHUB_ID && process.env.GITHUB_SECRET && normalizedNextAuthUrl && authOptionsBaseUrl && authOptions.trustHost),
    },
  }

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
