import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'
import { SPECIALIZED_AGENTS, findAgentsByKeywords, formatAgentsForPrompt, getAgentSystemPrompt } from '@/lib/specialized-agents'
import { parseOrchestratorCommand, createOrchestrationPlan, formatOrchestrationPlan } from '@/lib/agent-orchestrator'
import { executeTool, type ToolCall } from '@/lib/tool-executor'
import { createApiError, createStreamError, handleError, logError, type StreamError } from '@/lib/error-handler'
import { extractToolCalls, executeToolCalls, processStreamChunk, createStreamController, type StreamingOptions } from '@/lib/streaming-handler'

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

  agent: `\n\n[AUTONOMOUS AGENT MODE - FULL AUTO-EXECUTION]
You are an autonomous agent. **ALL TOOLS EXECUTE AUTOMATICALLY - NO USER APPROVAL NEEDED.**

## CRITICAL: Just Do It!
- Output JSON tool calls and they RUN IMMEDIATELY
- NEVER say "I'll wait for approval" or "type execute"
- NEVER ask "should I proceed?" - just PROCEED
- Build, write, run commands - everything is AUTO

## Tools (Auto-Execute on Output)

\`\`\`json
{"name": "read_file", "arguments": {"path": "file.ts"}}
{"name": "write_file", "arguments": {"path": "file.ts", "content": "code here"}}
{"name": "list_files", "arguments": {"path": "src/"}}
{"name": "run_command", "arguments": {"command": "npm install"}}
{"name": "delete_file", "arguments": {"path": "old.ts"}}
{"name": "search_code", "arguments": {"query": "function name"}}
\`\`\`

## Workflow
1. Read what's needed
2. Write files (they save automatically)
3. Run commands (they execute automatically)
4. Continue until DONE
5. Call complete when finished:
\`\`\`json
{"name": "complete", "arguments": {"summary": "What I did", "files_changed": ["file1.ts"]}}
\`\`\`

**You are fully autonomous. Take action, don't ask permission.**`,
}

// Available models in priority order (January 2026)
const GROK_MODELS = ['grok-4.1-fast', 'grok-4-1-fast', 'grok-4', 'grok-3'] as const

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000

// ============================================================================
// Tool Execution Helpers
// ============================================================================
// Note: Tool execution functions are now in @/lib/tool-executor
// Note: Tool call extraction is now in @/lib/streaming-handler

// Legacy function kept for backward compatibility (deprecated)
function parseToolCallFromResponse(response: string): ToolCall | null {
  const toolCalls = extractToolCalls(response)
  return toolCalls.length > 0 ? toolCalls[0] : null
}

// Legacy functions removed - use executeTool and executeLocalTool from @/lib/tool-executor directly

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

