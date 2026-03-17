/**
 * Agent Loop System
 * Enables Eleven to autonomously execute multi-step tasks with tool calling
 * 
 * This implements a ReAct-style agent loop:
 * 1. Reason about the current state
 * 2. Decide on an action (tool call)
 * 3. Execute the action
 * 4. Observe the result
 * 5. Repeat until task is complete
 */

// ============================================================================
// Types
// ============================================================================

export type ToolName =
  | 'read_file'
  | 'write_file'
  | 'list_files'
  | 'delete_file'
  | 'move_file'
  | 'patch_file'
  | 'run_command'
  | 'search_code'
  | 'create_branch'
  | 'create_pull_request'
  | 'get_diff'
  | 'get_commit_history'
  | 'web_search'
  | 'web_browse'
  | 'think'
  | 'complete'

export interface ToolCall {
  id: string
  name: ToolName
  arguments: Record<string, unknown>
}

export interface ToolResult {
  id: string
  name: ToolName
  success: boolean
  output: string
  error?: string
  duration?: number
}

export interface AgentStep {
  id: string
  type: 'thought' | 'action' | 'observation' | 'error' | 'complete'
  content: string
  toolCall?: ToolCall
  toolResult?: ToolResult
  timestamp: Date
}

export interface AgentTask {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  steps: AgentStep[]
  startTime?: Date
  endTime?: Date
  error?: string
  result?: string
}

export interface AgentConfig {
  maxIterations: number
  maxTokensPerStep: number
  autoFix: boolean
  verbose: boolean
  repository?: {
    owner: string
    repo: string
    branch?: string
  }
}

export interface AgentContext {
  task: AgentTask
  config: AgentConfig
  workingDirectory: string
  fileCache: Map<string, string>
  conversationHistory: Array<{ role: string; content: string }>
}

// ============================================================================
// Tool Definitions (for Eleven's system prompt)
// ============================================================================

