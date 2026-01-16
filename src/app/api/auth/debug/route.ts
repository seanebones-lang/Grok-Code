import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const cookies = request.cookies.getAll()
  
  return NextResponse.json({
    url: url.toString(),
    pathname: url.pathname,
    searchParams: Object.fromEntries(url.searchParams),
    cookies: cookies.map(c => ({
      name: c.name,
      value: c.value ? '***' : 'empty',
      hasValue: !!c.value
    })),
    headers: {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      'user-agent': request.headers.get('user-agent'),
    },
    timestamp: new Date().toISOString(),
  })
}
