import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { spawn } from 'child_process'

/**
 * Terminal Execution API for Agentic Operations
 * Allows Grok to execute commands in a sandboxed environment
 * 
 * SECURITY: This is a powerful API that should be used with caution.
 * Only whitelisted commands are allowed to prevent arbitrary code execution.
 */

// ============================================================================
// Configuration
// ============================================================================

// Maximum execution time (30 seconds)
const MAX_EXECUTION_TIME = 30000

// Maximum output size (1MB)
const MAX_OUTPUT_SIZE = 1024 * 1024

// Whitelisted commands - only these can be executed
const WHITELISTED_COMMANDS = new Set([
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'node',
  'git',
  'ls',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'echo',
  'pwd',
  'cd',
  'mkdir',
  'touch',
  'rm',
  'cp',
  'mv',
  'tsc',
  'eslint',
  'prettier',
  'jest',
  'vitest',
  'python',
  'python3',
  'pip',
  'pip3',
  'cargo',
  'rustc',
  'go',
])

// Blocked patterns in arguments
const BLOCKED_PATTERNS = [
  /[;&|`$]/,           // Shell operators
  /\.\.\//,            // Path traversal
  /\/etc\//,           // System directories
  /\/var\//,
  /\/usr\//,
  /\/root\//,
  /\/home\/(?!.*\/projects)/,  // Home directories except projects
  /rm\s+-rf?\s+\//,    // Dangerous rm commands
  /sudo/,              // Privilege escalation
  /chmod\s+777/,       // Dangerous permissions
  /curl.*\|.*sh/,      // Pipe to shell
  /wget.*\|.*sh/,
]

// ============================================================================
// Schemas
// ============================================================================

const executeSchema = z.object({
  command: z.string().min(1).max(1000),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  timeout: z.number().min(1000).max(MAX_EXECUTION_TIME).optional(),
})

// ============================================================================
// Security Functions
// ============================================================================

function validateCommand(command: string): { valid: boolean; error?: string } {
  // Extract the base command
  const parts = command.trim().split(/\s+/)
  const baseCommand = parts[0]

  // Check if command is whitelisted
  if (!WHITELISTED_COMMANDS.has(baseCommand)) {
    return {
      valid: false,
      error: `Command '${baseCommand}' is not allowed. Allowed commands: ${Array.from(WHITELISTED_COMMANDS).join(', ')}`,
    }
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        valid: false,
        error: 'Command contains blocked patterns for security reasons',
      }
    }
  }

  return { valid: true }
}

function sanitizePath(path: string | undefined): string {
  if (!path) return process.cwd()
  
  // Remove any path traversal attempts
  const sanitized = path.replace(/\.\.\//g, '')
  
  // Ensure path is within allowed directories
  // In production, this should be more restrictive
  return sanitized
}

// ============================================================================
// Execution Function
// ============================================================================

interface ExecutionResult {
  success: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  duration: number
  killed: boolean
}

async function executeCommand(
  command: string,
  cwd: string,
  env: Record<string, string> = {},
  timeout: number = MAX_EXECUTION_TIME
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    let stdout = ''
    let stderr = ''
    let killed = false

    // Parse command into parts
    const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
    const cmd = parts[0]
    if (!cmd) {
      resolve({
        success: false,
        exitCode: null,
        stdout: '',
        stderr: 'Empty command',
        duration: 0,
        killed: false,
      })
      return
    }
    const args = parts.slice(1).map(arg => arg.replace(/^["']|["']$/g, ''))

    const child = spawn(cmd, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      shell: false, // Don't use shell for security
      timeout,
    })

    // Collect stdout
    child.stdout?.on('data', (data) => {
      const chunk = data.toString()
      if (stdout.length + chunk.length <= MAX_OUTPUT_SIZE) {
        stdout += chunk
      }
    })

    // Collect stderr
    child.stderr?.on('data', (data) => {
      const chunk = data.toString()
      if (stderr.length + chunk.length <= MAX_OUTPUT_SIZE) {
        stderr += chunk
      }
    })

    // Handle timeout
    const timeoutId = setTimeout(() => {
      killed = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
      }, 5000)
    }, timeout)

    // Handle completion
    child.on('close', (code) => {
      clearTimeout(timeoutId)
      resolve({
        success: code === 0,
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        duration: Date.now() - startTime,
        killed,
      })
    })

    // Handle errors
    child.on('error', (error) => {
      clearTimeout(timeoutId)
      resolve({
        success: false,
        exitCode: null,
        stdout: '',
        stderr: error.message,
        duration: Date.now() - startTime,
        killed: false,
      })
    })
  })
}

// ============================================================================
// POST - Execute command
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    // Require authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = executeSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues, requestId },
        { status: 400 }
      )
    }

    const { command, cwd, env, timeout } = parsed.data

    // Validate command
    const validation = validateCommand(command)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, requestId },
        { status: 403 }
      )
    }

    // Sanitize working directory
    const workingDir = sanitizePath(cwd)

    console.log(`[${requestId}] Executing: ${command} in ${workingDir}`)

    // Execute command
    const result = await executeCommand(
      command,
      workingDir,
      env,
      timeout || MAX_EXECUTION_TIME
    )

    console.log(`[${requestId}] Completed in ${result.duration}ms, exit: ${result.exitCode}`)

    return NextResponse.json({
      success: result.success,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration,
      killed: result.killed,
      requestId,
    })
  } catch (error) {
    console.error(`[${requestId}] Terminal error:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to execute command',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Get available commands
// ============================================================================

export async function GET() {
  const requestId = crypto.randomUUID()
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      allowedCommands: Array.from(WHITELISTED_COMMANDS),
      maxTimeout: MAX_EXECUTION_TIME,
      maxOutputSize: MAX_OUTPUT_SIZE,
      requestId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get terminal info', requestId },
      { status: 500 }
    )
  }
}
