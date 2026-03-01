const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = process.env.GROK_API_KEY;

export class GrokAPI {
  static async chat(prompt: string, options: { stream?: boolean } = {}) {
    if (!GROK_API_KEY) {
      return options.stream ? new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Mock Grok: Hello from Grok-Code! Your prompt: ' + prompt));
          controller.close();
        }
      }) : { data: 'Mock Grok response: ' + prompt };
    }

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        stream: options.stream,
      }),
    });

    if (!response.ok) throw new Error(`Grok API error: ${response.status}`);
    return options.stream ? response.body! : response.json();
  }
}
