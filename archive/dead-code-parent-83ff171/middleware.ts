import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/' || pathname.startsWith('/dashboard') || pathname.match(/^\/_next|favicon.ico/)) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = { matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)' };