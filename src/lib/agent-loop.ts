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
  | 'run_command'
  | 'search_code'
  | 'create_branch'
  | 'create_pull_request'
  | 'get_diff'
  | 'get_commit_history'
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

### 5. run_command
Execute a terminal command.
\`\`\`json
{
  "name": "run_command",
  "arguments": {
    "command": "string (required) - Command to execute",
    "cwd": "string (optional) - Working directory"
  }
}
\`\`\`
Allowed commands: npm, npx, yarn, node, git, tsc, eslint, prettier, jest, python, pip, cargo, go

**Python Libraries Available** (import directly in code_execution):
- Data: pandas, numpy, json, csv, PyMuPDF (fitz), Pillow, PyYAML
- Web: requests, httpx, aiohttp, BeautifulSoup, playwright, websockets
- APIs: openai, anthropic, boto3, stripe (requires env vars)
- Science: sympy, scipy, scikit-learn, torch, networkx
- Utility: asyncio, concurrent.futures, pathlib, logging, hashlib, secrets
- See full catalog: src/lib/agent-tools-catalog.ts

### 6. move_file
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

### 7. search_code
Advanced code search using GitHub Code Search API (more powerful than regex).
\`\`\`json
{
  "name": "search_code",
  "arguments": {
    "query": "string (required) - Search query (supports GitHub search syntax)",
    "language": "string (optional) - Filter by language (e.g., 'typescript', 'javascript')",
    "path": "string (optional) - Filter by path"
  }
}
\`\`\`

### 8. create_branch
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

### 9. create_pull_request
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

### 10. get_diff
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

### 11. get_commit_history
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

### 12. think
Record your reasoning process (doesn't execute anything).
\`\`\`json
{
  "name": "think",
  "arguments": {
    "thought": "string (required) - Your reasoning"
  }
}
\`\`\`

### 13. complete
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

For each step, respond with:
1. **Thought**: Your reasoning about what to do next
2. **Action**: A tool call in JSON format

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

1. **One action at a time**: Only call one tool per response
2. **Wait for results**: After each action, wait for the observation before proceeding
3. **Handle errors**: If a command fails, analyze the error and try to fix it
4. **Be thorough**: Read relevant files before making changes
5. **Test your work**: Run tests or build commands to verify changes
6. **Complete the task**: Always call 'complete' when finished
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
// Tool Call Parser
// ============================================================================

export function parseToolCall(response: string): ToolCall | null {
  // Look for JSON in the response
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
  if (!jsonMatch) {
    // Try to find raw JSON
    const rawJsonMatch = response.match(/\{[\s\S]*?"name"[\s\S]*?"arguments"[\s\S]*?\}/)
    if (!rawJsonMatch) return null
    
    try {
      const parsed = JSON.parse(rawJsonMatch[0])
      return {
        id: crypto.randomUUID(),
        name: parsed.name,
        arguments: parsed.arguments || {},
      }
    } catch {
      return null
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[1])
    return {
      id: crypto.randomUUID(),
      name: parsed.name,
      arguments: parsed.arguments || {},
    }
  } catch {
    return null
  }
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
