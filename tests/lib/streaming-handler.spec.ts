import { describe, test, expect } from 'vitest';
import { extractToolCalls, executeToolCalls } from '@/lib/streaming-handler';

describe('extractToolCalls', () => {
  test('extracts tool call from json code block', () => {
    const text = `Some text
\`\`\`json
{"name": "read_file", "arguments": {"path": "src/index.ts"}}
\`\`\`
more text`;
    const calls = extractToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('read_file');
    expect(calls[0].arguments).toEqual({ path: 'src/index.ts' });
  });

  test('extracts multiple tool calls', () => {
    const text = `
\`\`\`json
{"name": "list_files", "arguments": {"path": "."}}
\`\`\`
\`\`\`json
{"name": "read_file", "arguments": {"path": "package.json"}}
\`\`\`
`;
    const calls = extractToolCalls(text);
    expect(calls).toHaveLength(2);
    expect(calls[0].name).toBe('list_files');
    expect(calls[1].name).toBe('read_file');
  });

  test('deduplicates identical tool calls', () => {
    const text = `
\`\`\`json
{"name": "read_file", "arguments": {"path": "a.ts"}}
\`\`\`
\`\`\`json
{"name": "read_file", "arguments": {"path": "a.ts"}}
\`\`\`
`;
    const calls = extractToolCalls(text);
    expect(calls).toHaveLength(1);
  });

  test('returns empty array when no valid tool calls', () => {
    expect(extractToolCalls('')).toEqual([]);
    expect(extractToolCalls('no json here')).toEqual([]);
    expect(extractToolCalls('\`\`\`json\n{"invalid": true}\n\`\`\`')).toEqual([]);
  });
});

describe('executeToolCalls', () => {
  test('returns empty string for empty array', async () => {
    const result = await executeToolCalls([], {
      requestId: 'test',
    });
    expect(result).toBe('');
  });

  test('executes think tool and returns formatted result', async () => {
    const result = await executeToolCalls(
      [{ name: 'think', arguments: { thought: 'Considering options...' } }],
      { requestId: 'test' }
    );
    expect(result).toContain('✅');
    expect(result).toContain('think');
    expect(result).toContain('Considering options');
  });
});
