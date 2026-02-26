import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Private coding space - no auth gating, allow all routes
  return NextResponse.next();
}

export const config = { matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)' };