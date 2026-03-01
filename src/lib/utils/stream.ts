import { NextResponse } from 'next/server';

export function streamToResponse(stream: ReadableStream): NextResponse {
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
