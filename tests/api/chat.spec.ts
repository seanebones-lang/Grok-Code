import { test, expect } from 'vitest';
import { POST } from '@/app/api/chat/route';

test('POST /api/chat returns 401 when no Grok key', async () => {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test' }),
  });
  const res = await POST(req as any);
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.error).toContain('Grok API key');
});

test('POST /api/chat returns 400 when message missing', async () => {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'X-Grok-Token': 'dummy-key' },
    body: JSON.stringify({}),
  });
  const res = await POST(req as any);
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.error).toBeDefined();
});

test('POST /api/chat accepts canonical payload and rejects when no key', async () => {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Hello',
      history: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hi there!' }],
      mode: 'default',
    }),
  });
  const res = await POST(req as any);
  expect(res.status).toBe(401);
});

test('POST /api/chat accepts legacy prompt field', async () => {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test' }),
  });
  const res = await POST(req as any);
  expect(res.status).toBeLessThan(500);
});