// StreamError and createErrorResponse are now in @/lib/error-handler
// Keeping for backward compatibility
const createErrorResponse = createStreamError

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
    // Get GitHub token from header, stored token, or env for GitHub operations
    let githubToken = request.headers.get('X-Github-Token')
    if (!githubToken) {
      try {
        const { getGitHubToken } = await import('@/scripts/github-api')
        githubToken = getGitHubToken() || process.env.GITHUB_TOKEN || undefined
      } catch {
        githubToken = process.env.GITHUB_TOKEN || undefined
      }
    }
    
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
    
    // Agent command aliases (maps user-friendly commands to agent IDs)
    const AGENT_ALIASES: Record<string, string> = {
    }
    
    // Check for specialized agent requests
    if (!selectedAgent) {
      const agentMatch = message.match(/^\/(?:agent\s+)?([\w-]+)/i)
      if (agentMatch) {
        let agentId = agentMatch[1].toLowerCase()
        // Check aliases first
        if (AGENT_ALIASES[agentId]) {
          agentId = AGENT_ALIASES[agentId]
        }
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

## Available Tools (AUTO-EXECUTE - NO USER CONFIRMATION NEEDED!)

You have direct access to tools. **CRITICAL: Tools execute AUTOMATICALLY without ANY user confirmation. Just output the JSON and it runs immediately.**

**ALWAYS use this exact JSON format in a code block:**

\`\`\`json
{"name": "tool_name", "arguments": {"arg1": "value1"}}
\`\`\`

**NEVER ask the user to "execute" or "confirm" or "apply" - just DO IT. Output the JSON and the action happens instantly.**

After each tool call, wait for results before continuing. You can chain multiple operations to complete tasks fully.

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

    // Get API key from header or env
    // Get Grok API key from header or env
    const grokApiKey = request.headers.get('X-Grok-Token') || process.env.GROK_API_KEY
    if (!grokApiKey) {
      return NextResponse.json(
        { 
          error: 'GROK_API_KEY is required', 
          message: 'Please configure GROK_API_KEY environment variable',
          requestId,
        },
        { status: 500 }
      )
    }
    if (!grokApiKey) {
      console.error(`[${requestId}] GROK_API_KEY not provided`)
      return NextResponse.json(
        { error: 'Grok API token required. Please configure it in the setup screen.', requestId },
        { status: 401 }
      )
    }

    // Create SSE stream with proper error handling
    // Use extracted streaming controller helper
    const stream = new ReadableStream({
      async start(controller) {
        const streamController = createStreamController(controller)
        const { safeEnqueue, safeClose, sendError, sendData } = streamController

        try {
          // Send detected mode as first message if auto-detected
          if (detectedMode && !explicitMode) {
            sendData({
              detectedMode: detectedMode,
              message: detectedMode === 'agent' 
                ? '🤖 Agent mode activated - I\'ll build this for you!'
                : `🎯 ${detectedMode.charAt(0).toUpperCase() + detectedMode.slice(1)} mode activated`
            })
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
            sendError({
              error: 'All AI models are currently unavailable. Please try again later.',
              code: 'MODEL_UNAVAILABLE',
              retryable: true,
            })
            safeClose()
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            sendError({
              error: 'Invalid response from AI service',
              code: 'NO_RESPONSE_BODY',
              retryable: true,
            })
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
                // Use extracted module for tool call extraction and execution
                const toolCalls = extractToolCalls(fullResponse)
                
                if (toolCalls.length > 0) {
                  sendData({ content: `\n\n🔧 Found ${toolCalls.length} tool call(s). Executing...\n\n` })
                  
                  // Execute tool calls using extracted module
                  const toolResultsText = await executeToolCalls(toolCalls, {
                    requestId,
                    repository,
                    githubToken,
                    detectedMode,
                    explicitMode,
                  })
                  
                  // Send tool results back to Eleven for continuation
                  if (toolResultsText) {
                    sendData({ content: `\n📊 Tool execution complete. Getting Eleven's analysis...\n\n` })
                    
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

                      if (followUpResponse.ok && followUpResponse.body) {
                        const followUpReader = followUpResponse.body.getReader()
                        const followUpDecoder = new TextDecoder()
                        let followUpBuffer = ''

                        while (true) {
                          const { done, value } = await followUpReader.read()
                          if (done) break

                          followUpBuffer += followUpDecoder.decode(value, { stream: true })
                          const lines = followUpBuffer.split('\n')
                          followUpBuffer = lines.pop() || ''

                          for (const line of lines) {
                            const trimmedLine = line.trim()
                            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
                            
                            const data = trimmedLine.slice(6)
                            if (data === '[DONE]') break
                            
                            try {
                              const parsed = JSON.parse(data)
                              const validated = grokDeltaSchema.safeParse(parsed)
                              
                              if (validated.success) {
                                const content = validated.data.choices?.[0]?.delta?.content
                                if (content) {
                                  sendData({ content })
                                }
                              }
                            } catch {
                              // Ignore parse errors
                            }
                          }
                        }
                      }
                    } catch (followUpError) {
                      logError(followUpError, 'Follow-up request error', requestId)
                      sendData({ content: `\n⚠️ Could not get follow-up response. Tool results:\n\n${toolResultsText}\n\n` })
                    }
                  }
                }
                
                sendData({ content: '[DONE]' })
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
                    sendError({
                      error: validated.data.error.message,
                      code: 'API_ERROR',
                      retryable: false,
                    })
                    continue
                  }
                  
                  const content = validated.data.choices?.[0]?.delta?.content
                  if (content) {
                    fullResponse += content // Accumulate full response for tool call detection
                    sendData({ content })
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
          logError(error, 'Stream error', requestId)
          sendError({
            error: 'Connection to AI service was interrupted. Please try again.',
            code: 'STREAM_ERROR',
            retryable: true,
          })
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
    logError(error, `Request failed after ${duration.toFixed(0)}ms`, requestId)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError('Invalid request', 'VALIDATION_ERROR', error.issues, requestId),
        { status: 400 }
      )
    }

    const errorInfo = handleError(error, 'Request processing', requestId)
    return NextResponse.json(
      createApiError(errorInfo.message, errorInfo.code, undefined, requestId),
      { status: errorInfo.status }
    )
  }
}
