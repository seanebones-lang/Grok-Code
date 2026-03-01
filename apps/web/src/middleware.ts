import { NextResponse } from 'next/server';
import { tracer } from '@/lib/telemetry';

export function middleware(req) {
  const span = tracer.startSpan('middleware');
  // ... existing auth
  span.end();
  return NextResponse.next();
}
