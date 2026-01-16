import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const headers = Object.fromEntries(request.headers.entries())
  
  return NextResponse.json({
    message: 'Test callback endpoint',
    url: url.toString(),
    pathname: url.pathname,
    searchParams: Object.fromEntries(url.searchParams),
    headers: {
      host: headers.host,
      referer: headers.referer,
      'user-agent': headers['user-agent'],
    },
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
