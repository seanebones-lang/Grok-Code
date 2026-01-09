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
  | 'run_command'
  | 'search_code'
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
Create or update a file with new content.
\`\`\`json
{
  "name": "write_file",
  "arguments": {
    "path": "string (required) - Path to the file",
    "content": "string (required) - File content"
  }
}
\`\`\`

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
Delete a file.
\`\`\`json
{
  "name": "delete_file",
  "arguments": {
    "path": "string (required) - Path to the file"
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

### 6. search_code
Search for patterns in the codebase.
\`\`\`json
{
  "name": "search_code",
  "arguments": {
    "pattern": "string (required) - Search pattern (regex supported)",
    "path": "string (optional) - Directory to search in"
  }
}
\`\`\`

### 7. think
Record your reasoning process (doesn't execute anything).
\`\`\`json
{
  "name": "think",
  "arguments": {
    "thought": "string (required) - Your reasoning"
  }
}
\`\`\`

### 8. complete
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
