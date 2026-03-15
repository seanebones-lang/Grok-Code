import { NextRequest, NextResponse } from 'next/server';
import { extractToolCalls, executeToolCalls } from '@/lib/streaming-handler';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const REQUEST_TIMEOUT = 30000;
const MODEL_FALLBACK_ORDER = ['grok-4.1-fast', 'grok-4-1-fast', 'grok-4', 'grok-3'] as const;

type GrokModel = (typeof MODEL_FALLBACK_ORDER)[number];

interface ChatBody {
  message?: string;
  /** @deprecated Use message. Kept for backward compatibility. */
  prompt?: string;
  mode?: 'default' | 'refactor' | 'orchestrate' | 'debug' | 'review' | 'agent';
  history?: Array<{ role: string; content: string }>;
  memoryContext?: string;
  repository?: { owner: string; repo: string; branch?: string };
}

function getGrokApiKey(req: NextRequest): string | null {
  const header = req.headers.get('X-Grok-Token');
  if (header?.trim()) return header.trim();
  const env = process.env.GROK_API_KEY;
  if (env) return env;
  return null;
}

function buildMessages(body: ChatBody): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const { message, history, memoryContext, repository } = body;
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (memoryContext?.trim()) {
    messages.push({ role: 'system', content: `Memory context:\n${memoryContext.trim()}` });
  }
  if (repository) {
    const ctx = `Current repository: ${repository.owner}/${repository.repo}${repository.branch ? ` (branch: ${repository.branch})` : ''}.`;
    messages.push({ role: 'system', content: ctx });
  }

  const normalizedHistory = (history || []).slice(-20).map((m) => ({
    role: (m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : '',
  }));
  messages.push(...normalizedHistory);
  messages.push({ role: 'user', content: message.trim() });

  return messages;
}

function detectMode(message: string): 'agent' | 'refactor' | 'debug' | 'review' | null {
  const lower = message.trim().toLowerCase();
  if (lower.startsWith('/agent') || lower.startsWith('/execute')) return 'agent';
  if (lower.startsWith('/refactor')) return 'refactor';
  if (lower.startsWith('/debug')) return 'debug';
  if (lower.startsWith('/review')) return 'review';
  return null;
}

function emitSSE(controller: ReadableStreamDefaultController<Uint8Array>, obj: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
}

async function streamWithFallback(
  apiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  body: ChatBody
): Promise<Response> {
  let lastError = '';
  for (const model of MODEL_FALLBACK_ORDER) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const res = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok && res.body) return res;
      lastError = await res.text().catch(() => 'Unknown error');
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError || 'All models failed');
}

export async function POST(req: NextRequest) {
  try {
    const grokApiKey = getGrokApiKey(req);
    if (!grokApiKey) {
      return NextResponse.json(
        { error: 'Grok API key required. Set X-Grok-Token header or GROK_API_KEY env.' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const raw = body as ChatBody;
    const msg = [raw.message, raw.prompt].find((v) => typeof v === 'string')?.trim() ?? '';
    if (!msg) {
      return NextResponse.json({ error: 'Missing or empty message' }, { status: 400 });
    }

    const chatBody: ChatBody = {
      message: msg,
      mode: raw.mode,
      history: raw.history,
      memoryContext: raw.memoryContext,
      repository: raw.repository,
    };

    const messages = buildMessages(chatBody);
    const detectedMode = !chatBody.mode ? detectMode(msg) : null;

    const streamRes = await streamWithFallback(grokApiKey, messages, chatBody);
    const reader = streamRes.body!.getReader();
    const decoder = new TextDecoder();

    const requestId = crypto.randomUUID();
    const githubToken = req.headers.get('X-Github-Token')?.trim() || undefined;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (detectedMode) {
            emitSSE(controller, {
              detectedMode,
              message:
                detectedMode === 'agent'
                  ? "🤖 Agent mode activated - I'll build this for you!"
                  : `🎯 ${detectedMode.charAt(0).toUpperCase() + detectedMode.slice(1)} mode activated`,
            });
          }

          let buffer = '';
          let fullResponse = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed?.choices?.[0]?.delta?.content;
                if (typeof content === 'string' && content) {
                  fullResponse += content;
                  emitSSE(controller, { content });
                }
                if (parsed?.error?.message) {
                  emitSSE(controller, {
                    error: parsed.error.message,
                    code: parsed.error.type || 'API_ERROR',
                    retryable: true,
                  });
                }
              } catch {
                // skip invalid json
              }
            }
          }

          const toolCalls = extractToolCalls(fullResponse);
          if (toolCalls.length > 0) {
            emitSSE(controller, { content: '\n\n🔧 Executing tools...\n\n' });
            const toolResultsText = await executeToolCalls(toolCalls, {
              requestId,
              repository: chatBody.repository,
              githubToken,
              detectedMode: detectedMode ?? undefined,
              explicitMode: chatBody.mode,
            });
            emitSSE(controller, { content: `\n📊 Tool results:\n\n${toolResultsText}\n\n` });
            const followUpMessages = [
              ...messages,
              { role: 'assistant' as const, content: fullResponse },
              {
                role: 'user' as const,
                content: `The following tools were executed:\n\n${toolResultsText}\n\nAnalyze the results and continue with the next steps.`,
              },
            ];
            try {
              const followRes = await streamWithFallback(grokApiKey, followUpMessages, chatBody);
              const followReader = followRes.body!.getReader();
              const followDecoder = new TextDecoder();
              let followBuffer = '';
              while (true) {
                const { done, value } = await followReader.read();
                if (done) break;
                followBuffer += followDecoder.decode(value, { stream: true });
                const lines = followBuffer.split('\n');
                followBuffer = lines.pop() || '';
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data: ')) continue;
                  const data = trimmed.slice(6);
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed?.choices?.[0]?.delta?.content;
                    if (typeof content === 'string' && content) {
                      emitSSE(controller, { content });
                    }
                  } catch {
                    // skip
                  }
                }
              }
            } catch (followErr) {
              const msg = followErr instanceof Error ? followErr.message : String(followErr);
              emitSSE(controller, { content: `\n⚠️ Follow-up request failed: ${msg}\n\n` });
            }
          }

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          emitSSE(controller, { error: message, code: 'STREAM_ERROR', retryable: true });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
