import { NextRequest, NextResponse } from 'next/server';
import { GrokAPI } from '@/lib/ai/grok';
import { auth } from '@/lib/auth';
import { streamToResponse } from '@/lib/utils/stream';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json() as { prompt: string };
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const stream = await GrokAPI.chat(prompt, { stream: true });
    return streamToResponse(stream);
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