export const TOOL_DEFINITIONS = `
## Available Tools

You have access to the following tools to complete tasks autonomously:

### 1. read_file
Read the contents of a file.
\`\`\`json
{
  "name": "read_file",
  "arguments": {
    "path": "string (required) - Path to the file"
  }
}
\`\`\`

### 2. write_file
Create or update a file with new content. **Automatically commits to GitHub** when a repository is connected.
\`\`\`json
{
  "name": "write_file",
  "arguments": {
    "path": "string (required) - Path to the file",
    "content": "string (required) - File content"
  }
}
\`\`\`
**Note**: Each write_file call creates a commit. To make multiple changes in one commit, write all files first, then the changes will be batched.

### 3. list_files
List files in a directory.
\`\`\`json
{
  "name": "list_files",
  "arguments": {
    "path": "string (optional) - Directory path, defaults to root"
  }
}
\`\`\`

### 4. delete_file
Delete a file from the repository. **Automatically commits to GitHub** when a repository is connected.
\`\`\`json
{
  "name": "delete_file",
  "arguments": {
    "path": "string (required) - Path to the file to delete"
  }
}
\`\`\`

### 5. create_repository
Create a new GitHub repository. **Enables full project spawning from descriptions**.
\`\`\`json
{
  "name": "create_repository",
  "arguments": {
    "name": "string (required) - Repository name (alphanumeric and hyphens only)",
    "description": "string (optional) - Repository description",
    "private": "boolean (optional) - Whether repository is private (default: false)"
  }
}
\`\`\`
Returns: Repository object with owner, name, fullName, url, defaultBranch.

### 6. run_command
Execute a terminal command. Supports piped commands, redirects, and shell expressions.
\`\`\`json
{
  "name": "run_command",
  "arguments": {
    "command": "string (required) - Command to execute (supports pipes, &&, ||)",
    "cwd": "string (optional) - Working directory",
    "timeout": "number (optional) - Timeout in ms (default: 30000, max: 300000)"
  }
}
\`\`\`
Allowed commands: npm, npx, yarn, node, git, tsc, eslint, prettier, jest, vitest, python, pip, cargo, go, make, docker, curl

**Python Libraries Available** (import directly in code_execution):
- Data: pandas, numpy, json, csv, PyMuPDF (fitz), Pillow, PyYAML
- Web: requests, httpx, aiohttp, BeautifulSoup, playwright, websockets
- APIs: openai, anthropic, boto3, stripe (requires env vars)
- Science: sympy, scipy, scikit-learn, torch, networkx
- Utility: asyncio, concurrent.futures, pathlib, logging, hashlib, secrets
- See full catalog: src/lib/agent-tools-catalog.ts

### 7. move_file
Move or rename a file. **Automatically commits to GitHub** when a repository is connected.
\`\`\`json
{
  "name": "move_file",
  "arguments": {
    "old_path": "string (required) - Current file path",
    "new_path": "string (required) - New file path"
  }
}
\`\`\`

### 8. patch_file
Apply surgical edits to a file without rewriting the entire content. More token-efficient than write_file for small changes.
\`\`\`json
{
  "name": "patch_file",
  "arguments": {
    "path": "string (required) - Path to the file to patch",
    "patches": "array (required) - Array of patch objects: [{ \"find\": \"old text\", \"replace\": \"new text\" }]"
  }
}
\`\`\`
Each patch replaces the first occurrence of \`find\` with \`replace\`. Patches are applied sequentially.

### 9. search_code
Advanced code search. Uses GitHub Code Search API for repos, or local ripgrep-style search.
\`\`\`json
{
  "name": "search_code",
  "arguments": {
    "query": "string (required) - Search query (supports regex patterns)",
    "language": "string (optional) - Filter by language (e.g., 'typescript', 'javascript')",
    "path": "string (optional) - Filter by path",
    "context_lines": "number (optional) - Lines of context around matches (default: 0)",
    "exclude": "string (optional) - Glob pattern to exclude (default: node_modules)"
  }
}
\`\`\`

### 10. create_branch
Create a new Git branch.
\`\`\`json
{
  "name": "create_branch",
  "arguments": {
    "branch": "string (required) - Branch name",
    "from_branch": "string (optional) - Source branch (defaults to main)"
  }
}
\`\`\`

### 11. create_pull_request
Create a pull request.
\`\`\`json
{
  "name": "create_pull_request",
  "arguments": {
    "title": "string (required) - PR title",
    "body": "string (optional) - PR description",
    "head": "string (required) - Source branch",
    "base": "string (required) - Target branch (usually 'main')"
  }
}
\`\`\`

### 12. get_diff
Get differences between commits or branches.
\`\`\`json
{
  "name": "get_diff",
  "arguments": {
    "base": "string (optional) - Base branch/commit (defaults to main)",
    "head": "string (optional) - Head branch/commit (defaults to current branch)",
    "path": "string (optional) - Filter by file path"
  }
}
\`\`\`

### 13. get_commit_history
Get commit history for a branch or specific file.
\`\`\`json
{
  "name": "get_commit_history",
  "arguments": {
    "branch": "string (optional) - Branch name (defaults to main)",
    "path": "string (optional) - File path to get history for",
    "limit": "number (optional) - Number of commits (default: 10, max: 100)"
  }
}
\`\`\`

### 14. web_search
Search the web for information using DuckDuckGo (free, no API key required).
\`\`\`json
{
  "name": "web_search",
  "arguments": {
    "query": "string (required) - Search query",
    "max_results": "number (optional) - Maximum number of results (default: 5)"
  }
}
\`\`\`
Returns: Formatted search results with titles, URLs, and snippets.

### 15. web_browse
Fetch and extract readable content from a web page.
\`\`\`json
{
  "name": "web_browse",
  "arguments": {
    "url": "string (required) - URL to browse (must be http:// or https://)"
  }
}
\`\`\`
Returns: Extracted text content from the web page (up to 10KB).

### 16. think
Record your reasoning process (doesn't execute anything).
\`\`\`json
{
  "name": "think",
  "arguments": {
    "thought": "string (required) - Your reasoning"
  }
}
\`\`\`

### 17. complete
Mark the task as complete.
\`\`\`json
{
  "name": "complete",
  "arguments": {
    "summary": "string (required) - Summary of what was accomplished",
    "files_changed": "array (optional) - List of files that were modified"
  }
}
\`\`\`

## Response Format

For each step, you can respond with one or more tool calls.

**Single tool call:**
1. **Thought**: Your reasoning about what to do next
2. **Action**: A tool call in JSON format

**Parallel tool calls** (for independent operations like reading multiple files):
1. **Thought**: Your reasoning about what to do next
2. **Actions**: Multiple tool calls in a JSON array format
\`\`\`json
[
  { "name": "read_file", "arguments": { "path": "file1.ts" } },
  { "name": "read_file", "arguments": { "path": "file2.ts" } }
]
\`\`\`

Example:
\`\`\`
**Thought**: I need to first read the package.json to understand the project structure.

**Action**:
\`\`\`json
{
  "name": "read_file",
  "arguments": {
    "path": "package.json"
  }
}
\`\`\`
\`\`\`

## Important Rules

1. **Parallel when possible**: You may call multiple tools in a single response when they are independent (e.g., reading multiple files). Use a JSON array of tool calls.
2. **Sequential when dependent**: If one tool's output feeds into another, wait for results before proceeding.
3. **Handle errors**: If a command fails, analyze the error and try to fix it. Transient failures will be retried automatically.
4. **Be thorough**: Read relevant files before making changes
5. **Use patch_file for small edits**: Prefer patch_file over write_file when making targeted changes to existing files.
6. **Test your work**: Run tests or build commands to verify changes
7. **Complete the task**: Always call 'complete' when finished
`

