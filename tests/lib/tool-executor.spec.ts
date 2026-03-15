import { describe, test, expect } from 'vitest';
import { executeTool } from '@/lib/tool-executor';

describe('executeTool', () => {
  test('think returns success with thought content', async () => {
    const result = await executeTool(
      { name: 'think', arguments: { thought: 'Planning next step' } },
      undefined,
      undefined
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain('Planning next step');
  });

  test('complete returns success with summary', async () => {
    const result = await executeTool(
      { name: 'complete', arguments: { summary: 'Done with task' } },
      undefined,
      undefined
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain('Done with task');
  });

  test('delete_file rejects directory-like path (guardrail)', async () => {
    const result = await executeTool(
      { name: 'delete_file', arguments: { path: '.' } },
      undefined,
      undefined
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('specific file path');
  });

  test('delete_file rejects empty path', async () => {
    const result = await executeTool(
      { name: 'delete_file', arguments: { path: '' } },
      undefined,
      undefined
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
