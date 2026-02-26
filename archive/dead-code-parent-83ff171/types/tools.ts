/**
 * Tool Type Definitions
 * Type-safe tool execution types
 */

/**
 * Supported tool names
 */
export type ToolName =
  | 'read_file'
  | 'write_file'
  | 'list_files'
  | 'delete_file'
  | 'move_file'
  | 'run_command'
  | 'search_code'
  | 'create_branch'
  | 'create_pull_request'
  | 'get_diff'
  | 'get_commit_history'
  | 'web_search'
  | 'web_browse'
  | 'browser_automation'
  | 'deploy'
  | 'transcribe_audio'
  | 'github_pr_manage'
  | 'nx_affected'

/**
 * Tool call arguments structure
 */
export interface ToolCallArguments {
  path?: string
  content?: string
  command?: string
  query?: string
  pattern?: string
  old_path?: string
  new_path?: string
  branch?: string
  from_branch?: string
  title?: string
  body?: string
  base?: string
  head?: string
  cwd?: string
  url?: string
  max_results?: number
  action?: string
  selector?: string
  text?: string
  screenshot?: boolean
  wait_for?: string
  platform?: string
  audio_file?: string
  pr_number?: number
  state?: string
  projects?: string[]
  [key: string]: unknown // Allow additional tool-specific arguments
}

/**
 * Tool call structure
 */
export interface ToolCall {
  name: ToolName
  arguments: ToolCallArguments
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean
  output: string
  error?: string
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  repository?: {
    owner: string
    repo: string
    branch?: string
  }
  githubToken?: string
  baseUrl?: string
}

/**
 * Type guard: Check if value is a valid tool name
 */
export function isToolName(value: string): value is ToolName {
  const validToolNames: ToolName[] = [
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
    'browser_automation',
    'deploy',
    'transcribe_audio',
    'github_pr_manage',
    'nx_affected',
  ]
  return validToolNames.includes(value as ToolName)
}

/**
 * Type guard: Check if value is a valid tool call
 */
export function isToolCall(value: unknown): value is ToolCall {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as ToolCall).name === 'string' &&
    isToolName((value as ToolCall).name) &&
    'arguments' in value &&
    typeof (value as ToolCall).arguments === 'object' &&
    (value as ToolCall).arguments !== null
  )
}

/**
 * Type guard: Check if value is a valid tool execution result
 */
export function isToolExecutionResult(value: unknown): value is ToolExecutionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ToolExecutionResult).success === 'boolean' &&
    'output' in value &&
    typeof (value as ToolExecutionResult).output === 'string'
  )
}

/**
 * Validate tool call arguments for a specific tool
 */
export function validateToolCallArguments(
  toolName: ToolName,
  args: ToolCallArguments
): { valid: boolean; error?: string } {
  switch (toolName) {
    case 'read_file':
    case 'delete_file':
      if (!args.path || typeof args.path !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'path' argument` }
      }
      break

    case 'write_file':
      if (!args.path || typeof args.path !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'path' argument` }
      }
      if (args.content === undefined) {
        return { valid: false, error: `Tool '${toolName}' requires a 'content' argument` }
      }
      break

    case 'run_command':
      if (!args.command || typeof args.command !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'command' argument` }
      }
      break

    case 'search_code':
      if (!args.query && !args.pattern) {
        return { valid: false, error: `Tool '${toolName}' requires either 'query' or 'pattern' argument` }
      }
      break

    case 'move_file':
      if (!args.old_path || typeof args.old_path !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires an 'old_path' argument` }
      }
      if (!args.new_path || typeof args.new_path !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'new_path' argument` }
      }
      break

    case 'create_branch':
      if (!args.branch || typeof args.branch !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'branch' argument` }
      }
      break

    case 'create_pull_request':
      if (!args.title || typeof args.title !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'title' argument` }
      }
      if (!args.head || typeof args.head !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'head' argument` }
      }
      break

    case 'list_files':
    case 'get_diff':
    case 'get_commit_history':
      // These tools have optional arguments
      break

    case 'web_search':
      if (!args.query || typeof args.query !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'query' argument` }
      }
      break

    case 'web_browse':
      if (!args.url || typeof args.url !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'url' argument` }
      }
      // Validate URL format
      try {
        new URL(args.url)
      } catch {
        return { valid: false, error: `Tool '${toolName}' requires a valid URL` }
      }
      break

    case 'browser_automation':
      if (!args.url || typeof args.url !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'url' argument` }
      }
      // Validate URL format
      try {
        new URL(args.url)
      } catch {
        return { valid: false, error: `Tool '${toolName}' requires a valid URL` }
      }
      break

    case 'deploy':
      if (!args.platform || typeof args.platform !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires a 'platform' argument (vercel/netlify)` }
      }
      break

    case 'transcribe_audio':
      if (!args.audio_file || typeof args.audio_file !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires an 'audio_file' argument` }
      }
      break

    case 'github_pr_manage':
      if (!args.action || typeof args.action !== 'string') {
        return { valid: false, error: `Tool '${toolName}' requires an 'action' argument (create/list/review/merge)` }
      }
      break

    case 'nx_affected':
      // Optional arguments - can run without any
      break

    default:
      return { valid: false, error: `Unknown tool: ${toolName}` }
  }

  return { valid: true }
}