// ============================================================================
// Agent System Prompt
// ============================================================================

export function buildAgentSystemPrompt(config: AgentConfig): string {
  return `You are Eleven Agent, an autonomous AI coding assistant powered by NextEleven that can read, write, and execute code to complete tasks.

## Your Capabilities
- Read and analyze code files
- Write and modify code
- Execute terminal commands (npm, git, etc.)
- Search through codebases
- Fix errors automatically
- Iterate until tasks are complete

${TOOL_DEFINITIONS}

## Workflow

1. **Understand**: Read the task description carefully
2. **Plan**: Think about what steps are needed
3. **Execute**: Use tools to complete each step
4. **Verify**: Run tests or builds to check your work
5. **Fix**: If errors occur, analyze and fix them
6. **Complete**: Summarize what was done

## Configuration
- Max iterations: ${config.maxIterations}
- Auto-fix errors: ${config.autoFix ? 'Yes' : 'No'}
- Repository: ${config.repository ? `${config.repository.owner}/${config.repository.repo}` : 'Local'}

Remember: You are autonomous. Take initiative, make decisions, and complete the task without asking for confirmation on every step.`
}

// ============================================================================
// Tool Call Parser (supports single and parallel tool calls)
// ============================================================================

/**
 * Parse a single tool call from a parsed JSON object
 */
function toolCallFromParsed(parsed: Record<string, unknown>): ToolCall | null {
  if (parsed && typeof parsed.name === 'string' && parsed.arguments && typeof parsed.arguments === 'object') {
    return {
      id: crypto.randomUUID(),
      name: parsed.name as ToolName,
      arguments: parsed.arguments as Record<string, unknown>,
    }
  }
  return null
}

/**
 * Parse one or more tool calls from agent response text.
 * Supports:
 * - Single tool call: { "name": "...", "arguments": {...} }
 * - Parallel tool calls: [{ "name": "..." }, { "name": "..." }]
 */
