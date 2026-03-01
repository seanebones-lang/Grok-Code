import { test, expect } from 'vitest';
import { POST } from '@/src/app/api/chat/route';

test('GrokAPI resolves', async () => {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test' }),
  });
  const res = await POST(req as any);
  expect(res.status).toBeLessThan(500);
});
