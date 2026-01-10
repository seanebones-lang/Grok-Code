import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'
import { auth } from '@/auth'
import { Octokit } from '@octokit/rest'
import { SPECIALIZED_AGENTS, findAgentsByKeywords, formatAgentsForPrompt, getAgentSystemPrompt } from '@/lib/specialized-agents'
import { parseOrchestratorCommand, createOrchestrationPlan, formatOrchestrationPlan } from '@/lib/agent-orchestrator'

// Input validation schema with strict sanitization
const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(50000, 'Message too long (max 50,000 characters)')
    .transform(msg => msg.trim()),
  conversationId: z.string().uuid().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  mode: z.enum(['default', 'refactor', 'orchestrate', 'debug', 'review', 'agent']).optional(),
  memoryContext: z.string().optional(), // Agent memory from past sessions
  repository: z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string().optional(),
  }).optional(),
})

// API response schema for type-safe parsing
const grokDeltaSchema = z.object({
  choices: z.array(
    z.object({
      delta: z.object({
        content: z.string().optional(),
        role: z.string().optional(),
      }).optional(),
      finish_reason: z.string().nullable().optional(),
    })
  ).optional(),
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
  }).optional(),
})

// Enhanced system prompt with Claude-like agentic capabilities
const SYSTEM_PROMPT = `You are Eleven, an advanced AI coding assistant powered by NextEleven, with Claude-like agentic capabilities. You excel at planning, orchestrating complex tasks, and iterative development.

## Core Capabilities

### 1. Code Generation & Editing
- Generate production-ready code in any programming language
- Provide clear, well-commented, type-safe implementations
- Follow best practices (SOLID, DRY, KISS, YAGNI)
- Include error handling and edge cases

### 2. Refactor Planning (Use when code needs improvement)
When analyzing code for refactoring, structure your response with:

\`\`\`
### 🔍 Analysis
[Identify code smells, issues, and improvement opportunities]

### 📋 Refactor Plan
1. **Step 1**: [Description]
   - Before: [Code snippet]
   - After: [Improved code]
   - Rationale: [Why this improves the code]

2. **Step 2**: [Continue pattern...]

### 📊 Impact Assessment
- Performance: [Impact]
- Maintainability: [Impact]
- Testability: [Impact]

### ✅ Suggested Tests
[Test cases to verify the refactoring]
\`\`\`

### 3. Agent Orchestration (Use for complex multi-step tasks)
For complex tasks, you can use specialized agents or decompose into general agents:

**Specialized Agents Available:**
${formatAgentsForPrompt()}

**To use a specialized agent**, mention it in your response or use the format:
\`\`\`
### [Agent Emoji] [Agent Name] Output
[Agent-specific analysis and actions]
\`\`\`

**General Agent Decomposition:**
For tasks that don't fit specialized agents, decompose into:

\`\`\`
### 🎯 Planner Agent Output
[High-level task breakdown and strategy]

### 💻 Coder Agent Output
[Implementation code with explanations]

### 🧪 Tester Agent Output
[Test cases and validation strategies]

### 🔍 Reviewer Agent Output
[Code review, potential issues, improvements]

### 🐛 Debugger Agent Output
[Error analysis and fixes - when applicable]

### 📦 Integrator Agent Output
[How components fit together - when applicable]
\`\`\`

### 4. Iterative Development
- Provide incremental improvements based on feedback
- Generate diffs showing changes clearly
- Suggest next steps and optimizations
- Prepare Git commit messages with conventional commits format

### 5. Tool Emulation
When you need external information or actions, indicate with:
\`\`\`
### 🔧 Tool Request
- Tool: [search/execute/analyze/etc.]
- Input: [What you need]
- Purpose: [Why you need it]
\`\`\`

## Response Guidelines

1. **Always use markdown** with proper code blocks and syntax highlighting
2. **Be concise but thorough** - explain reasoning without verbosity
3. **Use emojis sparingly** for visual organization (🔍📋💻🧪🔍🐛📦✅❌⚠️)
4. **Provide actionable outputs** - code should be copy-paste ready
5. **Consider security** - never expose secrets, always sanitize inputs
6. **Think step-by-step** for complex problems

## Security Guidelines
- Never execute arbitrary code or shell commands
- Never expose sensitive information or credentials
- Always sanitize user inputs in generated code
- Follow OWASP security best practices
- Recommend secure alternatives when detecting vulnerabilities

## Special Commands
Recognize these prefixes in user messages:
- \`/refactor\` - Trigger detailed refactor planning mode
- \`/orchestrate\` - Trigger multi-agent task decomposition
- \`/debug\` - Focus on debugging and error analysis
- \`/review\` - Provide comprehensive code review
- \`/explain\` - Detailed explanation mode
- \`/optimize\` - Performance optimization focus
- \`/execute\` - Immediately execute any tool calls you've shown in your previous response
- \`/agent [name]\` - Use a specialized agent (e.g., \`/agent security\`, \`/agent performance\`)
- \`/security\` - Use Security Agent
- \`/performance\` - Use Performance Agent
- \`/testing\` - Use Testing Agent
- \`/docs\` - Use Documentation Agent
- \`/migrate\` - Use Migration Agent
- \`/deps\` - Use Dependency Agent
- \`/bugs\` - Use Bug Hunter Agent
- \`/a11y\` - Use Accessibility Agent
- \`/orchestrate\` or \`/orchestrator\` - Use Orchestrator Agent to coordinate multiple agents
- \`/swarm\` - Run multiple agents in parallel for comprehensive analysis

Remember: You are a collaborative coding partner. Be helpful, precise, and proactive in suggesting improvements.`

