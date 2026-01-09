import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/ratelimit'

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
For complex tasks, decompose into specialized agents:

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
    
    const { message, history, mode: explicitMode } = parseResult.data

    // Auto-detect intent if no explicit mode provided
    const detectedMode = explicitMode || detectIntent(message)
    const effectiveMode = detectedMode || 'default'

    // Build the full system prompt with mode enhancement
    let fullSystemPrompt = SYSTEM_PROMPT
    if (effectiveMode !== 'default' && MODE_PROMPTS[effectiveMode]) {
      fullSystemPrompt += MODE_PROMPTS[effectiveMode]
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
    const ip = forwardedFor?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'anonymous'
    
    const rateLimitResult = await checkRateLimit(ip)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
          requestId,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

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
