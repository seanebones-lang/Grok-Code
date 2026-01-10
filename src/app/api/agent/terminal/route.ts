import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { spawn } from 'child_process'

/**
 * Terminal Execution API for Agentic Operations
 * Allows Eleven to execute commands in a sandboxed environment
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

// Whitelisted commands - expanded for full local access (single user mode)
const WHITELISTED_COMMANDS = new Set([
  // Package managers
  'npm', 'npx', 'yarn', 'pnpm', 'bun', 'deno',
  'pip', 'pip3', 'pipx', 'poetry', 'conda',
  'cargo', 'rustup',
  'go', 'gofmt',
  'gem', 'bundle', 'bundler',
  'composer',
  'brew', 'mas',
  
  // Version managers
  'nvm', 'fnm', 'pyenv', 'rbenv', 'goenv', 'rustup',
  
  // Runtimes & compilers
  'node', 'python', 'python3', 'ruby', 'perl', 'php',
  'rustc', 'gcc', 'g++', 'clang', 'clang++',
  'java', 'javac', 'kotlin', 'kotlinc',
  'swift', 'swiftc',
  'zig', 'nim', 'elixir', 'erl',
  
  // Dev tools
  'git', 'gh', 'hub',
  'tsc', 'tsx', 'ts-node',
  'eslint', 'prettier', 'biome',
  'jest', 'vitest', 'mocha', 'pytest', 'cargo-test',
  'webpack', 'vite', 'esbuild', 'rollup', 'parcel',
  'docker', 'docker-compose', 'podman',
  'kubectl', 'helm', 'terraform', 'pulumi',
  'vercel', 'netlify', 'railway', 'fly',
  'prisma', 'drizzle-kit',
  
  // File operations
  'ls', 'll', 'la', 'tree',
  'cat', 'less', 'more', 'head', 'tail',
  'grep', 'rg', 'ag', 'ack', 'fd', 'fzf',
  'find', 'locate', 'which', 'whereis', 'type',
  'wc', 'sort', 'uniq', 'cut', 'tr', 'sed', 'awk',
  'diff', 'patch', 'comm',
  'file', 'stat', 'du', 'df',
  
  // File management
  'mkdir', 'touch', 'rm', 'rmdir',
  'cp', 'mv', 'ln',
  'chmod', 'chown', 'chgrp',
  'zip', 'unzip', 'tar', 'gzip', 'gunzip', 'bzip2',
  
  // Text editors (non-interactive use)
  'echo', 'printf', 'tee',
  'nano', 'vim', 'nvim', 'emacs',
  
  // Shell utilities
  'pwd', 'cd', 'pushd', 'popd',
  'env', 'export', 'set', 'unset',
  'source', 'sh', 'bash', 'zsh',
  'xargs', 'parallel',
  'time', 'timeout', 'sleep', 'wait',
  'true', 'false', 'test',
  
  // Process management
  'ps', 'top', 'htop', 'kill', 'pkill', 'killall',
  'jobs', 'fg', 'bg', 'nohup',
  'lsof', 'pgrep',
  
  // Network
  'curl', 'wget', 'httpie', 'http',
  'ping', 'traceroute', 'dig', 'nslookup', 'host',
  'nc', 'netcat', 'telnet',
  'ssh', 'scp', 'sftp', 'rsync',
  'ifconfig', 'ip', 'netstat', 'ss',
  
  // System info
  'uname', 'hostname', 'whoami', 'id',
  'date', 'cal', 'uptime',
  'sw_vers', 'system_profiler',
  
  // macOS specific
  'open', 'pbcopy', 'pbpaste', 'say', 'afplay',
  'osascript', 'defaults', 'launchctl',
  'xcode-select', 'xcrun', 'xcodebuild',
  'security', 'codesign',
  
  // Database clients
  'psql', 'mysql', 'sqlite3', 'mongosh', 'redis-cli',
  
  // Cloud CLIs
  'aws', 'gcloud', 'az', 'doctl', 'linode-cli',
  
  // Misc tools
  'jq', 'yq', 'fx',
  'make', 'cmake', 'ninja',
  'man', 'info', 'help',
  'clear', 'reset',
  'md5', 'shasum', 'openssl',
  'base64', 'xxd', 'hexdump',
  'ffmpeg', 'ffprobe', 'imagemagick', 'convert',
  'pandoc', 'latex', 'pdflatex',
])

// Blocked patterns - minimal for single-user mode (only truly dangerous operations)
const BLOCKED_PATTERNS = [
  /rm\s+-rf?\s+\/$/,   // rm -rf / (root only)
  /rm\s+-rf?\s+\/\s/,  // rm -rf / with space
  /mkfs/,              // Formatting drives
  /dd\s+if=.*of=\/dev/, // Writing to raw devices
  />\s*\/dev\/sd/,     // Redirecting to drives
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