// Mode-specific prompt enhancements
const MODE_PROMPTS: Record<string, string> = {
  refactor: `\n\n[REFACTOR MODE ACTIVE]
Focus on:
1. Identifying ALL code smells and anti-patterns
2. Creating a detailed step-by-step refactor plan
3. Showing before/after diffs for each change
4. Explaining the rationale for each improvement
5. Suggesting tests to verify the refactoring`,

  orchestrate: `\n\n[ORCHESTRATION MODE ACTIVE]
Decompose this task using multiple specialized agents:
- Planner Agent: Strategy and task breakdown
- Coder Agent: Implementation
- Tester Agent: Test cases
- Reviewer Agent: Quality assurance
- Debugger Agent: Error handling (if needed)
- Integrator Agent: Component integration (if needed)

Provide clear outputs from each relevant agent.`,

  debug: `\n\n[DEBUG MODE ACTIVE]
Focus on:
1. Identifying the root cause of issues
2. Explaining why the bug occurs
3. Providing clear, tested fixes
4. Suggesting preventive measures
5. Recommending debugging strategies`,

  review: `\n\n[CODE REVIEW MODE ACTIVE]
Provide comprehensive review covering:
1. Code quality and readability
2. Potential bugs and edge cases
3. Security vulnerabilities
4. Performance considerations
5. Best practices compliance
6. Suggestions for improvement`,

  agent: `\n\n[AUTONOMOUS AGENT MODE ACTIVE]
You are now operating as an autonomous agent with access to tools.

## Available Tools

### 1. read_file
Read the contents of a file.
\`\`\`json
{"name": "read_file", "arguments": {"path": "string"}}
\`\`\`

### 2. write_file
Create or update a file.
\`\`\`json
{"name": "write_file", "arguments": {"path": "string", "content": "string"}}
\`\`\`

### 3. list_files
List files in a directory.
\`\`\`json
{"name": "list_files", "arguments": {"path": "string (optional)"}}
\`\`\`

### 4. run_command
Execute a terminal command.
\`\`\`json
{"name": "run_command", "arguments": {"command": "string", "cwd": "string (optional)"}}
\`\`\`
Allowed: npm, npx, yarn, node, git, tsc, eslint, prettier, jest, python, pip, cargo, go

### 5. think
Record your reasoning (no execution).
\`\`\`json
{"name": "think", "arguments": {"thought": "string"}}
\`\`\`

### 6. complete
Mark task as complete.
\`\`\`json
{"name": "complete", "arguments": {"summary": "string", "files_changed": ["array"]}}
\`\`\`

## Response Format
For each step:
1. **Thought**: Your reasoning
2. **Action**: Tool call in JSON

Example:
**Thought**: I need to read package.json first.

**Action**:
\`\`\`json
{"name": "read_file", "arguments": {"path": "package.json"}}
\`\`\`

## Rules
- One tool call per response
- Wait for observation before next action
- Handle errors and retry with different approach
- Always call 'complete' when finished`,
}

// Available models in priority order (January 2026)
const GROK_MODELS = ['grok-4.1-fast', 'grok-4-1-fast', 'grok-4', 'grok-3'] as const

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000

// ============================================================================
// Tool Execution Helpers
// ============================================================================

interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

