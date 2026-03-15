/**
 * MCP Bridge
 * Optional delegation layer for MCP-backed tools when running in Cursor/IDE context.
 * Server-side pipeline uses tool-executor; when MCP is available (e.g. Cursor agent),
 * tools can be delegated here and results merged.
 */

import type { ToolExecutionResult } from '@/types/tools'

/** Tool names that are implemented in the server-side executor (tool-executor.ts) */
export const IMPLEMENTED_TOOL_NAMES = [
  'read_file',
  'write_file',
  'list_files',
  'delete_file',
  'move_file',
  'run_command',
  'search_code',
  'create_branch',
  'create_pull_request',
  'get_diff',
  'get_commit_history',
  'web_search',
  'web_browse',
  'think',
  'complete',
] as const

export type ImplementedToolName = (typeof IMPLEMENTED_TOOL_NAMES)[number]

/**
 * Try to execute a tool via MCP (e.g. Cursor MCP server).
 * Returns null if the tool is not MCP-backed or MCP is not available in this runtime.
 * Used by callers to optionally delegate before falling back to tool-executor.
 */
export async function tryMcpTool(
  _name: string,
  _args: Record<string, unknown>
): Promise<ToolExecutionResult | null> {
  // Server-side / Vercel runtime has no Cursor MCP connection; MCP tools run in IDE.
  // When running inside Cursor, the agent can use MCP tools directly; this bridge
  // allows future wiring (e.g. env MCP_ENABLED + child process or HTTP to MCP server).
  return null
}

/**
 * Check if a tool name is implemented (server-side or MCP).
 */
export function isImplementedTool(name: string): name is ImplementedToolName {
  return IMPLEMENTED_TOOL_NAMES.includes(name as ImplementedToolName)
}
