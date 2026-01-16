import { NextResponse } from 'next/server'
import { authOptions } from '../[...nextauth]/route'

export async function GET() {
  const config = {
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasGitHubId: !!process.env.GITHUB_ID,
    hasGitHubSecret: !!process.env.GITHUB_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    nextAuthUrlLength: process.env.NEXTAUTH_URL?.length || 0,
    nextAuthUrlHasNewline: process.env.NEXTAUTH_URL?.includes('\n') || false,
    nodeEnv: process.env.NODE_ENV,
    authOptionsTrustHost: authOptions.trustHost,
    providerCount: authOptions.providers?.length || 0,
    firstProviderType: authOptions.providers?.[0]?.id || 'none',
  }

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