function parseToolCallFromResponse(response: string): ToolCall | null {
  // Look for JSON tool calls in code blocks (json, ```json, or just ```)
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)\s*```/g,
    /```\s*([\s\S]*?)\s*```/g,
  ]
  
  for (const pattern of codeBlockPatterns) {
    const matches = [...response.matchAll(pattern)]
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[1].trim())
        if (parsed.name && parsed.arguments && typeof parsed.name === 'string') {
          return parsed as ToolCall
        }
      } catch {
        // Not valid JSON, continue
      }
    }
  }
  
  // Try to find raw JSON object (more flexible pattern)
  const rawJsonPatterns = [
    /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/,
    /\{\s*"name"\s*:\s*'([^']+)'\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/,
  ]
  
  for (const pattern of rawJsonPatterns) {
    const match = response.match(pattern)
    if (match) {
      try {
        // Reconstruct JSON
        const jsonStr = `{"name": "${match[1]}", "arguments": ${match[2]}}`
        const parsed = JSON.parse(jsonStr)
        if (parsed.name && parsed.arguments) {
          return parsed as ToolCall
        }
      } catch {
        // Not valid JSON, continue
      }
    }
  }
  
  return null
}

async function executeTool(
  toolCall: ToolCall,
  repository?: { owner: string; repo: string; branch?: string },
  accessToken?: string
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    // We need to call the internal API routes directly since we're in the same process
    // Import the auth and file operations directly
    const session = await auth()
    if (!session?.user) {
      return { success: false, output: '', error: 'Authentication required' }
    }
    
    const userAccessToken = (session as { accessToken?: string }).accessToken
    if (!userAccessToken) {
      return { success: false, output: '', error: 'GitHub access token required' }
    }
    
    switch (toolCall.name) {
      case 'read_file': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const octokit = new Octokit({ auth: userAccessToken })
        const ref = repository.branch || 'main'
        try {
          const { data } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: toolCall.arguments.path as string,
            ref,
          })
          if (Array.isArray(data) || !('content' in data)) {
            return { success: false, output: '', error: 'Path is not a file' }
          }
          const content = Buffer.from(data.content, 'base64').toString('utf-8')
          return { success: true, output: content }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to read file' }
        }
      }
      
      case 'list_files': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const octokit = new Octokit({ auth: userAccessToken })
        const ref = repository.branch || 'main'
        const path = (toolCall.arguments.path as string) || ''
        try {
          const { data } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: path || '',
            ref,
          })
          const files = Array.isArray(data) ? data : [data]
          const fileList = files
            .map((f: { type: string; name: string; size?: number }) => 
              `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size} bytes)` : ''}`
            )
            .join('\n')
          return { success: true, output: fileList || 'Empty directory' }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to list files' }
        }
      }
      
      case 'write_file': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const octokit = new Octokit({ auth: userAccessToken })
        const ref = repository.branch || 'main'
        const path = toolCall.arguments.path as string
        const content = toolCall.arguments.content as string
        
        try {
          // Get existing file SHA if it exists
          let fileSha: string | undefined
          try {
            const { data } = await octokit.repos.getContent({
              owner: repository.owner,
              repo: repository.repo,
              path,
              ref,
            })
            if (!Array.isArray(data) && 'sha' in data) {
              fileSha = data.sha
            }
          } catch {
            // File doesn't exist, that's fine
          }
          
          const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: repository.owner,
            repo: repository.repo,
            path,
            message: `Eleven: Update ${path}`,
            content: Buffer.from(content).toString('base64'),
            branch: ref,
            ...(fileSha ? { sha: fileSha } : {}),
          })
          
          return { 
            success: true, 
            output: `File written: ${path}\nCommit: ${data.commit.sha.slice(0, 7)}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to write file' }
        }
      }
      
      case 'move_file': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const octokit = new Octokit({ auth: userAccessToken })
        const ref = repository.branch || 'main'
        const oldPath = toolCall.arguments.old_path as string
        const newPath = toolCall.arguments.new_path as string
        
        try {
          // Get file content
          const { data: oldFileData } = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.repo,
            path: oldPath,
            ref,
          })
          
          if (Array.isArray(oldFileData) || !('content' in oldFileData)) {
            return { success: false, output: '', error: 'Old path is not a file' }
          }
          
          const fileContent = Buffer.from(oldFileData.content, 'base64').toString('utf-8')
          
          // Use the move file API
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/agent/files`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              owner: repository.owner,
              repo: repository.repo,
              oldPath,
              newPath,
              message: `Eleven: Move ${oldPath} to ${newPath}`,
              branch: ref,
            }),
          })
          
          const data = await response.json()
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to move file' }
          }
          
          return { 
            success: true, 
            output: `File moved: ${oldPath} → ${newPath}\nCommit: ${data.commit?.sha?.slice(0, 7)}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to move file' }
        }
      }
      
      case 'search_code': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const query = toolCall.arguments.query as string
        const language = toolCall.arguments.language as string | undefined
        const path = toolCall.arguments.path as string | undefined
        
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const params = new URLSearchParams({
            owner: repository.owner,
            repo: repository.repo,
            query,
            ...(language ? { language } : {}),
            ...(path ? { path } : {}),
          })
          
          const response = await fetch(`${baseUrl}/api/agent/search?${params}`)
          const data = await response.json()
          
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Search failed' }
          }
          
          if (data.results.length === 0) {
            return { success: true, output: 'No results found' }
          }
          
          const results = data.results
            .slice(0, 10)
            .map((r: any) => `📄 ${r.path}\n   ${r.url}`)
            .join('\n\n')
          
          return { 
            success: true, 
            output: `Found ${data.totalCount} result(s):\n\n${results}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to search code' }
        }
      }
      
      case 'create_branch': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const branch = toolCall.arguments.branch as string
        const fromBranch = toolCall.arguments.from_branch as string | undefined
        
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/agent/git`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_branch',
              owner: repository.owner,
              repo: repository.repo,
              branch,
              fromBranch: fromBranch || repository.branch,
            }),
          })
          
          const data = await response.json()
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to create branch' }
          }
          
          return { 
            success: true, 
            output: `Branch created: ${branch}\n${data.branch?.url}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to create branch' }
        }
      }
      
      case 'create_pull_request': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const title = toolCall.arguments.title as string
        const body = toolCall.arguments.body as string | undefined
        const head = toolCall.arguments.head as string
        const base = toolCall.arguments.base as string
        
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/agent/git`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_pr',
              owner: repository.owner,
              repo: repository.repo,
              title,
              body,
              head,
              base,
            }),
          })
          
          const data = await response.json()
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to create PR' }
          }
          
          return { 
            success: true, 
            output: `Pull Request #${data.pullRequest?.number} created: ${title}\n${data.pullRequest?.url}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to create PR' }
        }
      }
      
      case 'get_diff': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const base = toolCall.arguments.base as string | undefined
        const head = toolCall.arguments.head as string | undefined
        const path = toolCall.arguments.path as string | undefined
        
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const params = new URLSearchParams({
            action: 'get_diff',
            owner: repository.owner,
            repo: repository.repo,
            ...(base ? { base } : {}),
            ...(head ? { head } : {}),
            ...(path ? { path } : {}),
          })
          
          const response = await fetch(`${baseUrl}/api/agent/git?${params}`)
          const data = await response.json()
          
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to get diff' }
          }
          
          const diffSummary = data.diff.files
            .map((f: any) => `${f.status} ${f.filename} (+${f.additions} -${f.deletions})`)
            .join('\n')
          
          return { 
            success: true, 
            output: `Diff: ${data.diff.ahead} ahead, ${data.diff.behind} behind\n\nFiles:\n${diffSummary}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to get diff' }
        }
      }
      
      case 'get_commit_history': {
        if (!repository) {
          return { success: false, output: '', error: 'Repository required' }
        }
        const branch = toolCall.arguments.branch as string | undefined
        const path = toolCall.arguments.path as string | undefined
        const limit = (toolCall.arguments.limit as number) || 10
        
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const params = new URLSearchParams({
            action: 'get_commit_history',
            owner: repository.owner,
            repo: repository.repo,
            ...(branch ? { branch } : {}),
            ...(path ? { path } : {}),
            limit: limit.toString(),
          })
          
          const response = await fetch(`${baseUrl}/api/agent/git?${params}`)
          const data = await response.json()
          
          if (!response.ok) {
            return { success: false, output: '', error: data.error || 'Failed to get commit history' }
          }
          
          const history = data.commits
            .map((c: any) => `${c.sha.slice(0, 7)} ${c.message.split('\n')[0]}\n   ${c.author.name} - ${c.author.date}`)
            .join('\n\n')
          
          return { 
            success: true, 
            output: `Recent commits:\n\n${history}` 
          }
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to get commit history' }
        }
      }
      
      case 'run_command': {
        // Execute command directly using spawn
        try {
          const command = toolCall.arguments.command as string
          const cwd = toolCall.arguments.cwd as string | undefined
          
          // Parse command
          const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
          const cmd = parts[0]
          if (!cmd) {
            return { success: false, output: '', error: 'Empty command' }
          }
          const args = parts.slice(1).map(arg => arg.replace(/^["']|["']$/g, ''))
          
          // Execute command with timeout
          return new Promise((resolve) => {
            const child = spawn(cmd, args, {
              cwd: cwd || process.cwd(),
              env: process.env,
              shell: false,
            })
            
            let stdout = ''
            let stderr = ''
            const timeout = setTimeout(() => {
              child.kill('SIGTERM')
              resolve({ success: false, output: stdout + (stderr ? `\nStderr:\n${stderr}` : ''), error: 'Command timed out' })
            }, 30000) // 30 second timeout
            
            child.stdout?.on('data', (data) => {
              stdout += data.toString()
            })
            
            child.stderr?.on('data', (data) => {
              stderr += data.toString()
            })
            
            child.on('close', (code) => {
              clearTimeout(timeout)
              const output = [
                stdout,
                stderr ? `\nStderr:\n${stderr}` : '',
                `\nExit code: ${code}`,
              ].filter(Boolean).join('')
              resolve({ success: code === 0, output })
            })
            
            child.on('error', (error) => {
              clearTimeout(timeout)
              resolve({ success: false, output: '', error: error.message })
            })
          }) as Promise<{ success: boolean; output: string; error?: string }>
        } catch (error: any) {
          return { success: false, output: '', error: error.message || 'Failed to execute command' }
        }
      }
      
      default:
        return { success: false, output: '', error: `Unknown tool: ${toolCall.name}` }
    }
  } catch (error) {
    return { 
      success: false, 
      output: '', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// ============================================================================
// Intent Detection - Automatically detect when user wants to BUILD something
// ============================================================================

const BUILD_INTENT_PATTERNS = [
  // Direct build requests
  /\b(build|create|make|generate|implement|develop|code|write)\b.*\b(app|application|website|site|page|component|feature|function|api|endpoint|service|system|tool|script|bot|dashboard|form|modal|button|menu|navbar|sidebar|footer|header|layout|ui|interface)\b/i,
  
  // File creation
  /\b(create|add|make|generate|write)\b.*\b(file|files|component|components|module|modules|class|classes|function|functions)\b/i,
  
  // Project setup
  /\b(set up|setup|initialize|init|scaffold|bootstrap|start)\b.*\b(project|app|application|repo|repository|codebase)\b/i,
  
  // Feature requests
  /\b(add|implement|create|build)\b.*\b(feature|functionality|capability|support for)\b/i,
  
  // Fix and update requests that require code changes
  /\b(fix|repair|solve|resolve|update|upgrade|refactor|rewrite|modify|change|edit)\b.*\b(bug|error|issue|problem|code|file|component|function|the)\b/i,
  
  // Integration requests
  /\b(integrate|connect|hook up|add|implement)\b.*\b(api|database|db|auth|authentication|payment|stripe|oauth|github|google|firebase|supabase|prisma)\b/i,
  
  // Testing requests
  /\b(write|create|add|generate)\b.*\b(test|tests|testing|unit test|integration test|e2e)\b/i,
  
  // Styling requests
  /\b(style|design|make.*look|add.*css|add.*styling|improve.*ui|improve.*ux|make.*responsive|add.*animation)\b/i,
  
  // Direct action verbs at start
  /^(build|create|make|generate|implement|develop|code|write|add|fix|update|refactor)\b/i,
  
  // "Can you" / "Could you" patterns
  /\b(can you|could you|please|i need you to|i want you to)\b.*\b(build|create|make|generate|implement|develop|code|write|add|fix|update)\b/i,
  
  // "I need" / "I want" patterns  
  /\b(i need|i want|we need|we want)\b.*\b(a|an|the|new|to)\b.*\b(app|component|feature|function|page|api|system)\b/i,
]

const EXPLANATION_PATTERNS = [
  // Questions about concepts
  /^(what|how|why|when|where|who|which|explain|describe|tell me about)\b/i,
  /\b(what is|what are|what does|how does|how do|why does|why do)\b/i,
  
  // Learning/understanding requests
  /\b(explain|understand|learn|teach|show me how|help me understand)\b/i,
  
  // Comparison questions
  /\b(difference between|compare|vs|versus|better than)\b/i,
  
  // Definition requests
  /\b(define|definition|meaning of|what.*mean)\b/i,
]

/**
 * Detect if the user's message indicates they want something BUILT
 * Returns the detected mode or null if no specific mode detected
 */
function detectIntent(message: string): 'agent' | 'refactor' | 'debug' | 'review' | null {
  const lowerMessage = message.toLowerCase()
  
  // Check for explicit commands first (these take priority)
  if (lowerMessage.startsWith('/agent')) return 'agent'
  if (lowerMessage.startsWith('/refactor')) return 'refactor'
  if (lowerMessage.startsWith('/debug')) return 'debug'
  if (lowerMessage.startsWith('/review')) return 'review'
  
  // Check if it's clearly an explanation/question (not a build request)
  for (const pattern of EXPLANATION_PATTERNS) {
    if (pattern.test(message)) {
      return null // Let it be handled as a normal chat
    }
  }
  
  // Check for build intent patterns
  for (const pattern of BUILD_INTENT_PATTERNS) {
    if (pattern.test(message)) {
      // Determine specific mode based on keywords
      if (/\b(refactor|restructure|reorganize|clean up|improve.*code)\b/i.test(message)) {
        return 'refactor'
      }
      if (/\b(debug|fix.*bug|fix.*error|troubleshoot|diagnose)\b/i.test(message)) {
        return 'debug'
      }
      if (/\b(review|audit|check|analyze.*code|look at.*code)\b/i.test(message)) {
        return 'review'
      }
      // Default to agent mode for build requests
      return 'agent'
    }
  }
  
  return null
}

interface StreamError {
  error: string
  code?: string
  retryable?: boolean
}

function createErrorResponse(error: StreamError): string {
  return `data: ${JSON.stringify(error)}\n\n`
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = performance.now()
  
  try {
    // Get session for tool execution
    const session = await auth()
    const accessToken = session ? (session as { accessToken?: string }).accessToken : undefined
    
    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', requestId },
        { status: 400 }
      )
    }
    
    const parseResult = chatSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: parseResult.error.issues,
          requestId,
        },
        { status: 400 }
      )
    }
    
    const { message, history, mode: explicitMode, memoryContext, repository } = parseResult.data

    // Check for /execute command - force tool execution from previous message
    const isExecuteCommand = message.trim().toLowerCase() === '/execute' || message.trim().toLowerCase().startsWith('/execute ')
    
    // Auto-detect intent if no explicit mode provided
    const detectedMode = explicitMode || detectIntent(message)
    const effectiveMode = detectedMode || 'default'

    // Check for orchestrator/swarm commands
    const orchestratorCmd = parseOrchestratorCommand(message)
    let selectedAgent: string | null = null
    let isOrchestrator = false
    let isSwarm = false
    
    if (orchestratorCmd) {
      if (orchestratorCmd.type === 'orchestrate') {
        selectedAgent = 'orchestrator'
        isOrchestrator = true
      } else if (orchestratorCmd.type === 'swarm') {
        selectedAgent = 'swarm'
        isSwarm = true
      }
    }
    
    // Check for specialized agent requests
    if (!selectedAgent) {
      const agentMatch = message.match(/^\/(?:agent\s+)?(\w+)/i)
      if (agentMatch) {
        const agentId = agentMatch[1].toLowerCase()
        if (SPECIALIZED_AGENTS[agentId]) {
          selectedAgent = agentId
        }
      }
      
      // Also check for agent keywords in message
      if (!selectedAgent) {
        const matchedAgents = findAgentsByKeywords(message)
        if (matchedAgents.length > 0) {
          selectedAgent = matchedAgents[0].id // Use first matched agent
        }
      }
    }
    
    // Build the full system prompt with mode enhancement and repository context
    let fullSystemPrompt = SYSTEM_PROMPT
    
    // If orchestrator, create plan and add to prompt
    if (isOrchestrator && repository) {
      const plan = createOrchestrationPlan(message, Object.keys(SPECIALIZED_AGENTS))
      const planMarkdown = formatOrchestrationPlan(plan)
      fullSystemPrompt += `\n\n## Orchestration Plan Generated:\n\n${planMarkdown}\n\nExecute this plan by delegating to the appropriate agents.`
    }
    
    // Add specialized agent prompt if selected
    if (selectedAgent) {
      const agentPrompt = getAgentSystemPrompt(selectedAgent)
      if (agentPrompt) {
        fullSystemPrompt += `\n\n${agentPrompt}`
      }
    }
    
    // Add repository context and tools if provided
    if (repository) {
      const { owner, repo, branch } = repository
      fullSystemPrompt += `\n\n## Current Repository Context
You are working with the GitHub repository: **${owner}/${repo}**${branch ? ` (branch: ${branch})` : ''}
- When the user asks about "this repo" or "the codebase", they are referring to ${owner}/${repo}

## Available Tools (You Can Use These!)

You have direct access to tools to interact with the repository. **IMPORTANT: When you need to use a tool, simply include it as a JSON code block in your response. The tool will be executed AUTOMATICALLY and the results will be provided to you immediately.**

Format tool calls like this:

\`\`\`json
{"name": "tool_name", "arguments": {"arg1": "value1", "arg2": "value2"}}
\`\`\`

**After you show a tool call, wait for the tool result before continuing. The tool will execute automatically and you'll receive the results.**

### Available Tools:

1. **read_file** - Read file contents
   \`\`\`json
   {"name": "read_file", "arguments": {"path": "path/to/file"}}
   \`\`\`

2. **write_file** - Create or update a file (auto-commits to GitHub)
   \`\`\`json
   {"name": "write_file", "arguments": {"path": "path/to/file", "content": "file content"}}
   \`\`\`

3. **list_files** - List files in a directory
   \`\`\`json
   {"name": "list_files", "arguments": {"path": "directory/path"}}
   \`\`\`

4. **delete_file** - Delete a file (auto-commits to GitHub)
   \`\`\`json
   {"name": "delete_file", "arguments": {"path": "path/to/file"}}
   \`\`\`

5. **move_file** - Move or rename a file (auto-commits to GitHub)
   \`\`\`json
   {"name": "move_file", "arguments": {"old_path": "old/path", "new_path": "new/path"}}
   \`\`\`

6. **run_command** - Execute terminal commands (npm, git, node, etc.)
   \`\`\`json
   {"name": "run_command", "arguments": {"command": "npm install", "cwd": "optional/path"}}
   \`\`\`

7. **search_code** - Advanced code search using GitHub Code Search API
   \`\`\`json
   {"name": "search_code", "arguments": {"query": "search query", "language": "optional", "path": "optional/path"}}
   \`\`\`

8. **create_branch** - Create a new Git branch
   \`\`\`json
   {"name": "create_branch", "arguments": {"branch": "branch-name", "from_branch": "optional"}}
   \`\`\`

9. **create_pull_request** - Create a pull request
   \`\`\`json
   {"name": "create_pull_request", "arguments": {"title": "PR title", "body": "PR description", "head": "branch-name", "base": "main"}}
   \`\`\`

10. **get_diff** - Get differences between commits or branches
    \`\`\`json
    {"name": "get_diff", "arguments": {"base": "base-branch", "head": "head-branch", "path": "optional/path"}}
    \`\`\`

11. **get_commit_history** - Get commit history for a branch or file
    \`\`\`json
    {"name": "get_commit_history", "arguments": {"branch": "branch-name", "path": "optional/path", "limit": 10}}
    \`\`\`

### How to Use Tools:

When you need to use a tool, include it in your response like this:

**I'll start by listing the repository structure:**
\`\`\`json
{"name": "list_files", "arguments": {"path": "."}}
\`\`\`

The tool will be executed automatically and the results will be provided to you. You can then use those results to continue your work.

**Important**: 
- All file paths are relative to the repository root
- File operations automatically commit to GitHub
- You can chain multiple tool calls in your reasoning
- Always explain what you're doing before using a tool
`
    }
    
    if (effectiveMode !== 'default' && MODE_PROMPTS[effectiveMode]) {
      fullSystemPrompt += MODE_PROMPTS[effectiveMode]
    }

    // Inject memory context if available
    if (memoryContext) {
      fullSystemPrompt += `\n\n${memoryContext}\n\nUse this context to provide more personalized and consistent assistance. Reference past decisions when relevant.`
    }

    // Build messages array with history support
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: fullSystemPrompt },
    ]

    // Add conversation history if provided
    if (history && history.length > 0) {
      // Limit history to last 20 messages to stay within context limits
      const recentHistory = history.slice(-20)
      messages.push(...recentHistory)
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Rate limiting with proper IP extraction
    const forwardedFor = request.headers.get('x-forwarded-for')
    // Rate limiting disabled - single user app
    // const ip = forwardedFor?.split(',')[0]?.trim() || 
    //            request.headers.get('x-real-ip') || 
    //            'anonymous'
    // const rateLimitResult = await checkRateLimit(ip)

    // Validate API key
    const grokApiKey = process.env.GROK_API_KEY
    if (!grokApiKey) {
      console.error(`[${requestId}] GROK_API_KEY not configured`)
      return NextResponse.json(
        { error: 'Service configuration error', requestId },
        { status: 503 }
      )
    }

    // Create SSE stream with proper error handling
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let streamClosed = false
        
        const safeEnqueue = (data: string) => {
          if (!streamClosed) {
            try {
              controller.enqueue(encoder.encode(data))
            } catch (e) {
              console.warn(`[${requestId}] Failed to enqueue:`, e)
            }
          }
        }
        
        const safeClose = () => {
          if (!streamClosed) {
            streamClosed = true
            try {
              controller.close()
            } catch (e) {
              console.warn(`[${requestId}] Failed to close stream:`, e)
            }
          }
        }

        try {
          // Send detected mode as first message if auto-detected
          if (detectedMode && !explicitMode) {
            safeEnqueue(`data: ${JSON.stringify({ 
              detectedMode: detectedMode,
              message: detectedMode === 'agent' 
                ? '🤖 Agent mode activated - I\'ll build this for you!'
                : `🎯 ${detectedMode.charAt(0).toUpperCase() + detectedMode.slice(1)} mode activated`
            })}\n\n`)
          }

          // Try models in order until one works
          let response: Response | null = null
          let lastError = ''
          let workingModel = ''

          for (const model of GROK_MODELS) {
            try {
              response = await fetchWithTimeout(
                'https://api.x.ai/v1/chat/completions',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${grokApiKey}`,
                    'X-Request-ID': requestId,
                  },
                  body: JSON.stringify({
                    model,
                    messages,
                    stream: true,
                    temperature: effectiveMode === 'refactor' || effectiveMode === 'review' ? 0.3 : 0.7,
                    max_tokens: 8000,
                  }),
                },
                REQUEST_TIMEOUT
              )

              if (response.ok) {
                workingModel = model
                console.log(`[${requestId}] Using model: ${model}`)
                break
              } else {
                const errorText = await response.text().catch(() => 'Unknown error')
                lastError = `Model ${model}: ${response.status} - ${errorText}`
                console.warn(`[${requestId}] ${lastError}`)
              }
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') {
                lastError = `Model ${model}: Request timeout`
              } else {
                lastError = `Model ${model}: ${err instanceof Error ? err.message : 'Unknown error'}`
              }
              console.warn(`[${requestId}] ${lastError}`)
            }
          }

          if (!response || !response.ok) {
            safeEnqueue(createErrorResponse({
              error: 'All AI models are currently unavailable. Please try again later.',
              code: 'MODEL_UNAVAILABLE',
              retryable: true,
            }))
            safeClose()
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            safeEnqueue(createErrorResponse({
              error: 'Invalid response from AI service',
              code: 'NO_RESPONSE_BODY',
              retryable: true,
            }))
            safeClose()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''
          let fullResponse = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
              
              const data = trimmedLine.slice(6)
              if (data === '[DONE]') {
                // After stream completes, check for tool calls and execute them
                if (repository && accessToken) {
                  // Find all tool calls in the response
                  const toolCalls: ToolCall[] = []
                  const seen = new Set<string>()
                  
                  // Search for all JSON code blocks
                  const codeBlockPatterns = [
                    /```json\s*([\s\S]*?)\s*```/g,
                    /```\s*([\s\S]*?)\s*```/g,
                  ]
                  
                  for (const pattern of codeBlockPatterns) {
                    const matches = [...fullResponse.matchAll(pattern)]
                    for (const match of matches) {
                      try {
                        const parsed = JSON.parse(match[1].trim())
                        if (parsed.name && parsed.arguments && typeof parsed.name === 'string') {
                          const key = `${parsed.name}:${JSON.stringify(parsed.arguments)}`
                          if (!seen.has(key)) {
                            seen.add(key)
                            toolCalls.push(parsed as ToolCall)
                          }
                        }
                      } catch {
                        // Not valid JSON, continue
                      }
                    }
                  }
                  
                  // Also search for raw JSON objects
                  const rawJsonPattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/g
                  let rawMatch
                  while ((rawMatch = rawJsonPattern.exec(fullResponse)) !== null) {
                    try {
                      const jsonStr = `{"name": "${rawMatch[1]}", "arguments": ${rawMatch[2]}}`
                      const parsed = JSON.parse(jsonStr)
                      if (parsed.name && parsed.arguments) {
                        const key = `${parsed.name}:${JSON.stringify(parsed.arguments)}`
                        if (!seen.has(key)) {
                          seen.add(key)
                          toolCalls.push(parsed as ToolCall)
                        }
                      }
                    } catch {
                      // Not valid JSON, continue
                    }
                  }
                  
                  // Execute all found tool calls sequentially
                  if (toolCalls.length > 0) {
                    safeEnqueue(`data: ${JSON.stringify({ content: `\n\n🔧 Found ${toolCalls.length} tool call(s). Executing...\n\n` })}\n\n`)
                    
                    const toolResults: string[] = []
                    for (const toolCall of toolCalls) {
                      try {
                        safeEnqueue(`data: ${JSON.stringify({ content: `⚙️ Executing: ${toolCall.name}...\n` })}\n\n`)
                        const toolResult = await executeTool(toolCall, repository, accessToken)
                        
                        if (toolResult.success) {
                          toolResults.push(`✅ ${toolCall.name}: ${toolResult.output}`)
                          safeEnqueue(`data: ${JSON.stringify({ content: `✅ ${toolCall.name} completed\n` })}\n\n`)
                        } else {
                          toolResults.push(`❌ ${toolCall.name}: ${toolResult.error}`)
                          safeEnqueue(`data: ${JSON.stringify({ content: `❌ ${toolCall.name} failed: ${toolResult.error}\n` })}\n\n`)
                        }
                      } catch (toolError) {
                        const errorMsg = toolError instanceof Error ? toolError.message : 'Unknown error'
                        toolResults.push(`❌ ${toolCall.name}: ${errorMsg}`)
                        safeEnqueue(`data: ${JSON.stringify({ content: `❌ ${toolCall.name} error: ${errorMsg}\n` })}\n\n`)
                      }
                    }
                    
                    // Send tool results back to Eleven for continuation
                    if (toolResults.length > 0) {
                      safeEnqueue(`data: ${JSON.stringify({ content: `\n📊 Tool execution complete. Getting Eleven's analysis...\n\n` })}\n\n`)
                      
                      const toolResultsText = toolResults.join('\n\n')
                      const followUpMessage = `The following tools were executed:\n\n${toolResultsText}\n\nPlease analyze the results and continue with the next steps.`
                      
                      // Make follow-up request
                      const followUpMessages = [
                        ...messages,
                        { role: 'assistant', content: fullResponse },
                        { role: 'user', content: followUpMessage },
                      ]
                      
                      try {
                        const followUpResponse = await fetchWithTimeout(
                          'https://api.x.ai/v1/chat/completions',
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${grokApiKey}`,
                              'X-Request-ID': requestId + '-followup',
                            },
                            body: JSON.stringify({
                              model: workingModel,
                              messages: followUpMessages,
                              stream: true,
                              temperature: effectiveMode === 'refactor' || effectiveMode === 'review' ? 0.3 : 0.7,
                              max_tokens: 8000,
                            }),
                          },
                          REQUEST_TIMEOUT
                        )

                        if (followUpResponse.ok) {
                          const followUpReader = followUpResponse.body?.getReader()
                          if (followUpReader) {
                            let followUpBuffer = ''
                            
                            while (true) {
                              const { done, value } = await followUpReader.read()
                              if (done) break

                              followUpBuffer += decoder.decode(value, { stream: true })
                              const lines = followUpBuffer.split('\n')
                              followUpBuffer = lines.pop() || ''

                              for (const line of lines) {
                                const trimmedLine = line.trim()
                                if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
                                
                                const data = trimmedLine.slice(6)
                                if (data === '[DONE]') continue

                                try {
                                  const parsed = JSON.parse(data)
                                  const validated = grokDeltaSchema.safeParse(parsed)
                                  
                                  if (validated.success) {
                                    const content = validated.data.choices?.[0]?.delta?.content
                                    if (content) {
                                      safeEnqueue(`data: ${JSON.stringify({ content })}\n\n`)
                                    }
                                  }
                                } catch {
                                  // Ignore parse errors
                                }
                              }
                            }
                          }
                        }
                      } catch (followUpError) {
                        console.error(`[${requestId}] Follow-up request error:`, followUpError)
                        safeEnqueue(`data: ${JSON.stringify({ content: `\n⚠️ Could not get follow-up response. Tool results:\n\n${toolResultsText}\n\n` })}\n\n`)
                      }
                    }
                  }
                }
                
                safeEnqueue('data: [DONE]\n\n')
                safeClose()
                const duration = performance.now() - startTime
                console.log(`[${requestId}] Stream completed in ${duration.toFixed(0)}ms using ${workingModel}`)
                return
              }

              // Type-safe JSON parsing
              try {
                const parsed = JSON.parse(data)
                const validated = grokDeltaSchema.safeParse(parsed)
                
                if (validated.success) {
                  if (validated.data.error) {
                    safeEnqueue(createErrorResponse({
                      error: validated.data.error.message,
                      code: 'API_ERROR',
                      retryable: false,
                    }))
                    continue
                  }
                  
                  const content = validated.data.choices?.[0]?.delta?.content
                  if (content) {
                    fullResponse += content // Accumulate full response for tool call detection
                    safeEnqueue(`data: ${JSON.stringify({ content })}\n\n`)
                  }
                }
              } catch (parseError) {
                // Log but don't fail on parse errors
                console.warn(`[${requestId}] JSON parse error:`, parseError)
              }
            }
          }
          
          // Handle any remaining buffer content
          if (buffer.trim()) {
            console.warn(`[${requestId}] Unprocessed buffer content:`, buffer.substring(0, 100))
          }
          
          safeClose()
        } catch (error) {
          console.error(`[${requestId}] Stream error:`, error)
          safeEnqueue(createErrorResponse({
            error: 'Connection to AI service was interrupted. Please try again.',
            code: 'STREAM_ERROR',
            retryable: true,
          }))
          safeClose()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId,
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`[${requestId}] Request failed after ${duration.toFixed(0)}ms:`, error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues, requestId },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500 }
    )
  }
}