export function parseToolCalls(response: string): ToolCall[] {
  const results: ToolCall[] = []

  // Try all JSON code blocks
  const codeBlocks = [...response.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)]
  for (const match of codeBlocks) {
    try {
      const parsed = JSON.parse(match[1].trim())
      // Array of tool calls (parallel)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const tc = toolCallFromParsed(item)
          if (tc) results.push(tc)
        }
        if (results.length > 0) return results
      }
      // Single tool call
      const tc = toolCallFromParsed(parsed)
      if (tc) results.push(tc)
      if (results.length > 0) return results
    } catch {
      // not valid JSON, try next block
    }
  }

  // Fallback: try to find raw JSON (single tool call)
  const rawJsonMatch = response.match(/\{[\s\S]*?"name"[\s\S]*?"arguments"[\s\S]*?\}/)
  if (rawJsonMatch) {
    try {
      const parsed = JSON.parse(rawJsonMatch[0])
      const tc = toolCallFromParsed(parsed)
      if (tc) results.push(tc)
    } catch {
      // ignore
    }
  }

  return results
}

/**
 * @deprecated Use parseToolCalls() instead for parallel support. Kept for backward compatibility.
 */
export function parseToolCall(response: string): ToolCall | null {
  const calls = parseToolCalls(response)
  return calls.length > 0 ? calls[0] : null
}

// ============================================================================
// Thought Parser
// ============================================================================

export function parseThought(response: string): string | null {
  const thoughtMatch = response.match(/\*\*Thought\*\*:?\s*([\s\S]*?)(?=\*\*Action\*\*|```json|$)/i)
  if (thoughtMatch) {
    return thoughtMatch[1].trim()
  }
  return null
}

// ============================================================================
// Step Creator
// ============================================================================

export function createStep(
  type: AgentStep['type'],
  content: string,
  toolCall?: ToolCall,
  toolResult?: ToolResult
): AgentStep {
  return {
    id: crypto.randomUUID(),
    type,
    content,
    toolCall,
    toolResult,
    timestamp: new Date(),
  }
}

// ============================================================================
// Error Analyzer
// ============================================================================

export function analyzeError(error: string): {
  type: 'syntax' | 'runtime' | 'dependency' | 'permission' | 'unknown'
  suggestion: string
} {
  const errorLower = error.toLowerCase()

  if (errorLower.includes('syntaxerror') || errorLower.includes('unexpected token')) {
    return {
      type: 'syntax',
      suggestion: 'Check the file for syntax errors. Look for missing brackets, quotes, or semicolons.',
    }
  }

  if (errorLower.includes('cannot find module') || errorLower.includes('module not found')) {
    return {
      type: 'dependency',
      suggestion: 'Run npm install to install missing dependencies.',
    }
  }

  if (errorLower.includes('permission denied') || errorLower.includes('eacces')) {
    return {
      type: 'permission',
      suggestion: 'Check file permissions or try running with appropriate access.',
    }
  }

  if (errorLower.includes('typeerror') || errorLower.includes('referenceerror')) {
    return {
      type: 'runtime',
      suggestion: 'Check variable types and ensure all references are defined.',
    }
  }

  return {
    type: 'unknown',
    suggestion: 'Analyze the error message and stack trace to identify the issue.',
  }
}

// ============================================================================
// Task Status Helpers
// ============================================================================

export function isTaskComplete(task: AgentTask): boolean {
  return task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'
}

export function getTaskDuration(task: AgentTask): number {
  if (!task.startTime) return 0
  const endTime = task.endTime || new Date()
  return endTime.getTime() - task.startTime.getTime()
}

export function getTaskSummary(task: AgentTask): string {
  const duration = getTaskDuration(task)
  const stepCount = task.steps.length
  const toolCalls = task.steps.filter(s => s.toolCall).length
  
  return `Task ${task.status} in ${(duration / 1000).toFixed(1)}s with ${stepCount} steps (${toolCalls} tool calls)`
}
