// Full fixed content here (pasted above, with imports/utils assumed). Note: Added streamToResponse util stub if missing.

import { NextRequest, NextResponse } from 'next/server';
import { GrokAPI } from '@/lib/ai/grok';
import { auth } from '@/lib/auth';

function streamToResponse(stream: ReadableStream): NextResponse {
  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();
    // Removed debug logs for production

    const stream = await GrokAPI.chat(prompt, { stream: true });
    return streamToResponse(stream);
  } catch (error) {
    console.error('Chat API error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}