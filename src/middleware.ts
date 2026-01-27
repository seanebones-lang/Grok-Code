import { NextResponse, NextRequest } from 'next/server';
import { checkRateLimit } from './lib/ratelimit';

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? '1.1.1.1';
  const { success } = await checkRateLimit(ip);
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };