/**
 * MCP Bridge
 * Delegation layer for MCP-backed tools when running in Cursor/IDE context.
 * Server-side pipeline uses tool-executor; when MCP is available (e.g. Cursor agent),
 * tools can be delegated here and results merged.
 *
 * Supports three transport modes:
 * 1. HTTP: Connect to an MCP server via HTTP endpoint (MCP_SERVER_URL env)
 * 2. stdio: Spawn an MCP server process and communicate via stdin/stdout (MCP_SERVER_CMD env)
 * 3. Disabled: Falls back to tool-executor (default when no env vars set)
 */

import { spawn, type ChildProcess } from 'child_process'
import type { ToolExecutionResult } from '@/types/tools'

/** Tool names that are implemented in the server-side executor (tool-executor.ts) */
export const IMPLEMENTED_TOOL_NAMES = [
  'read_file',
  'write_file',
  'list_files',
  'delete_file',
  'move_file',
  'patch_file',
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

// ============================================================================
// MCP Transport Layer
// ============================================================================

interface McpRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params: {
    name: string
    arguments: Record<string, unknown>
  }
}

interface McpResponse {
  jsonrpc: '2.0'
  id: number
  result?: { content: Array<{ type: string; text: string }> }
  error?: { code: number; message: string }
}

let mcpRequestId = 0
let stdiProcess: ChildProcess | null = null
let stdioPending = new Map<number, {
  resolve: (value: McpResponse) => void
  timer: ReturnType<typeof setTimeout>
}>()

/**
 * Send a tool call to an MCP server via HTTP transport
 */
async function mcpHttpCall(
  serverUrl: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult | null> {
  const id = ++mcpRequestId
  const request: McpRequest = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args },
  }

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) return null

    const data = (await response.json()) as McpResponse
    if (data.error) {
      return { success: false, output: '', error: data.error.message }
    }
    if (data.result?.content) {
      const text = data.result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n')
      return { success: true, output: text }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Send a tool call to an MCP server via stdio transport
 */
async function mcpStdioCall(
  command: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult | null> {
  // Spawn process if not running
  if (!stdiProcess || stdiProcess.killed) {
    const parts = command.split(/\s+/)
    stdiProcess = spawn(parts[0], parts.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })

    let buffer = ''
    stdiProcess.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      // Process complete JSON-RPC messages (newline-delimited)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const response = JSON.parse(line) as McpResponse
          const pending = stdioPending.get(response.id)
          if (pending) {
            clearTimeout(pending.timer)
            stdioPending.delete(response.id)
            pending.resolve(response)
          }
        } catch {
          // not valid JSON, ignore
        }
      }
    })

    stdiProcess.on('exit', () => {
      // Reject all pending requests
      for (const [id, pending] of stdioPending) {
        clearTimeout(pending.timer)
        pending.resolve({ jsonrpc: '2.0', id, error: { code: -1, message: 'MCP process exited' } })
      }
      stdioPending.clear()
      stdiProcess = null
    })
  }

  const id = ++mcpRequestId
  const request: McpRequest = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args },
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      stdioPending.delete(id)
      resolve(null) // Timeout, fall back to local
    }, 30_000)

    stdioPending.set(id, {
      resolve: (response: McpResponse) => {
        if (response.error) {
          resolve({ success: false, output: '', error: response.error.message })
        } else if (response.result?.content) {
          const text = response.result.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('\n')
          resolve({ success: true, output: text })
        } else {
          resolve(null)
        }
      },
      timer,
    })

    try {
      stdiProcess?.stdin?.write(JSON.stringify(request) + '\n')
    } catch {
      clearTimeout(timer)
      stdioPending.delete(id)
      resolve(null)
    }
  })
}

/**
 * Try to execute a tool via MCP (Cursor MCP server, HTTP, or stdio).
 * Returns null if MCP is not available or the tool is not MCP-backed,
 * allowing the caller to fall back to tool-executor.
 *
 * Configure via environment variables:
 * - MCP_SERVER_URL: HTTP endpoint for MCP server (e.g., http://localhost:8080/mcp)
 * - MCP_SERVER_CMD: Command to spawn stdio MCP server (e.g., "npx @mcp/server")
 * - MCP_ENABLED: Set to "true" to enable MCP delegation
 */
export async function tryMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult | null> {
  // Check if MCP is enabled
  if (process.env.MCP_ENABLED !== 'true') return null

  // HTTP transport
  const httpUrl = process.env.MCP_SERVER_URL
  if (httpUrl) {
    return mcpHttpCall(httpUrl, name, args)
  }

  // stdio transport
  const stdioCmd = process.env.MCP_SERVER_CMD
  if (stdioCmd) {
    return mcpStdioCall(stdioCmd, name, args)
  }

  return null
}

/**
 * Check if a tool name is implemented (server-side or MCP).
 */
export function isImplementedTool(name: string): name is ImplementedToolName {
  return IMPLEMENTED_TOOL_NAMES.includes(name as ImplementedToolName)
}

/**
 * Gracefully shutdown MCP stdio process if running
 */
export function shutdownMcp(): void {
  if (stdiProcess && !stdiProcess.killed) {
    stdiProcess.kill('SIGTERM')
    stdiProcess = null
  }
  stdioPending.clear()
}
